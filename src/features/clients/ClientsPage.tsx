import { useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FilePlus2, Mail, MessageCircle, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/common';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotifyProvider';
import { StatusChip } from '@/components/StatusChip';
import { NameAvatar } from '@/components/visual';
import { useCurrentOrganization, useOrganization } from '@/features/organizations/OrganizationProvider';
import { keys, useClients, useProposals } from '@/hooks/queries';
import { friendlyError } from '@/lib/errors';
import { formatPhone, moneyShort, onlyDigits, relativeTime } from '@/lib/format';
import { effectiveStatus, totalLabel, whatsappUrl } from '@/lib/proposal';
import { createClient, deleteClient, updateClient } from '@/services/clients';
import type { Client, ProposalListItem } from '@/types';
import { tokens } from '@/theme/tokens';

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome.').max(120),
  company: z.string().max(120),
  email: z.string().trim().max(254).refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'E-mail inválido.'),
  whatsapp: z.string().refine((v) => {
    const d = onlyDigits(v);
    return !d || (d.length >= 10 && d.length <= 13);
  }, 'Use DDD + número.'),
  notes: z.string().max(2000),
});
type Values = z.infer<typeof schema>;

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function ClientForm({ client, onClose }: { client: Client | null; onClose: (saved?: Client) => void }) {
  const org = useCurrentOrganization();
  const qc = useQueryClient();
  const notify = useNotify();
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: client?.name ?? '',
      company: client?.company ?? '',
      email: client?.email ?? '',
      whatsapp: client?.whatsapp ? formatPhone(client.whatsapp) : '',
      notes: client?.notes ?? '',
    },
  });

  const submit = handleSubmit(async (v) => {
    const input = {
      name: v.name.trim(),
      company: v.company.trim() || null,
      email: v.email.trim().toLowerCase() || null,
      whatsapp: onlyDigits(v.whatsapp) || null,
      notes: v.notes.trim() || null,
    };
    try {
      const saved = client ? await updateClient(client.id, input) : await createClient(org.id, input);
      qc.invalidateQueries({ queryKey: keys.clients(org.id) });
      qc.invalidateQueries({ queryKey: keys.proposals(org.id) });
      notify.success(client ? 'Cliente atualizado.' : 'Cliente cadastrado.');
      onClose(saved);
    } catch (e) {
      notify.error(friendlyError(e));
    }
  });

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Stack spacing={2}>
        <TextField label="Nome" autoFocus {...register('name')} error={Boolean(formState.errors.name)} helperText={formState.errors.name?.message} />
        <TextField label="Empresa" {...register('company')} />
        <TextField label="WhatsApp" placeholder="(11) 98888-7777" slotProps={{ htmlInput: { inputMode: 'tel' } }} {...register('whatsapp')} error={Boolean(formState.errors.whatsapp)} helperText={formState.errors.whatsapp?.message} />
        <TextField label="E-mail" type="email" {...register('email')} error={Boolean(formState.errors.email)} helperText={formState.errors.email?.message} />
        <TextField label="Anotações" multiline minRows={3} placeholder="Só a sua equipe vê." {...register('notes')} />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 3, justifyContent: 'flex-end' }}>
        <Button color="inherit" onClick={() => onClose()}>Cancelar</Button>
        <Button type="submit" variant="contained" loading={formState.isSubmitting}>Salvar</Button>
      </Stack>
    </Box>
  );
}

function ClientDrawer({ client, proposals, onClose }: { client: Client; proposals: ProposalListItem[]; onClose: () => void }) {
  const org = useCurrentOrganization();
  const { canManage } = useOrganization();
  const qc = useQueryClient();
  const notify = useNotify();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const accepted = proposals.filter((p) => p.status === 'accepted').reduce((s, p) => s + Number(p.accepted_total ?? p.total_amount), 0);

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteClient(client.id);
      qc.invalidateQueries({ queryKey: keys.clients(org.id) });
      qc.invalidateQueries({ queryKey: keys.proposals(org.id) });
      notify.success('Cliente removido.');
      onClose();
    } catch (e) {
      notify.error(friendlyError(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Drawer anchor="right" open onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 460 } } } }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2, borderBottom: `1px solid ${tokens.border}` }}>
        <Typography variant="h3">{editing ? 'Editar cliente' : 'Cliente'}</Typography>
        <IconButton aria-label="Fechar" onClick={onClose}><X size={18} /></IconButton>
      </Stack>
      <Box sx={{ p: 2.5, overflowY: 'auto' }}>
        {editing ? (
          <ClientForm client={client} onClose={() => setEditing(false)} />
        ) : (
          <>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <NameAvatar name={client.name} size={52} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h2" sx={{ wordBreak: 'break-word' }}>{client.name}</Typography>
                {client.company && <Typography color="text.secondary">{client.company}</Typography>}
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
              <Button variant="contained" size="small" startIcon={<FilePlus2 />} component={RouterLink} to={`/painel/propostas/nova?cliente=${client.id}`}>Nova proposta</Button>
              {client.whatsapp && <Button variant="outlined" size="small" startIcon={<MessageCircle />} href={whatsappUrl(`Olá, ${client.name.split(' ')[0]}!`, client.whatsapp)} target="_blank" rel="noopener">WhatsApp</Button>}
              {client.email && <Button variant="outlined" size="small" startIcon={<Mail />} href={`mailto:${client.email}`}>E-mail</Button>}
              <Button size="small" color="inherit" onClick={() => setEditing(true)}>Editar</Button>
            </Stack>

            <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Card sx={{ p: 1.75 }}>
                <Typography variant="caption" color="text.secondary">Propostas</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 20 }}>{proposals.length}</Typography>
              </Card>
              <Card sx={{ p: 1.75 }}>
                <Typography variant="caption" color="text.secondary">Fechado</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 20 }}>{moneyShort(accepted)}</Typography>
              </Card>
            </Box>

            <Stack spacing={0.5} sx={{ mt: 2.5 }}>
              {client.whatsapp && <Typography variant="body2">WhatsApp: {formatPhone(client.whatsapp)}</Typography>}
              {client.email && <Typography variant="body2">E-mail: {client.email}</Typography>}
              {client.notes && <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', mt: 1 }}>{client.notes}</Typography>}
            </Stack>

            <Typography variant="h4" sx={{ mt: 3, mb: 1 }}>Propostas</Typography>
            {proposals.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Nenhuma proposta para este cliente ainda.</Typography>
            ) : (
              <Stack divider={<Box sx={{ borderTop: `1px solid ${tokens.border}` }} />}>
                {proposals.map((p) => (
                  <Stack key={p.id} component={RouterLink} to={`/painel/propostas/${p.id}`} direction="row" spacing={1} sx={{ py: 1.25, alignItems: 'center', textDecoration: 'none', color: 'inherit', '&:hover .t': { textDecoration: 'underline' } }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography className="t" noWrap variant="body2" sx={{ fontWeight: 600 }}>{p.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.code} · {totalLabel(p)}</Typography>
                    </Box>
                    <StatusChip status={effectiveStatus(p)} size="small" />
                  </Stack>
                ))}
              </Stack>
            )}

            {canManage && (
              <Button color="error" size="small" startIcon={<Trash2 />} sx={{ mt: 4 }} onClick={() => setConfirm(true)}>Remover cliente</Button>
            )}
          </>
        )}
      </Box>
      <ConfirmDialog
        open={confirm}
        title={`Remover ${client.name}?`}
        message="As propostas deste cliente continuam guardadas, mas ficam sem cliente vinculado."
        confirmLabel="Remover"
        danger
        loading={deleting}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
      />
    </Drawer>
  );
}

export function ClientsPage() {
  const clients = useClients();
  const proposals = useProposals();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const selectedId = params.get('cliente');

  const byClient = useMemo(() => {
    const map = new Map<string, ProposalListItem[]>();
    for (const p of proposals.data ?? []) {
      if (!p.client_id) continue;
      map.set(p.client_id, [...(map.get(p.client_id) ?? []), p]);
    }
    return map;
  }, [proposals.data]);

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    return (clients.data ?? [])
      .filter((c) => !q || normalize([c.name, c.company, c.email, c.whatsapp].filter(Boolean).join(' ')).includes(q))
      .map((c) => {
        const list = byClient.get(c.id) ?? [];
        const accepted = list.filter((p) => p.status === 'accepted').reduce((s, p) => s + Number(p.accepted_total ?? p.total_amount), 0);
        const last = list.reduce<string | null>((m, p) => (!m || p.updated_at > m ? p.updated_at : m), null);
        return { client: c, count: list.length, accepted, last };
      })
      .sort((a, b) => (b.last ?? b.client.created_at).localeCompare(a.last ?? a.client.created_at));
  }, [clients.data, byClient, query]);

  const selected = clients.data?.find((c) => c.id === selectedId) ?? null;
  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('cliente', id);
    else next.delete('cliente');
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Quem recebe suas propostas, com o histórico e o valor fechado de cada um."
        actions={<Button variant="contained" startIcon={<Plus />} onClick={() => setCreating(true)}>Novo cliente</Button>}
      />

      <TextField
        size="small"
        placeholder="Buscar por nome, empresa, e-mail ou telefone"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ maxWidth: 420, mb: 2 }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> }, htmlInput: { 'aria-label': 'Buscar clientes' } }}
      />

      {clients.error ? (
        <ErrorState message={friendlyError(clients.error, 'Não foi possível carregar os clientes.')} onRetry={() => clients.refetch()} />
      ) : clients.isPending ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <Card>
          {clients.data?.length ? (
            <EmptyState compact icon={<Search />} title="Nenhum cliente encontrado" />
          ) : (
            <EmptyState
              icon={<Users />}
              title="Nenhum cliente ainda"
              description="Clientes são cadastrados automaticamente quando você cria uma proposta. Se preferir, cadastre antes."
              action={<Button variant="contained" startIcon={<Plus />} onClick={() => setCreating(true)}>Cadastrar cliente</Button>}
            />
          )}
        </Card>
      ) : (
        <Card sx={{ overflow: 'hidden' }}>
          {rows.map(({ client, count, accepted, last }, i) => (
            <Box
              key={client.id}
              component="button"
              type="button"
              onClick={() => select(client.id)}
              sx={{
                all: 'unset',
                boxSizing: 'border-box',
                width: '100%',
                display: 'grid',
                gridTemplateColumns: { xs: 'auto 1fr auto', md: 'auto minmax(0, 2fr) minmax(0, 1.5fr) 120px 140px' },
                gap: 1.5,
                alignItems: 'center',
                px: 2,
                py: 1.5,
                cursor: 'pointer',
                borderTop: i ? `1px solid ${tokens.border}` : 'none',
                '&:hover': { bgcolor: tokens.hover },
                '&:focus-visible': { outline: `2px solid ${tokens.accentText}`, outlineOffset: -2 },
              }}
            >
              <NameAvatar name={client.name} />
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 600, fontSize: 14 }}>{client.name}</Typography>
                <Typography noWrap variant="caption" color="text.secondary">{client.company ?? (client.whatsapp ? formatPhone(client.whatsapp) : client.email) ?? '—'}</Typography>
              </Box>
              <Typography noWrap variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
                {[client.whatsapp && formatPhone(client.whatsapp), client.email].filter(Boolean).join(' · ') || '—'}
              </Typography>
              <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>{count} {count === 1 ? 'proposta' : 'propostas'}</Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>{accepted ? moneyShort(accepted) : '—'}</Typography>
                <Typography variant="caption" color="text.secondary">{last ? relativeTime(last) : 'sem propostas'}</Typography>
              </Box>
            </Box>
          ))}
        </Card>
      )}

      <Dialog open={creating} onClose={() => setCreating(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Novo cliente</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <ClientForm
              client={null}
              onClose={(saved) => {
                setCreating(false);
                if (saved) select(saved.id);
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {selected && <ClientDrawer key={selected.id} client={selected} proposals={byClient.get(selected.id) ?? []} onClose={() => select(null)} />}
    </>
  );
}
