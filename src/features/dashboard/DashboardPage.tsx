import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, Checkbox, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { ArrowRight, CheckCircle2, FileText, Gauge, MessageCircle, Plus, Receipt, TrendingUp, Wallet, X } from 'lucide-react';
import { EmptyState, ErrorState, ListSkeleton, PageHeader, SectionCard } from '@/components/common';
import { StatusChip } from '@/components/StatusChip';
import { Bar, NameAvatar, StatCard, ToneDot } from '@/components/visual';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCurrentOrganization } from '@/features/organizations/OrganizationProvider';
import { useActivity, useProposals, useServices } from '@/hooks/queries';
import { friendlyError } from '@/lib/errors';
import { eventLabel, eventTone } from '@/lib/events';
import { firstName, moneyShort, plural, relativeTime } from '@/lib/format';
import {
  attentionItems,
  effectiveStatus,
  followUpMessage,
  pipelineStats,
  publicProposalUrl,
  STATUS_META,
  whatsappUrl,
  type AttentionItem,
} from '@/lib/proposal';
import type { EffectiveStatus, ProposalListItem } from '@/types';
import { TONE_COLORS } from '@/components/StatusChip';
import { tokens } from '@/theme/tokens';

const CHECKLIST_KEY = 'fechaproposta.checklist-dismissed';

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

/** Primeiros passos para quem acabou de chegar. Some quando tudo estiver feito. */
function GettingStarted({ proposals }: { proposals: ProposalListItem[] }) {
  const org = useCurrentOrganization();
  const services = useServices();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(`${CHECKLIST_KEY}:${org.id}`) === '1';
    } catch {
      return false;
    }
  });
  const steps = [
    { done: true, label: 'Criar sua empresa', to: '' },
    { done: Boolean(org.logo_path || org.brand_color), label: 'Colocar logo e cor da marca', to: '/painel/configuracoes?aba=marca' },
    { done: (services.data?.length ?? 0) > 0, label: 'Cadastrar seus serviços no catálogo', to: '/painel/catalogo' },
    { done: proposals.length > 0, label: 'Criar a primeira proposta', to: '/painel/propostas/nova' },
    { done: proposals.some((p) => p.status !== 'draft'), label: 'Enviar para um cliente', to: proposals[0] ? `/painel/propostas/${proposals[0].id}` : '/painel/propostas/nova' },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (dismissed || doneCount === steps.length || services.isPending) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(`${CHECKLIST_KEY}:${org.id}`, '1');
    } catch {
      /* sem armazenamento: some só nesta visita */
    }
  };

  return (
    <Card sx={{ p: 2.5, mb: 3 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h3" component="h2">Primeiros passos</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {doneCount} de {steps.length} feitos. Em poucos minutos você envia a primeira proposta.
          </Typography>
        </Box>
        <IconButton aria-label="Esconder primeiros passos" onClick={dismiss} size="small">
          <X size={16} />
        </IconButton>
      </Stack>
      <Bar value={doneCount} max={steps.length} />
      <Box sx={{ mt: 2, display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' } }}>
        {steps.map((s) => (
          <Box
            key={s.label}
            component={s.done || !s.to ? 'div' : RouterLink}
            to={s.to}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1, p: 1.25, borderRadius: '8px', textDecoration: 'none', color: 'inherit',
              border: `1px solid ${tokens.border}`,
              bgcolor: s.done ? tokens.subtle : tokens.surface,
              '&:hover': s.done ? undefined : { borderColor: tokens.primary },
            }}
          >
            <Checkbox checked={s.done} disabled tabIndex={-1} size="small" sx={{ p: 0, '&.Mui-checked': { color: `${tokens.primary} !important` } }} />
            <Typography variant="body2" sx={{ fontWeight: 550, textDecoration: s.done ? 'line-through' : 'none', color: s.done ? tokens.textTertiary : tokens.textPrimary }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>
    </Card>
  );
}

function AttentionRow({ item, orgName }: { item: AttentionItem<ProposalListItem>; orgName: string }) {
  const p = item.proposal;
  const remind = item.reason === 'viewed_no_reply' || item.reason === 'not_opened' || item.reason === 'expiring';
  const message = followUpMessage({ clientName: p.client?.name, title: p.title, link: publicProposalUrl(p.share_token), validUntil: p.valid_until, senderName: orgName });
  const tone = item.reason === 'change_requested' ? 'violet' : item.reason === 'expiring' ? 'error' : item.reason === 'stale_draft' ? 'neutral' : 'warning';
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1.5, px: { xs: 0, sm: 0.5 } }}>
      <NameAvatar name={p.client?.name ?? p.title} size={36} />
      <Box component={RouterLink} to={`/painel/propostas/${p.id}`} sx={{ flexGrow: 1, minWidth: 0, textDecoration: 'none', color: 'inherit', '&:hover .t': { textDecoration: 'underline' } }}>
        <Typography className="t" noWrap sx={{ fontWeight: 600, fontSize: 14 }}>{p.title}</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, columnGap: 0.75, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <ToneDot tone={tone} size={6} />
            <Typography noWrap variant="caption" sx={{ color: TONE_COLORS[tone].fg, fontWeight: 600 }}>{item.title}</Typography>
          </Stack>
          <Typography noWrap variant="caption" color="text.secondary">
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>· </Box>
            {p.client?.name ?? 'Sem cliente'} · {moneyShort(p.total_amount)}
          </Typography>
        </Stack>
      </Box>
      {remind && p.client?.whatsapp ? (
        <>
          <Tooltip title="Abrir o WhatsApp com um lembrete pronto">
            <Button size="small" variant="outlined" startIcon={<MessageCircle />} href={whatsappUrl(message, p.client.whatsapp)} target="_blank" rel="noopener" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              Lembrar
            </Button>
          </Tooltip>
          {/* No celular, só o ícone: a ação continua a um toque. */}
          <IconButton aria-label={`Lembrar ${p.client.name} pelo WhatsApp`} href={whatsappUrl(message, p.client.whatsapp)} target="_blank" rel="noopener" sx={{ display: { xs: 'inline-flex', sm: 'none' }, border: `1px solid ${tokens.border}`, width: 44, height: 44 }}>
            <MessageCircle size={18} />
          </IconButton>
        </>
      ) : (
        <Button size="small" variant="outlined" component={RouterLink} to={item.reason === 'stale_draft' ? `/painel/propostas/${p.id}/editar` : `/painel/propostas/${p.id}`} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
          {item.reason === 'change_requested' ? 'Ver pedido' : item.reason === 'stale_draft' ? 'Continuar' : 'Abrir'}
        </Button>
      )}
    </Stack>
  );
}

const FUNNEL: EffectiveStatus[] = ['draft', 'sent', 'viewed', 'negotiating', 'accepted'];

export function DashboardPage() {
  const { user } = useAuth();
  const org = useCurrentOrganization();
  const proposals = useProposals();
  const activity = useActivity();
  const list = useMemo(() => proposals.data ?? [], [proposals.data]);
  const stats = useMemo(() => pipelineStats(list), [list]);
  const attention = useMemo(() => attentionItems(list).slice(0, 8), [list]);
  const name = firstName(user?.user_metadata?.full_name as string | undefined);
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const funnelMax = Math.max(...FUNNEL.map((s) => stats.byStatus[s].value), 1);

  return (
    <>
      <PageHeader
        eyebrow={today}
        title={name ? `${greeting()}, ${name}` : greeting()}
        subtitle={
          stats.openCount
            ? `${plural(stats.openCount, 'proposta aguardando', 'propostas aguardando')} resposta, somando ${moneyShort(stats.openValue)}.`
            : 'Crie uma proposta e acompanhe aqui cada passo do seu cliente.'
        }
        actions={<Button component={RouterLink} to="/painel/propostas/nova" variant="contained" startIcon={<Plus />} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>Nova proposta</Button>}
      />

      {proposals.error && <ErrorState message={friendlyError(proposals.error, 'Não foi possível carregar as propostas.')} onRetry={() => proposals.refetch()} />}
      {proposals.data && <GettingStarted proposals={list} />}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, mb: 3 }}>
        <StatCard loading={proposals.isPending} label="Em aberto" icon={<Wallet />} value={moneyShort(stats.openValue)} hint={plural(stats.openCount, 'proposta', 'propostas')} />
        <StatCard loading={proposals.isPending} label="Fechado no mês" icon={<TrendingUp />} value={moneyShort(stats.acceptedMonthValue)} hint={plural(stats.acceptedMonthCount, 'aceite', 'aceites')} />
        <StatCard loading={proposals.isPending} label="Taxa de aceite" icon={<Gauge />} value={stats.acceptanceRate === null ? '—' : `${stats.acceptanceRate}%`} hint="das propostas respondidas" />
        <StatCard
          loading={proposals.isPending}
          label="Ticket médio"
          icon={<Receipt />}
          value={stats.averageTicket === null ? '—' : moneyShort(stats.averageTicket)}
          hint={stats.averageDaysToClose === null ? 'nas propostas aceitas' : `fecha em ${stats.averageDaysToClose.toLocaleString('pt-BR')} dias, em média`}
        />
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.6fr) minmax(0, 1fr)' }, alignItems: 'start' }}>
        <SectionCard
          title="Precisa da sua atenção"
          description="O que fazer agora para fechar mais."
          action={<Button component={RouterLink} to="/painel/propostas" size="small" endIcon={<ArrowRight />}>Todas</Button>}
        >
          {proposals.isPending ? (
            <ListSkeleton rows={3} />
          ) : attention.length === 0 ? (
            <EmptyState
              compact
              icon={list.length ? <CheckCircle2 /> : <FileText />}
              title={list.length ? 'Tudo em dia' : 'Nenhuma proposta ainda'}
              description={list.length ? 'Nenhuma proposta pede ação agora. Avisamos aqui quando o cliente abrir, pedir ajuste ou a validade estiver acabando.' : 'Crie a primeira e envie pelo WhatsApp em poucos minutos.'}
              action={!list.length && <Button component={RouterLink} to="/painel/propostas/nova" variant="contained" startIcon={<Plus />}>Criar proposta</Button>}
            />
          ) : (
            <Stack divider={<Box sx={{ borderTop: `1px solid ${tokens.border}` }} />} sx={{ mt: -1 }}>
              {attention.map((item) => (
                <AttentionRow key={`${item.proposal.id}-${item.reason}`} item={item} orgName={org.name} />
              ))}
            </Stack>
          )}
        </SectionCard>

        <Stack spacing={3}>
          <SectionCard title="Funil" description="Valor em cada etapa.">
            <Stack spacing={1.75}>
              {FUNNEL.map((s) => {
                // Uma cor só: aceitas em violeta, as demais etapas em cinza.
                const color = s === 'accepted' ? tokens.primary : tokens.borderStrong;
                return (
                  <Box key={s} component={RouterLink} to={`/painel/propostas?status=${s}`} sx={{ textDecoration: 'none', color: 'inherit', '&:hover .l': { textDecoration: 'underline' } }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.6 }}>
                      <Typography className="l" variant="body2" sx={{ fontWeight: 550 }}>
                        {STATUS_META[s].label} <Box component="span" sx={{ color: tokens.textTertiary, fontWeight: 400 }}>· {stats.byStatus[s].count}</Box>
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFeatureSettings: '"tnum"' }}>{moneyShort(stats.byStatus[s].value)}</Typography>
                    </Stack>
                    <Bar value={stats.byStatus[s].value} max={funnelMax} color={color} />
                  </Box>
                );
              })}
            </Stack>
          </SectionCard>

          <SectionCard title="Movimento recente">
            {activity.isPending ? (
              <ListSkeleton rows={3} />
            ) : !activity.data?.length ? (
              <Typography variant="body2" color="text.secondary">Os movimentos das propostas aparecem aqui.</Typography>
            ) : (
              <Stack spacing={1.75}>
                {activity.data.map((e) => (
                  <Stack key={e.id} direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
                    <Box sx={{ pt: 0.75 }}><ToneDot tone={eventTone(e.kind)} /></Box>
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 550 }}>{eventLabel(e, e.proposal?.client?.name)}</Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        component={RouterLink}
                        to={`/painel/propostas/${e.proposal_id}`}
                        sx={{ display: 'block', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {e.proposal?.code} · {e.proposal?.title} · {relativeTime(e.created_at)}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Stack>
      </Box>

      {list.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <SectionCard title="Últimas propostas" action={<Button component={RouterLink} to="/painel/propostas" size="small" endIcon={<ArrowRight />}>Ver todas</Button>}>
            <Stack divider={<Box sx={{ borderTop: `1px solid ${tokens.border}` }} />} sx={{ mt: -1 }}>
              {list.slice(0, 5).map((p) => (
                <Stack key={p.id} component={RouterLink} to={`/painel/propostas/${p.id}`} direction="row" spacing={1.5} sx={{ py: 1.25, alignItems: 'center', textDecoration: 'none', color: 'inherit', '&:hover': { bgcolor: tokens.hover }, borderRadius: '8px', px: 0.5 }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 600, fontSize: 14 }}>{p.title}</Typography>
                    <Typography noWrap variant="caption" color="text.secondary">{p.code} · {p.client?.name ?? 'Sem cliente'}</Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 14, display: { xs: 'none', sm: 'block' }, fontFeatureSettings: '"tnum"' }}>{moneyShort(p.total_amount)}</Typography>
                  <StatusChip status={effectiveStatus(p)} size="small" />
                </Stack>
              ))}
            </Stack>
          </SectionCard>
        </Box>
      )}
    </>
  );
}
