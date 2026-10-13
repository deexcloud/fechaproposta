import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Copy as ContentCopyRoundedIcon, MessageCircle as WhatsAppIcon, UserPlus as PersonAddAlt1RoundedIcon } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCurrentOrganization, useOrganization } from '@/features/organizations/OrganizationProvider';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorState, ListSkeleton } from '@/components/common';
import { useNotify } from '@/components/NotifyProvider';
import { friendlyError } from '@/lib/errors';
import { shortDate as formatDate } from '@/lib/format';
import type { MemberRole } from '@/types';
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  createInvitation,
  inviteLink,
  listInvitations,
  listMembers,
  removeMember,
  revokeInvitation,
  updateMemberRole,
  type Invitation,
  type TeamMember,
} from '@/services/team';

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function InviteLinkActions({ invitation, orgName }: { invitation: Invitation; orgName: string }) {
  const notify = useNotify();
  const link = inviteLink(invitation.token);
  const message = `Olá! Você foi convidado(a) para a equipe da ${orgName} no FechaProposta. Acesse: ${link}`;
  return (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="Copiar link">
        <IconButton
          size="small"
          aria-label={`Copiar link do convite de ${invitation.email}`}
          onClick={async () => {
            if (await copy(link)) notify.success('Link copiado.');
            else notify.error('Não foi possível copiar. Selecione o link e copie manualmente.');
          }}
        >
          <ContentCopyRoundedIcon size={16} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Enviar pelo WhatsApp">
        <IconButton
          size="small"
          aria-label={`Enviar convite de ${invitation.email} pelo WhatsApp`}
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener"
        >
          <WhatsAppIcon size={16} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export function TeamPanel() {
  const organization = useCurrentOrganization();
  const orgId = organization.id;
  const { role: myRole, refresh } = useOrganization();
  const { user } = useAuth();
  const notify = useNotify();
  const qc = useQueryClient();
  const isOwner = myRole === 'owner';
  const canManage = myRole === 'owner' || myRole === 'manager';

  const members = useQuery({ queryKey: ['team', orgId], queryFn: () => listMembers(orgId) });
  const invitations = useQuery({ queryKey: ['team', orgId, 'invites'], queryFn: () => listInvitations(orgId), enabled: canManage });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['team', orgId] });

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('staff');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [created, setCreated] = useState<Invitation | null>(null);
  const [toRemove, setToRemove] = useState<TeamMember | null>(null);

  const invite = useMutation({
    mutationFn: () => createInvitation(orgId, email.trim(), role),
    onSuccess: (inv) => {
      setCreated(inv);
      setEmail('');
      invalidate();
    },
    onError: (e) => setInviteError(friendlyError(e)),
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: MemberRole }) => updateMemberRole(orgId, userId, newRole),
    onSuccess: () => {
      notify.success('Perfil atualizado.');
      invalidate();
    },
    onError: (e) => notify.error(friendlyError(e)),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => removeMember(orgId, userId),
    onSuccess: (_, userId) => {
      setToRemove(null);
      if (userId === user?.id) {
        notify.info(`Você saiu da equipe da ${organization.name}.`);
        refresh();
      } else {
        notify.success('Pessoa removida da equipe.');
        invalidate();
      }
    },
    onError: (e) => notify.error(friendlyError(e)),
  });

  const revoke = useMutation({
    mutationFn: revokeInvitation,
    onSuccess: () => {
      notify.info('Convite cancelado. O link deixou de funcionar.');
      invalidate();
    },
    onError: (e) => notify.error(friendlyError(e)),
  });

  if (members.isPending) return <ListSkeleton rows={3} />;
  if (members.isError) return <ErrorState message={friendlyError(members.error)} onRetry={() => members.refetch()} />;

  const canRemove = (m: TeamMember) =>
    m.role !== 'owner' && (m.user_id === user?.id || isOwner || (myRole === 'manager' && m.role === 'staff'));

  return (
    <Stack spacing={3}>
      {canManage && (
        <Box>
          <Typography variant="h3" component="h2" sx={{ mb: 1 }}>Convidar pessoa</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Gere um link de convite e envie pelo WhatsApp. A pessoa cria a conta (ou entra) com o mesmo e-mail e já entra na sua empresa.
          </Typography>
          <Stack
            component="form"
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            onSubmit={(e) => {
              e.preventDefault();
              setInviteError(null);
              setCreated(null);
              invite.mutate();
            }}
          >
            <TextField
              label="E-mail da pessoa"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              error={Boolean(inviteError)}
              helperText={inviteError}
            />
            <TextField
              select
              label="Perfil"
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              sx={{ minWidth: 180 }}
              helperText={ROLE_DESCRIPTIONS[role]}
            >
              <MenuItem value="staff">{ROLE_LABELS.staff}</MenuItem>
              <MenuItem value="manager" disabled={!isOwner}>{ROLE_LABELS.manager}</MenuItem>
            </TextField>
            <Box>
              <Button type="submit" variant="contained" startIcon={<PersonAddAlt1RoundedIcon />} loading={invite.isPending} sx={{ whiteSpace: 'nowrap' }}>
                Gerar convite
              </Button>
            </Box>
          </Stack>
          {created && (
            <Alert severity="success" sx={{ mt: 2 }} action={<InviteLinkActions invitation={created} orgName={organization.name} />}>
              Convite criado para <strong>{created.email}</strong>. Envie o link — ele vale por 7 dias.
              <Box component="code" sx={{ display: 'block', mt: 0.5, wordBreak: 'break-all', fontSize: 12 }}>{inviteLink(created.token)}</Box>
            </Alert>
          )}
        </Box>
      )}

      <Box>
        <Typography variant="h3" component="h2" sx={{ mb: 1 }}>Equipe ({members.data.length})</Typography>
        <Card>
          {members.data.map((m, i) => (
            <Stack
              key={m.user_id}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ px: 2, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider', alignItems: { sm: 'center' } }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }} noWrap>
                  {m.full_name || m.email} {m.user_id === user?.id && <Chip size="small" label="Você" sx={{ ml: 0.5 }} />}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>{m.email}</Typography>
              </Box>
              {isOwner && m.role !== 'owner' ? (
                <TextField
                  select
                  size="small"
                  value={m.role}
                  onChange={(e) => changeRole.mutate({ userId: m.user_id, newRole: e.target.value as MemberRole })}
                  sx={{ minWidth: 150 }}
                  slotProps={{ htmlInput: { 'aria-label': `Perfil de ${m.full_name || m.email}` } }}
                >
                  <MenuItem value="staff">{ROLE_LABELS.staff}</MenuItem>
                  <MenuItem value="manager">{ROLE_LABELS.manager}</MenuItem>
                </TextField>
              ) : (
                <Chip label={ROLE_LABELS[m.role]} variant="outlined" color={m.role === 'owner' ? 'primary' : 'default'} />
              )}
              {canRemove(m) && (
                <Button color="error" size="small" onClick={() => setToRemove(m)}>
                  {m.user_id === user?.id ? 'Sair da empresa' : 'Remover'}
                </Button>
              )}
            </Stack>
          ))}
        </Card>
      </Box>

      {canManage && invitations.data && invitations.data.length > 0 && (
        <Box>
          <Typography variant="h3" component="h2" sx={{ mb: 1 }}>Convites pendentes</Typography>
          <Card>
            {invitations.data.map((inv, i) => {
              const expired = new Date(inv.expires_at) < new Date();
              return (
                <Stack key={inv.id} direction="row" spacing={1} sx={{ px: 2, py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider', alignItems: 'center' }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 600 }}>{inv.email}</Typography>
                    <Typography variant="body2" color={expired ? 'warning.main' : 'text.secondary'}>
                      {ROLE_LABELS[inv.role]} · {expired ? 'expirado — gere de novo' : `válido até ${formatDate(inv.expires_at)}`}
                    </Typography>
                  </Box>
                  {!expired && <InviteLinkActions invitation={inv} orgName={organization.name} />}
                  <Button size="small" color="inherit" aria-label={`Cancelar o convite de ${inv.email}`} loading={revoke.isPending && revoke.variables === inv.id} onClick={() => revoke.mutate(inv.id)}>
                    Cancelar convite
                  </Button>
                </Stack>
              );
            })}
          </Card>
        </Box>
      )}

      <Divider />
      <Typography variant="body2" color="text.secondary">
        <strong>Atendente:</strong> {ROLE_DESCRIPTIONS.staff} <strong>Gerente:</strong> {ROLE_DESCRIPTIONS.manager}
      </Typography>

      <ConfirmDialog
        open={Boolean(toRemove)}
        title={toRemove?.user_id === user?.id ? 'Sair desta empresa?' : `Remover ${toRemove?.full_name || toRemove?.email}?`}
        message={
          toRemove?.user_id === user?.id
            ? 'Você perde o acesso ao painel desta empresa. Para voltar, precisará de um novo convite.'
            : 'A pessoa perde o acesso ao painel na hora. Os pedidos e registros feitos por ela continuam salvos.'
        }
        confirmLabel={toRemove?.user_id === user?.id ? 'Sair da empresa' : 'Remover'}
        danger
        loading={remove.isPending}
        onClose={() => setToRemove(null)}
        onConfirm={() => toRemove && remove.mutate(toRemove.user_id)}
      />
    </Stack>
  );
}
