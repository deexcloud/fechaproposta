import { useMemo, useState } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Card, Chip, IconButton, InputAdornment, Menu, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { ArrowLeft, Ban, CalendarPlus, Hourglass, MessageCircle, MoreVertical, Search } from 'lucide-react';
import { BrandLoader, BrandMark, ErrorState } from '@/components/common';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotifyProvider';
import { StatCard } from '@/components/visual';
import { useAuth } from '@/features/auth/AuthProvider';
import { friendlyError } from '@/lib/errors';
import { money, relativeTime, shortDate } from '@/lib/format';
import { PRICE_MONTHLY } from '@/lib/pricing';
import { whatsappUrl } from '@/lib/proposal';
import { subscriptionState } from '@/lib/subscription';
import { addPaidMonths, endSubscription, extendTrial, isPlatformAdmin, listPlatformOrganizations, type PlatformOrganization } from '@/services/platform';
import { tokens } from '@/theme/tokens';

type Situation = 'trial' | 'paid' | 'paused';
type Filter = 'all' | Situation | 'soon';

const DAY = 86_400_000;

function situationOf(org: PlatformOrganization, now: Date) {
  const s = subscriptionState(org, now);
  const situation: Situation = !s.active ? 'paused' : s.inTrial ? 'trial' : 'paid';
  const endsAt = situation === 'paid' ? s.paidUntil! : s.trialEndsAt;
  const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / DAY);
  return { situation, endsAt, daysLeft, soon: situation !== 'paused' && daysLeft <= 3 };
}

const SITUATION_LABEL: Record<Situation, { label: string; color: string; bg: string }> = {
  trial: { label: 'Teste', color: tokens.info, bg: tokens.infoSoft },
  paid: { label: 'Paga', color: tokens.success, bg: tokens.successSoft },
  paused: { label: 'Pausada', color: tokens.error, bg: tokens.errorSoft },
};

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Administração da plataforma: empresas, situação da assinatura e liberação manual. */
export function PlatformAdminPage() {
  const { user } = useAuth();
  const notify = useNotify();
  const qc = useQueryClient();
  const now = useMemo(() => new Date(), []);
  const admin = useQuery({ queryKey: ['is-platform-admin', user?.id], queryFn: isPlatformAdmin, staleTime: Infinity });
  const orgs = useQuery({ queryKey: ['platform-orgs'], queryFn: listPlatformOrganizations, enabled: admin.data === true });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [menu, setMenu] = useState<{ anchor: HTMLElement; org: PlatformOrganization } | null>(null);
  const [ending, setEnding] = useState<PlatformOrganization | null>(null);

  const action = useMutation({
    mutationFn: async ({ kind, org, amount }: { kind: 'months' | 'trial' | 'end'; org: PlatformOrganization; amount?: number }) => {
      if (kind === 'months') await addPaidMonths(org.id, amount ?? 1);
      else if (kind === 'trial') await extendTrial(org.id, amount ?? 7);
      else await endSubscription(org.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-orgs'] });
      notify.success('Assinatura atualizada.');
      setMenu(null);
      setEnding(null);
    },
    onError: (e) => notify.error(friendlyError(e)),
  });

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    return (orgs.data ?? [])
      .map((o) => ({ org: o, s: situationOf(o, now) }))
      .filter(({ s }) => (filter === 'all' || (filter === 'soon' ? s.soon : s.situation === filter)))
      .filter(({ org }) => !q || normalize([org.name, org.owner_email, org.owner_name].filter(Boolean).join(' ')).includes(q));
  }, [orgs.data, query, filter, now]);

  const counts = useMemo(() => {
    const all = (orgs.data ?? []).map((o) => situationOf(o, now));
    return {
      all: all.length,
      trial: all.filter((s) => s.situation === 'trial').length,
      paid: all.filter((s) => s.situation === 'paid').length,
      paused: all.filter((s) => s.situation === 'paused').length,
      soon: all.filter((s) => s.soon).length,
    };
  }, [orgs.data, now]);

  if (admin.isPending) return <BrandLoader />;
  if (!admin.data) return <Navigate to="/painel" replace />;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 3, md: 5 } }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <BrandMark size="small" />
          <Chip size="small" label="Administração" />
        </Stack>
        <Button component={RouterLink} to="/painel" startIcon={<ArrowLeft />} color="inherit">Painel</Button>
      </Stack>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, mb: 3 }}>
        <StatCard label="Empresas" value={counts.all} />
        <StatCard label="Pagantes" value={counts.paid} hint={`${money(counts.paid * PRICE_MONTHLY)}/mês`} />
        <StatCard label="Em teste" value={counts.trial} />
        <StatCard label="Vencem em 3 dias" value={counts.soon} />
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar empresa, dono ou e-mail"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ maxWidth: 360 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> } }}
        />
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {([['all', 'Todas'], ['trial', 'Teste'], ['paid', 'Pagas'], ['paused', 'Pausadas'], ['soon', 'Vencendo']] as [Filter, string][]).map(([value, label]) => (
            <Chip key={value} label={`${label} · ${counts[value]}`} variant={filter === value ? 'filled' : 'outlined'} onClick={() => setFilter(value)} />
          ))}
        </Stack>
      </Stack>

      {orgs.error ? (
        <ErrorState message={friendlyError(orgs.error)} onRetry={() => orgs.refetch()} />
      ) : (
        <Card sx={{ overflow: 'hidden' }}>
          {rows.length === 0 && <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>Nenhuma empresa.</Typography>}
          {rows.map(({ org, s }, i) => {
            const badge = SITUATION_LABEL[s.situation];
            return (
              <Stack key={org.id} direction="row" spacing={2} sx={{ px: 2, py: 1.5, alignItems: 'center', borderTop: i ? `1px solid ${tokens.border}` : 'none' }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontWeight: 600 }}>{org.name}</Typography>
                  <Typography noWrap variant="caption" color="text.secondary">
                    {org.owner_name ?? '—'} · {org.owner_email ?? '—'} · desde {shortDate(org.created_at)}
                  </Typography>
                </Box>
                <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right', minWidth: 140 }}>
                  <Typography variant="body2">{org.proposals} propostas · {org.accepted_30d} aceites/30d</Typography>
                  <Typography variant="caption" color="text.secondary">{org.last_proposal_at ? `última ${relativeTime(org.last_proposal_at)}` : 'sem propostas'}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right', minWidth: 110 }}>
                  <Box component="span" sx={{ fontSize: 12, fontWeight: 650, px: 1, py: 0.25, borderRadius: '999px', color: badge.color, bgcolor: badge.bg }}>{badge.label}</Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {s.situation === 'paused' ? `desde ${shortDate(s.endsAt.toISOString())}` : `até ${shortDate(s.endsAt.toISOString())}`}
                  </Typography>
                </Box>
                <IconButton aria-label={`Ações para ${org.name}`} onClick={(e) => setMenu({ anchor: e.currentTarget, org })}><MoreVertical size={18} /></IconButton>
              </Stack>
            );
          })}
        </Card>
      )}

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {menu && [1, 3, 12].map((m) => (
          <MenuItem key={m} disabled={action.isPending} onClick={() => action.mutate({ kind: 'months', org: menu.org, amount: m })}>
            <CalendarPlus /> Liberar {m} {m === 1 ? 'mês' : 'meses'}
          </MenuItem>
        ))}
        {menu && (
          <MenuItem disabled={action.isPending} onClick={() => action.mutate({ kind: 'trial', org: menu.org, amount: 7 })}>
            <Hourglass /> Mais 7 dias de teste
          </MenuItem>
        )}
        {menu?.org.whatsapp && (
          <MenuItem component="a" href={whatsappUrl(`Olá! Aqui é do FechaProposta.`, menu.org.whatsapp)} target="_blank" rel="noopener">
            <MessageCircle /> Chamar no WhatsApp
          </MenuItem>
        )}
        {menu && (
          <MenuItem onClick={() => { setEnding(menu.org); setMenu(null); }} sx={{ color: tokens.error, '& svg': { color: `${tokens.error} !important` } }}>
            <Ban /> Encerrar acesso agora
          </MenuItem>
        )}
      </Menu>

      <ConfirmDialog
        open={Boolean(ending)}
        title={`Encerrar o acesso de ${ending?.name ?? ''}?`}
        message="O teste e a assinatura terminam agora. A empresa continua vendo os dados, mas não cria nem envia propostas."
        confirmLabel="Encerrar"
        danger
        loading={action.isPending}
        onClose={() => setEnding(null)}
        onConfirm={() => ending && action.mutate({ kind: 'end', org: ending })}
      />
    </Box>
  );
}
