import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Check, CreditCard, Lock, QrCode, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { membershipsKey, useOrganization } from '@/features/organizations/OrganizationProvider';
import { friendlyError } from '@/lib/errors';
import { dateTime, money, shortDate } from '@/lib/format';
import { PLAN_FEATURES, PRICE_MONTHLY, TRIAL_DAYS } from '@/lib/pricing';
import { subscriptionState, type SubscriptionState } from '@/lib/subscription';
import { listBillingPayments, PAYMENT_METHOD_NAMES, startCheckout } from '@/services/billing';
import { ListSkeleton, SectionCard } from '@/components/common';
import { tokens } from '@/theme/tokens';

export function useSubscription(): SubscriptionState | null {
  const { organization } = useOrganization();
  return organization ? subscriptionState(organization) : null;
}

// ---------------------------------------------------------------------
// Janela de pagamento
// ---------------------------------------------------------------------

const MONTH_OPTIONS = [1, 3, 12] as const;

export function PaymentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { organization, canManage } = useOrganization();
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  const [months, setMonths] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!organization) return null;

  const pay = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // O Asaas cuida da tela de pagamento e volta para /painel?assinatura=retorno.
      window.location.assign(await startCheckout(organization.id, method, months));
    } catch (e) {
      setError(friendlyError(e, e instanceof Error ? e.message : 'Não foi possível abrir o pagamento.'));
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="payment-title">
      <DialogTitle id="payment-title" sx={{ pr: 6 }}>
        Assinar o FechaProposta
        <IconButton aria-label="Fechar" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Um plano com tudo incluído. {money(PRICE_MONTHLY)} por mês, sem fidelidade.
        </Typography>
        <Stack spacing={0.75} sx={{ my: 2 }}>
          {PLAN_FEATURES.slice(0, 4).map((f) => (
            <Stack key={f} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Check size={15} color={tokens.success} strokeWidth={3} />
              <Typography variant="body2">{f}</Typography>
            </Stack>
          ))}
        </Stack>

        {!canManage ? (
          <Alert severity="info">Só o dono ou o gerente da empresa podem assinar. Peça para um deles.</Alert>
        ) : (
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Período</Typography>
              <ToggleButtonGroup exclusive fullWidth size="small" value={months} onChange={(_, v) => v && setMonths(v)} sx={{ mt: 0.5 }} aria-label="Quantos meses">
                {MONTH_OPTIONS.map((m) => (
                  <ToggleButton key={m} value={m} sx={{ textTransform: 'none', flexDirection: 'column', py: 1 }}>
                    <Typography sx={{ fontWeight: 650, fontSize: 14 }}>{m === 1 ? '1 mês' : `${m} meses`}</Typography>
                    <Typography variant="caption" color="text.secondary">{money(PRICE_MONTHLY * m)}</Typography>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Forma de pagamento</Typography>
              <ToggleButtonGroup exclusive fullWidth size="small" value={method} onChange={(_, v) => v && setMethod(v)} sx={{ mt: 0.5 }} aria-label="Forma de pagamento">
                <ToggleButton value="pix" sx={{ gap: 1, textTransform: 'none', fontWeight: 600 }}><QrCode size={16} /> Pix</ToggleButton>
                <ToggleButton value="card" sx={{ gap: 1, textTransform: 'none', fontWeight: 600 }}><CreditCard size={16} /> Cartão</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <Button variant="contained" size="large" loading={submitting} onClick={pay}>
              Pagar {money(PRICE_MONTHLY * months)}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 0.75, alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={13} /> Pagamento seguro pelo Asaas · liberação automática
            </Typography>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------
// Avisos no painel
// ---------------------------------------------------------------------

/** Faixa no topo: teste acabando ou acesso pausado. */
export function SubscriptionBanner() {
  const s = useSubscription();
  const [open, setOpen] = useState(false);
  if (!s || (s.active && (!s.inTrial || s.trialDaysLeft > 3) && (s.paidDaysLeft === null || s.paidDaysLeft > 3))) return null;

  const text = !s.active
    ? 'Seu acesso está pausado. Você ainda vê tudo, mas não cria nem envia propostas. Os links já enviados continuam funcionando.'
    : s.inTrial
      ? `Seu teste grátis termina ${s.trialDaysLeft === 1 ? 'amanhã' : `em ${s.trialDaysLeft} dias`}. Assine para não interromper seus envios.`
      : `Sua assinatura vence ${s.paidDaysLeft === 1 ? 'amanhã' : `em ${s.paidDaysLeft} dias`}.`;

  return (
    <>
      <Alert
        severity={s.active ? 'info' : 'warning'}
        icon={<Sparkles size={18} />}
        className="no-print"
        sx={{
          mb: 3,
          alignItems: 'center',
          flexWrap: 'wrap',
          '& .MuiAlert-message': { flex: '1 1 240px' },
          '& .MuiAlert-action': { ml: { xs: 4.5, sm: 'auto' }, pl: { xs: 0, sm: 2 }, pt: { xs: 0, sm: 0.5 } },
        }}
        action={<Button size="small" variant="contained" onClick={() => setOpen(true)}>Assinar agora</Button>}
      >
        {text}
      </Alert>
      <PaymentDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Card discreto no menu lateral durante o teste. */
export function TrialCard() {
  const s = useSubscription();
  const [open, setOpen] = useState(false);
  if (!s || !s.inTrial) return null;
  const progress = Math.min(100, Math.max(4, ((TRIAL_DAYS - s.trialDaysLeft) / TRIAL_DAYS) * 100));
  return (
    <Box sx={{ p: 1.75, borderRadius: '12px', bgcolor: tokens.accentSoft, border: `1px solid ${tokens.border}` }}>
      <Typography sx={{ fontWeight: 650, fontSize: 13 }}>
        Teste grátis: {s.trialDaysLeft} {s.trialDaysLeft === 1 ? 'dia' : 'dias'}
      </Typography>
      <LinearProgress variant="determinate" value={progress} sx={{ my: 1, bgcolor: '#fff' }} aria-label="Dias de teste usados" />
      <Button size="small" variant="contained" fullWidth onClick={() => setOpen(true)}>Assinar · {money(PRICE_MONTHLY)}/mês</Button>
      <PaymentDialog open={open} onClose={() => setOpen(false)} />
    </Box>
  );
}

/** Volta do Asaas (/painel?assinatura=retorno|falhou): confere até o webhook liberar. */
export function PaymentReturnNotice() {
  const [params, setParams] = useSearchParams();
  const result = params.get('assinatura');
  const { organization } = useOrganization();
  const { user } = useAuth();
  const qc = useQueryClient();
  const baseline = useRef(organization?.paid_until ?? null);
  const [confirmed, setConfirmed] = useState(false);
  const [tries, setTries] = useState(0);

  // Uma conferência a cada 3 s, por até ~2 minutos.
  useEffect(() => {
    if (result !== 'retorno' || confirmed || tries >= 40) return;
    const timer = setTimeout(() => {
      qc.invalidateQueries({ queryKey: membershipsKey(user?.id) });
      setTries((t) => t + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [result, confirmed, tries, qc, user?.id]);

  useEffect(() => {
    if (result === 'retorno' && organization?.paid_until && organization.paid_until !== baseline.current) setConfirmed(true);
  }, [result, organization?.paid_until]);

  if (!result) return null;
  const dismiss = () => {
    params.delete('assinatura');
    setParams(params, { replace: true });
  };

  if (result === 'falhou') {
    return <Alert severity="warning" onClose={dismiss} sx={{ mb: 3 }}>O pagamento não foi concluído e nada foi cobrado. Você pode tentar de novo quando quiser.</Alert>;
  }
  if (confirmed) {
    return (
      <Alert severity="success" onClose={dismiss} sx={{ mb: 3 }}>
        Pagamento confirmado! Sua assinatura está ativa até {shortDate(organization?.paid_until)}.
      </Alert>
    );
  }
  return (
    <Alert severity="info" onClose={dismiss} sx={{ mb: 3 }}>
      {tries < 40
        ? 'Recebemos sua volta do pagamento. Estamos confirmando com o Asaas, isso leva alguns segundos…'
        : 'O Pix pode levar alguns minutos para compensar. A assinatura é liberada automaticamente assim que o Asaas confirmar.'}
    </Alert>
  );
}

// ---------------------------------------------------------------------
// Aba "Assinatura" nas configurações
// ---------------------------------------------------------------------

export function SubscriptionPanel() {
  const { organization, canManage } = useOrganization();
  const s = useSubscription();
  const [open, setOpen] = useState(false);
  const payments = useQuery({
    queryKey: ['billing-payments', organization?.id],
    queryFn: () => listBillingPayments(organization!.id),
    enabled: Boolean(organization && canManage),
  });
  if (!organization || !s) return null;

  const status = !s.active
    ? { label: 'Pausada', color: tokens.warning, text: 'O teste ou a assinatura venceu. Assine para voltar a criar e enviar propostas.' }
    : s.inTrial
      ? { label: 'Teste grátis', color: tokens.info, text: `Você tem acesso completo até ${dateTime(organization.trial_ends_at)}.` }
      : { label: 'Ativa', color: tokens.success, text: `Paga até ${dateTime(organization.paid_until)}.` };

  return (
    <Stack spacing={2.5}>
      <Card sx={{ p: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: status.color }} />
              <Typography sx={{ fontWeight: 650 }}>{status.label}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{status.text}</Typography>
          </Box>
          <Button variant="contained" onClick={() => setOpen(true)} disabled={!canManage}>
            {s.inTrial || !s.active ? 'Assinar' : 'Adicionar meses'}
          </Button>
        </Stack>
      </Card>

      <SectionCard title="Plano" description={`${money(PRICE_MONTHLY)} por mês. Pagar durante o teste não desperdiça os dias restantes.`}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
          {PLAN_FEATURES.map((f) => (
            <Stack key={f} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Check size={15} color={tokens.success} strokeWidth={3} />
              <Typography variant="body2">{f}</Typography>
            </Stack>
          ))}
        </Box>
      </SectionCard>

      {canManage && (
        <SectionCard title="Pagamentos">
          {payments.isPending ? (
            <ListSkeleton rows={2} />
          ) : !payments.data?.length ? (
            <Typography variant="body2" color="text.secondary">Nenhum pagamento ainda.</Typography>
          ) : (
            <Stack divider={<Box sx={{ borderTop: `1px solid ${tokens.border}` }} />}>
              {payments.data.map((p) => (
                <Stack key={p.id} direction="row" spacing={2} sx={{ py: 1.25, justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.months === 1 ? '1 mês' : `${p.months} meses`} · {PAYMENT_METHOD_NAMES[p.method ?? ''] ?? p.method ?? '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">{dateTime(p.created_at)} · válido até {shortDate(p.paid_until_after)}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{money(p.amount)}</Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </SectionCard>
      )}
      <PaymentDialog open={open} onClose={() => setOpen(false)} />
    </Stack>
  );
}
