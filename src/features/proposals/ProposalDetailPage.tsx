import { useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Card, Divider, IconButton, ListItemIcon, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSignature,
  LayoutTemplate,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  RotateCcw,
  Send,
  ShieldCheck,
  ThumbsDown,
  Trash2,
} from 'lucide-react';
import { BrandLoader, ErrorState, Mono } from '@/components/common';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotifyProvider';
import { ProposalDocument } from '@/components/ProposalDocument';
import { StatusChip } from '@/components/StatusChip';
import { NameAvatar, ToneDot } from '@/components/visual';
import { useCurrentOrganization, useOrganization } from '@/features/organizations/OrganizationProvider';
import { useAcceptance, useInvalidateProposals, useProposal, useProposalEvents } from '@/hooks/queries';
import { friendlyError } from '@/lib/errors';
import { eventLabel, eventTone } from '@/lib/events';
import { dateTime, daysUntil, firstName, formatPhone, longDate, money, relativeTime } from '@/lib/format';
import { canEdit, effectiveStatus, STATUS_META, totalLabel, whatsappUrl } from '@/lib/proposal';
import { deleteProposal, duplicateProposal, reopenProposal } from '@/services/proposals';
import { DeclineDialog, ManualAcceptDialog, SaveTemplateDialog, ShareDialog } from './dialogs';
import { tokens } from '@/theme/tokens';

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
      <Box sx={{ color: tokens.textTertiary, mt: 0.25, '& svg': { width: 16, height: 16 } }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{value}</Typography>
      </Box>
    </Stack>
  );
}

export function ProposalDetailPage() {
  const { id } = useParams();
  const org = useCurrentOrganization();
  const { canManage } = useOrganization();
  const navigate = useNavigate();
  const notify = useNotify();
  const invalidate = useInvalidateProposals();
  const [params, setParams] = useSearchParams();
  const proposal = useProposal(id);
  const events = useProposalEvents(id);
  const p = proposal.data;
  const acceptance = useAcceptance(id, p?.status === 'accepted');

  const [share, setShare] = useState<null | 'send' | 'followup'>(null);
  const [dialog, setDialog] = useState<null | 'accept' | 'decline' | 'template' | 'delete'>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);

  // Vindo do editor por "Salvar e enviar": abre direto o envio.
  useEffect(() => {
    if (params.get('enviar') === '1' && p) {
      setShare('send');
      params.delete('enviar');
      setParams(params, { replace: true });
    }
  }, [p, params, setParams]);

  if (proposal.error) return <ErrorState message={friendlyError(proposal.error, 'Não foi possível abrir a proposta.')} onRetry={() => proposal.refetch()} />;
  if (!p) return <BrandLoader label="Abrindo a proposta…" />;

  const status = effectiveStatus(p);
  const editable = canEdit(p);
  const left = daysUntil(p.valid_until);
  const lastClientMessage = events.data?.find((e) => e.kind === 'change_requested');

  const run = async (action: () => Promise<unknown>, success: string, after?: (result: unknown) => void) => {
    setBusy(true);
    setMenu(null);
    try {
      const result = await action();
      invalidate(p.id);
      notify.success(success);
      after?.(result);
    } catch (e) {
      notify.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const duplicate = () => run(() => duplicateProposal(p.id), 'Cópia criada como rascunho.', (newId) => navigate(`/painel/propostas/${newId as string}/editar`));

  // Ação principal conforme a etapa.
  const primary = (() => {
    if (status === 'draft') return <Button variant="contained" startIcon={<Send />} onClick={() => setShare('send')}>Enviar</Button>;
    if (status === 'negotiating') return <Button variant="contained" startIcon={<PenLine />} component={RouterLink} to={`/painel/propostas/${p.id}/editar`}>Ajustar proposta</Button>;
    if (status === 'expired') return <Button variant="contained" startIcon={<CalendarClock />} component={RouterLink} to={`/painel/propostas/${p.id}/editar`}>Renovar validade</Button>;
    if (status === 'sent' || status === 'viewed') return <Button variant="contained" startIcon={<MessageCircle />} onClick={() => setShare('followup')}>Lembrar cliente</Button>;
    if (status === 'declined') return <Button variant="contained" startIcon={<RotateCcw />} loading={busy} onClick={() => run(() => reopenProposal(p.id), 'Reaberta como rascunho.')}>Reabrir</Button>;
    return <Button variant="contained" startIcon={<Copy />} loading={busy} onClick={duplicate}>Duplicar</Button>;
  })();

  return (
    <>
      <Button component={RouterLink} to="/painel/propostas" startIcon={<ArrowLeft />} color="inherit" size="small" sx={{ mb: 1.5, ml: -1, color: tokens.textSecondary }}>
        Propostas
      </Button>

      {/* Cabeçalho */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-end' }, mb: 3 }}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, fontFeatureSettings: '"tnum"' }}>{p.code}</Typography>
            <StatusChip status={status} size="small" />
          </Stack>
          <Typography variant="h1" sx={{ wordBreak: 'break-word' }}>{p.title}</Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
            {p.client && <NameAvatar name={p.client.name} size={22} />}
            <Typography variant="body2" color="text.secondary">
              {p.client ? (
                <Box component={RouterLink} to={`/painel/propostas?cliente=${p.client.id}`} sx={{ color: 'inherit', fontWeight: 600 }}>{p.client.name}</Box>
              ) : 'Sem cliente'}
              {p.client?.company ? ` · ${p.client.company}` : ''} · <strong style={{ color: tokens.textPrimary }}>{totalLabel(p)}</strong>
            </Typography>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          {editable && status !== 'negotiating' && status !== 'expired' && (
            <Button variant="outlined" startIcon={<PenLine />} component={RouterLink} to={`/painel/propostas/${p.id}/editar`}>Editar</Button>
          )}
          {primary}
          <IconButton aria-label="Mais ações" onClick={(e) => setMenu(e.currentTarget)} sx={{ border: `1px solid ${tokens.border}`, bgcolor: tokens.surface }}>
            <MoreHorizontal size={18} />
          </IconButton>
          <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
            {status !== 'draft' && <MenuItem onClick={() => { setMenu(null); setShare('send'); }}><Send /> Compartilhar de novo</MenuItem>}
            <MenuItem component={RouterLink} to={`/painel/propostas/${p.id}/visualizar`}><Eye /> Ver como o cliente</MenuItem>
            <MenuItem component={RouterLink} to={`/painel/propostas/${p.id}/visualizar?imprimir=1`}><Download /> Baixar PDF</MenuItem>
            {status !== 'draft' && <MenuItem component="a" href={`/p/${p.share_token}`} target="_blank" rel="noopener"><ExternalLink /> Abrir o link público</MenuItem>}
            <Divider />
            <MenuItem onClick={duplicate}><Copy /> Duplicar</MenuItem>
            <MenuItem onClick={() => { setMenu(null); setDialog('template'); }}><LayoutTemplate /> Salvar como modelo</MenuItem>
            {editable && [
              <Divider key="d" />,
              <MenuItem key="a" onClick={() => { setMenu(null); setDialog('accept'); }}><BadgeCheck /> Registrar aceite</MenuItem>,
              <MenuItem key="r" onClick={() => { setMenu(null); setDialog('decline'); }}><ThumbsDown /> Marcar como recusada</MenuItem>,
            ]}
            {status !== 'accepted' && (canManage || status === 'draft') && [
              <Divider key="d2" />,
              <MenuItem key="x" onClick={() => { setMenu(null); setDialog('delete'); }} sx={{ color: tokens.error, '& svg': { color: `${tokens.error} !important` } }}><Trash2 /> Excluir</MenuItem>,
            ]}
          </Menu>
        </Stack>
      </Stack>

      {/* Avisos da etapa */}
      {status === 'negotiating' && lastClientMessage && (
        <Alert
          severity="info"
          icon={<MessageCircle size={18} />}
          sx={{ mb: 3, bgcolor: tokens.violetSoft, borderColor: 'transparent' }}
          action={
            p.client?.whatsapp && (
              <Button size="small" color="inherit" href={whatsappUrl(`Oi, ${firstName(p.client.name)}! Vi seu pedido sobre a proposta "${p.title}".`, p.client.whatsapp)} target="_blank" rel="noopener">Responder</Button>
            )
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 650 }}>{eventLabel(lastClientMessage, p.client?.name)} · {relativeTime(lastClientMessage.created_at)}</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>“{lastClientMessage.message}”</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>Ajuste a proposta e compartilhe de novo: o link continua o mesmo.</Typography>
        </Alert>
      )}
      {status === 'expired' && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          A validade venceu em {longDate(p.valid_until)} sem resposta. Renove a data para o cliente poder aceitar.
        </Alert>
      )}
      {status === 'declined' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Recusada {relativeTime(p.declined_at)}.{p.decline_reason ? ` Motivo: “${p.decline_reason}”` : ''}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 360px' }, alignItems: 'start' }}>
        <Box sx={{ order: { xs: 2, lg: 1 } }}>
          <ProposalDocument
            data={{ ...p, client: p.client ? { name: p.client.name, company: p.client.company } : null, organization: org }}
            selected={acceptance.data?.selected_items ?? []}
          />
        </Box>

        <Stack spacing={2} sx={{ order: { xs: 1, lg: 2 }, position: { lg: 'sticky' }, top: { lg: 24 } }}>
          {p.status === 'accepted' && acceptance.data && (
            <Card sx={{ p: 2.5, borderColor: tokens.success, bgcolor: tokens.successSoft }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <BadgeCheck size={20} color={tokens.success} />
                <Typography sx={{ fontWeight: 700 }}>Aceita por {acceptance.data.signer_name}</Typography>
              </Stack>
              <Typography variant="body2" sx={{ mt: 0.5 }}>{dateTime(acceptance.data.accepted_at)} · {money(acceptance.data.total)}</Typography>
              {acceptance.data.signature_mode === 'drawn' && acceptance.data.signature_data && (
                <Box component="img" src={acceptance.data.signature_data} alt={`Assinatura de ${acceptance.data.signer_name}`} sx={{ mt: 1.5, maxWidth: '100%', maxHeight: 80, bgcolor: '#fff', borderRadius: '8px', p: 1 }} />
              )}
              {acceptance.data.signature_mode === 'typed' && (
                <Typography sx={{ mt: 1.5, fontFamily: '"Instrument Serif", serif', fontSize: 30, fontStyle: 'italic', bgcolor: '#fff', color: '#18181B', borderRadius: '8px', px: 1.5, py: 0.5 }}>{acceptance.data.signer_name}</Typography>
              )}
              {acceptance.data.signature_mode === 'manual' && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Registrado pela equipe{acceptance.data.signature_data ? `: “${acceptance.data.signature_data}”` : '.'}</Typography>
              )}
              <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                {acceptance.data.signer_email && <Typography variant="caption" color="text.secondary">E-mail: {acceptance.data.signer_email}</Typography>}
                {acceptance.data.ip && <Typography variant="caption" color="text.secondary">IP: {acceptance.data.ip}</Typography>}
                <Tooltip title="Código da cópia do conteúdo aceito. Se algo mudasse, o código seria outro.">
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <ShieldCheck size={12} /> Verificação: <Mono>{acceptance.data.content_hash.slice(0, 16)}…</Mono>
                  </Typography>
                </Tooltip>
              </Stack>
            </Card>
          )}

          <Card sx={{ p: 2.5 }}>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <Fact icon={<Eye />} label="Aberturas" value={p.view_count ? `${p.view_count}×` : status === 'draft' ? '—' : 'Ainda não'} />
              <Fact icon={<Eye />} label="Última abertura" value={p.last_viewed_at ? relativeTime(p.last_viewed_at) : '—'} />
              <Fact icon={<Send />} label="Enviada" value={p.sent_at ? relativeTime(p.sent_at) : 'Não'} />
              <Fact
                icon={<CalendarClock />}
                label="Validade"
                value={
                  <Box component="span" sx={{ color: status !== 'accepted' && status !== 'declined' && left <= 3 ? tokens.error : 'inherit' }}>
                    {longDate(p.valid_until)}
                  </Box>
                }
              />
            </Box>
            {p.client && (p.client.whatsapp || p.client.email) && (
              <>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={0.5}>
                  {p.client.whatsapp && <Typography variant="body2" color="text.secondary">WhatsApp: {formatPhone(p.client.whatsapp)}</Typography>}
                  {p.client.email && <Typography variant="body2" color="text.secondary">E-mail: {p.client.email}</Typography>}
                </Stack>
              </>
            )}
          </Card>

          <Card sx={{ p: 2.5 }}>
            <Typography variant="h3" component="h2" sx={{ mb: 2 }}>Linha do tempo</Typography>
            <Stack spacing={0}>
              {(events.data ?? []).map((e, i, arr) => (
                <Stack key={e.id} direction="row" spacing={1.5}>
                  <Stack sx={{ alignItems: 'center', pt: 0.6 }}>
                    <ToneDot tone={eventTone(e.kind)} size={9} />
                    {i < arr.length - 1 && <Box sx={{ width: '1px', flexGrow: 1, bgcolor: tokens.border, my: 0.5 }} />}
                  </Stack>
                  <Box sx={{ pb: 2, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{eventLabel(e, p.client?.name)}</Typography>
                    {e.message && e.kind !== 'duplicated' && (
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', mt: 0.25 }}>“{e.message}”</Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" title={dateTime(e.created_at)}>{relativeTime(e.created_at)}</Typography>
                  </Box>
                </Stack>
              ))}
              {events.data?.length === 0 && <Typography variant="body2" color="text.secondary">Sem movimentos ainda.</Typography>}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mt: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 0, '& svg': { width: 13, height: 13 } }}><FileSignature /></ListItemIcon>
              {STATUS_META[status].hint}
            </Typography>
          </Card>
        </Stack>
      </Box>

      <ShareDialog open={share !== null} onClose={() => setShare(null)} proposal={p} followUp={share === 'followup'} />
      {dialog === 'accept' && <ManualAcceptDialog open onClose={() => setDialog(null)} proposal={p} />}
      {dialog === 'decline' && <DeclineDialog open onClose={() => setDialog(null)} proposal={p} />}
      {dialog === 'template' && <SaveTemplateDialog open onClose={() => setDialog(null)} proposal={p} />}
      <ConfirmDialog
        open={dialog === 'delete'}
        title="Excluir esta proposta?"
        message={status === 'draft' ? 'O rascunho será excluído.' : 'A proposta e o histórico dela serão excluídos, e o link deixará de abrir para o cliente.'}
        confirmLabel="Excluir"
        danger
        loading={busy}
        onClose={() => setDialog(null)}
        onConfirm={() => run(() => deleteProposal(p.id), 'Proposta excluída.', () => navigate('/painel/propostas', { replace: true }))}
      />
    </>
  );
}
