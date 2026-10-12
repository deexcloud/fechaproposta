import { useMemo } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Box, Button, Card, Chip, InputAdornment, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { Eye, FileText, Plus, Search } from 'lucide-react';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/common';
import { StatusChip } from '@/components/StatusChip';
import { NameAvatar } from '@/components/visual';
import { useClients, useProposals } from '@/hooks/queries';
import { friendlyError } from '@/lib/errors';
import { daysUntil, moneyShort, relativeTime, shortDate } from '@/lib/format';
import { effectiveStatus, totalLabel } from '@/lib/proposal';
import type { EffectiveStatus, ProposalListItem } from '@/types';
import { tokens } from '@/theme/tokens';

const TABS: { value: string; label: string; statuses: EffectiveStatus[] | null }[] = [
  { value: 'todas', label: 'Todas', statuses: null },
  { value: 'draft', label: 'Rascunhos', statuses: ['draft'] },
  { value: 'aguardando', label: 'Aguardando', statuses: ['sent', 'viewed'] },
  { value: 'negotiating', label: 'Em negociação', statuses: ['negotiating'] },
  { value: 'accepted', label: 'Aceitas', statuses: ['accepted'] },
  { value: 'encerradas', label: 'Encerradas', statuses: ['declined', 'expired'] },
];

// Atalhos vindos do funil (?status=sent|viewed) caem na aba certa.
const STATUS_TO_TAB: Partial<Record<string, string>> = { sent: 'aguardando', viewed: 'aguardando', declined: 'encerradas', expired: 'encerradas' };

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function activityText(p: ProposalListItem, status: EffectiveStatus): string {
  if (status === 'draft') return `Editada ${relativeTime(p.updated_at)}`;
  if (status === 'accepted') return `Aceita ${relativeTime(p.accepted_at)}`;
  if (status === 'declined') return `Recusada ${relativeTime(p.declined_at)}`;
  if (p.view_count > 0) return `Aberta ${p.view_count}× · ${relativeTime(p.last_viewed_at)}`;
  return `Enviada ${relativeTime(p.sent_at)} · não aberta`;
}

function validityText(p: ProposalListItem, status: EffectiveStatus): { text: string; urgent: boolean } {
  if (status === 'accepted' || status === 'declined') return { text: '—', urgent: false };
  const left = daysUntil(p.valid_until);
  if (left < 0) return { text: `Venceu ${shortDate(p.valid_until)}`, urgent: false };
  if (left === 0) return { text: 'Vence hoje', urgent: true };
  if (left <= 3) return { text: `${left} ${left === 1 ? 'dia' : 'dias'}`, urgent: true };
  return { text: shortDate(p.valid_until), urgent: false };
}

const COLUMNS = 'minmax(0, 2.2fr) minmax(0, 1.3fr) 110px 140px minmax(0, 1.3fr) 96px';

function ProposalRow({ p }: { p: ProposalListItem }) {
  const status = effectiveStatus(p);
  const validity = validityText(p, status);
  return (
    <Box
      component={RouterLink}
      to={`/painel/propostas/${p.id}`}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr auto', md: COLUMNS },
        gap: { xs: 0.5, md: 2 },
        alignItems: 'center',
        px: 2,
        py: 1.5,
        textDecoration: 'none',
        color: 'inherit',
        borderTop: `1px solid ${tokens.border}`,
        '&:hover': { bgcolor: tokens.hover },
        '&:focus-visible': { outline: `2px solid ${tokens.limeText}`, outlineOffset: -2 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontWeight: 600, fontSize: 14 }}>{p.title}</Typography>
        <Typography noWrap variant="caption" color="text.secondary">
          {p.code}
          <Box component="span" sx={{ display: { md: 'none' } }}> · {p.client?.name ?? 'Sem cliente'}</Box>
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, display: { xs: 'none', md: 'flex' } }}>
        <NameAvatar name={p.client?.name ?? '?'} size={26} />
        <Typography noWrap variant="body2">{p.client?.name ?? 'Sem cliente'}</Typography>
      </Stack>
      <Typography sx={{ fontWeight: 600, fontSize: 14, textAlign: { xs: 'right', md: 'left' }, fontFeatureSettings: '"tnum"' }}>
        {totalLabel(p).replace(/,00$/, '')}
      </Typography>
      <Box sx={{ display: { xs: 'none', md: 'block' } }}><StatusChip status={status} size="small" /></Box>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, gridColumn: { xs: '1 / 2', md: 'auto' } }}>
        <Box sx={{ display: { md: 'none' } }}><StatusChip status={status} size="small" /></Box>
        {p.view_count > 0 && status !== 'draft' && <Eye size={13} color={tokens.textTertiary} />}
        <Typography noWrap variant="caption" color="text.secondary">{activityText(p, status)}</Typography>
      </Stack>
      <Typography variant="caption" sx={{ color: validity.urgent ? tokens.error : tokens.textSecondary, fontWeight: validity.urgent ? 650 : 400, textAlign: 'right' }}>
        {validity.text}
      </Typography>
    </Box>
  );
}

export function ProposalsPage() {
  const proposals = useProposals();
  const clients = useClients();
  const [params, setParams] = useSearchParams();
  const rawStatus = params.get('status') ?? 'todas';
  const tab = STATUS_TO_TAB[rawStatus] ?? (TABS.some((t) => t.value === rawStatus) ? rawStatus : 'todas');
  const query = params.get('busca') ?? '';
  const sort = params.get('ordem') ?? 'recentes';
  const clientId = params.get('cliente');
  const client = clients.data?.find((c) => c.id === clientId);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const all = useMemo(() => proposals.data ?? [], [proposals.data]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of TABS) c[t.value] = t.statuses ? all.filter((p) => t.statuses!.includes(effectiveStatus(p))).length : all.length;
    return c;
  }, [all]);

  const visible = useMemo(() => {
    const statuses = TABS.find((t) => t.value === tab)?.statuses;
    const q = normalize(query.trim());
    const filtered = all.filter(
      (p) =>
        (!statuses || statuses.includes(effectiveStatus(p))) &&
        (!clientId || p.client_id === clientId) &&
        (!q || normalize([p.title, p.code, p.client?.name, p.client?.company].filter(Boolean).join(' ')).includes(q)),
    );
    return filtered.sort((a, b) => {
      if (sort === 'valor') return b.total_amount - a.total_amount;
      if (sort === 'validade') return a.valid_until.localeCompare(b.valid_until);
      if (sort === 'atividade') return (b.last_viewed_at ?? b.updated_at).localeCompare(a.last_viewed_at ?? a.updated_at);
      return b.created_at.localeCompare(a.created_at);
    });
  }, [all, tab, query, sort, clientId]);

  const total = visible.reduce((sum, p) => sum + Number(p.status === 'accepted' ? p.accepted_total ?? p.total_amount : p.total_amount), 0);

  return (
    <>
      <PageHeader
        title="Propostas"
        subtitle="Tudo o que você enviou e o que cada cliente fez com a proposta."
        actions={<Button component={RouterLink} to="/painel/propostas/nova" variant="contained" startIcon={<Plus />} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>Nova proposta</Button>}
      />

      <Tabs value={tab} onChange={(_, v) => setParam('status', v === 'todas' ? null : v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2, borderBottom: `1px solid ${tokens.border}` }}>
        {TABS.map((t) => (
          <Tab
            key={t.value}
            value={t.value}
            label={
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <span>{t.label}</span>
                {counts[t.value] > 0 && (
                  <Box component="span" sx={{ fontSize: 11, fontWeight: 700, px: 0.75, borderRadius: '6px', bgcolor: t.value === 'negotiating' ? tokens.violetSoft : tokens.muted, color: t.value === 'negotiating' ? tokens.violet : tokens.textSecondary }}>
                    {counts[t.value]}
                  </Box>
                )}
              </Stack>
            }
          />
        ))}
      </Tabs>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2, alignItems: { sm: 'center' } }}>
        <TextField
          size="small"
          placeholder="Buscar por título, cliente ou código"
          value={query}
          onChange={(e) => setParam('busca', e.target.value || null)}
          sx={{ maxWidth: { sm: 360 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> }, htmlInput: { 'aria-label': 'Buscar propostas' } }}
        />
        <TextField select size="small" value={sort} onChange={(e) => setParam('ordem', e.target.value === 'recentes' ? null : e.target.value)} sx={{ width: { sm: 200 } }} slotProps={{ htmlInput: { 'aria-label': 'Ordenar' } }}>
          <MenuItem value="recentes">Mais recentes</MenuItem>
          <MenuItem value="atividade">Atividade do cliente</MenuItem>
          <MenuItem value="valor">Maior valor</MenuItem>
          <MenuItem value="validade">Vencem antes</MenuItem>
        </TextField>
        {client && <Chip label={`Cliente: ${client.name}`} onDelete={() => setParam('cliente', null)} />}
        <Box sx={{ flexGrow: 1 }} />
        {visible.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {visible.length} {visible.length === 1 ? 'proposta' : 'propostas'} · {moneyShort(total)}
          </Typography>
        )}
      </Stack>

      {proposals.error ? (
        <ErrorState message={friendlyError(proposals.error, 'Não foi possível carregar as propostas.')} onRetry={() => proposals.refetch()} />
      ) : proposals.isPending ? (
        <ListSkeleton rows={6} />
      ) : visible.length === 0 ? (
        <Card>
          {all.length === 0 ? (
            <EmptyState
              icon={<FileText />}
              title="Sua primeira proposta começa aqui"
              description="Monte escopo, valores e opcionais, veja a prévia ao lado e envie por WhatsApp. O cliente aprova pelo celular."
              action={<Button component={RouterLink} to="/painel/propostas/nova" variant="contained" startIcon={<Plus />}>Criar proposta</Button>}
            />
          ) : (
            <EmptyState compact icon={<Search />} title="Nenhuma proposta encontrada" description="Tente outra busca ou mude a aba." />
          )}
        </Card>
      ) : (
        <Card sx={{ overflow: 'hidden' }}>
          <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: COLUMNS, gap: 2, px: 2, py: 1.25, bgcolor: tokens.muted }}>
            {['Proposta', 'Cliente', 'Valor', 'Status', 'Atividade', 'Validade'].map((h, i) => (
              <Typography key={h} variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, textAlign: i === 5 ? 'right' : 'left' }}>{h}</Typography>
            ))}
          </Box>
          <Box sx={{ mt: { md: '-1px' } }}>
            {visible.map((p) => (
              <ProposalRow key={p.id} p={p} />
            ))}
          </Box>
        </Card>
      )}
    </>
  );
}
