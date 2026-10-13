import { useCallback, useEffect, useRef, useState } from 'react';
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
import { BadgeCheck, Check, CreditCard, ExternalLink, Lock, QrCode, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { membershipsKey, useOrganization } from '@/features/organizations/OrganizationProvider';
import { friendlyError } from '@/lib/errors';
import { dateTime, money, shortDate } from '@/lib/format';
import { PLAN_FEATURES, PLANS, PRICE_FROM, PRICE_MONTHLY, planDiscountPct, planSavings, TRIAL_DAYS } from '@/lib/pricing';
import { subscriptionState, type SubscriptionState } from '@/lib/subscription';
import { supportUrl } from '@/lib/support';
import { listBillingPayments, PAYMENT_METHOD_NAMES, startCheckout } from '@/services/billing';
import { ListSkeleton, SectionCard } from '@/components/common';
import { CHECKOUT_MESSAGE } from './CheckoutReturnPage';
import { tokens } from '@/theme/tokens';

export function useSubscription(): SubscriptionState | null {
  const { organization } = useOrganization();
  return organization ? subscriptionState(organization) : null;
}

// ---------------------------------------------------------------------
// Janela de pagamento
// ---------------------------------------------------------------------

const POPUP = 'fechaproposta-asaas';

type Phase = 'idle' | 'waiting' | 'done';

/** Janelinha por cima do painel. Abre já no clique (senão o navegador bloqueia) e recebe o link depois. */
function openPopup(): Window | null {
  const w = 480;
  const h = 760;
  const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2);
  const popup = window.open('', POPUP, `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
  try {
    // Só dá para escrever enquanto a janela está em branco (a do Asaas é de outro site).
    if (popup) {
      popup.document.title = 'Pagamento seguro · FechaProposta';
      popup.document.body.style.cssText = 'margin:0;display:grid;place-items:center;height:100vh;background:#fff;color:#71717A;font:14px system-ui,sans-serif';
      popup.document.body.textContent = 'Abrindo o pagamento seguro…';
    }
  } catch {
    /* janela já aberta no Asaas: só troca o endereço depois */
  }
  return popup;
}

/** Assinatura pelo Checkout do Asaas numa janelinha por cima; o painel atualiza sozinho quando o pagamento cai. */
export function PaymentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { organization, canManage } = useOrganization();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  // Começa no anual: é o melhor preço por mês e o que mais segura o cliente.
  const [months, setMonths] = useState<number>(12);
  const plan = PLANS.find((p) => p.months === months) ?? PLANS[0];
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [note, setNote] = useState<'waiting' | 'closed' | 'failed'>('waiting');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const paidUntil = organization?.paid_until ?? null;
  const baseline = useRef<string | null>(paidUntil);
  const orgId = organization?.id;
  const help = supportUrl('Oi! Tenho uma dúvida sobre o pagamento da assinatura do FechaProposta.');

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: membershipsKey(user?.id) });
    qc.invalidateQueries({ queryKey: ['billing-payments', orgId] });
  }, [qc, user?.id, orgId]);

  // Aviso da página de retorno (mesma origem), janela fechada e conferência periódica.
  useEffect(() => {
    if (phase !== 'waiting') return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== CHECKOUT_MESSAGE) return;
      setNote(event.data.status === 'ok' ? 'waiting' : 'failed');
      refresh();
    };
    window.addEventListener('message', onMessage);
    const watch = setInterval(() => {
      if (popupRef.current?.closed) setNote((n) => (n === 'failed' ? n : 'closed'));
      refresh();
    }, 4000);
    return () => {
      window.removeEventListener('message', onMessage);
      clearInterval(watch);
    };
  }, [phase, refresh]);

  // Pagamento aplicado: o vencimento da empresa mudou.
  useEffect(() => {
    if (phase === 'waiting' && paidUntil !== baseline.current) {
      popupRef.current?.close();
      setPhase('done');
    }
  }, [phase, paidUntil]);

  if (!organization) return null;

  const pay = async () => {
    const popup = openPopup();
    setSubmitting(true);
    setError(null);
    try {
      const url = await startCheckout(organization.id, method, months);
      setCheckoutUrl(url);
      baseline.current = paidUntil;
      if (!popup || popup.closed) {
        // Janela bloqueada pelo navegador: segue na mesma aba e volta por /assinatura/retorno.
        window.location.assign(url);
        return;
      }
      popup.location.href = url;
      popupRef.current = popup;
      setNote('waiting');
      setPhase('waiting');
    } catch (e) {
      popup?.close();
      setError(friendlyError(e, e instanceof Error ? e.message : 'Não foi possível abrir o pagamento.'));
    } finally {
      setSubmitting(false);
    }
  };

  const reopen = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }
    const popup = openPopup();
    if (popup && checkoutUrl) {
      popup.location.href = checkoutUrl;
      popupRef.current = popup;
      setNote('waiting');
    }
  };

  // Trocar período ou forma de pagamento depois de abrir: descarta o checkout aberto.
  const restart = () => {
    popupRef.current?.close();
    setPhase('idle');
    setCheckoutUrl(null);
  };

  const close = () => {
    onClose();
    if (phase === 'done') setPhase('idle');
  };

  if (phase === 'done') {
    return (
      <Dialog open={open} onClose={close} maxWidth="xs" fullWidth aria-labelledby="payment-title">
        <DialogContent>
          <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 2 }} className="fp-fade-up" aria-live="polite">
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: tokens.successSoft, color: tokens.success }}>
              <BadgeCheck size={34} />
            </Box>
            <Typography id="payment-title" sx={{ fontWeight: 750, fontSize: 19 }}>Pagamento confirmado!</Typography>
            <Typography variant="body2" color="text.secondary">
              {paidUntil ? `Sua assinatura está ativa até ${shortDate(paidUntil)}.` : 'Sua assinatura está ativa.'} Pode seguir criando e enviando propostas.
            </Typography>
            <Button variant="contained" size="large" fullWidth onClick={close}>Continuar</Button>
          </Stack>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth aria-labelledby="payment-title">
      <DialogTitle id="payment-title" sx={{ pr: 6 }}>
        Assinar o FechaProposta
        <IconButton aria-label="Fechar" onClick={close} sx={{ position: 'absolute', right: 12, top: 12 }}><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent>
        {phase === 'waiting' ? (
          <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', pt: 1, pb: 1 }} aria-live="polite">
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <Box sx={{ position: 'relative', width: 10, height: 10 }}>
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: note === 'failed' ? tokens.warning : tokens.primary }} />
                {note !== 'failed' && <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: tokens.primary, animation: 'fp-pulse 1.4s ease-out infinite' }} />}
              </Box>
              <Typography sx={{ fontWeight: 650 }}>{note === 'failed' ? 'Pagamento não concluído' : 'Aguardando o pagamento no Asaas'}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {plan.label} · {money(plan.total)} {method === 'pix' ? 'no Pix' : 'no cartão'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {note === 'failed'
                ? 'Nada foi cobrado. Você pode tentar de novo ou escolher outra forma de pagamento.'
                : note === 'closed'
                  ? 'A janela do Asaas foi fechada. Se você concluiu o pagamento, a confirmação aparece aqui em instantes.'
                  : method === 'pix'
                    ? 'O QR Code e o código para copiar estão na janela do Asaas. Assim que o Pix cair, esta tela atualiza sozinha.'
                    : 'Conclua o pagamento na janela do Asaas. Assim que for aprovado, esta tela atualiza sozinha.'}
            </Typography>
            <Button variant="outlined" onClick={reopen} startIcon={<ExternalLink size={16} />}>
              {note === 'waiting' ? 'Mostrar a janela de pagamento' : 'Abrir a janela de novo'}
            </Button>
            <Button size="small" color="inherit" onClick={restart}>Trocar período ou forma de pagamento</Button>
          </Stack>
        ) : (
        <>
        <Typography variant="body2" color="text.secondary">
          Tudo incluído, sem fidelidade. A partir de {money(PRICE_FROM)} por mês no plano anual.
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
                {PLANS.map((p) => (
                  <ToggleButton key={p.months} value={p.months} sx={{ textTransform: 'none', flexDirection: 'column', py: 1, lineHeight: 1.3 }}>
                    <Typography sx={{ fontWeight: 650, fontSize: 14 }}>{p.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{money(p.perMonth).replace(',00', '')}/mês</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 650, color: tokens.success, visibility: p.months === 1 ? 'hidden' : 'visible' }}>
                      -{planDiscountPct(p) || 0}%
                    </Typography>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                {plan.months === 1
                  ? 'Você paga mês a mês.'
                  : `${money(plan.total)} à vista por ${plan.months} meses. Você economiza ${money(planSavings(plan))}.`}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Forma de pagamento</Typography>
              <ToggleButtonGroup exclusive fullWidth size="small" value={method} onChange={(_, v) => v && setMethod(v)} sx={{ mt: 0.5 }} aria-label="Forma de pagamento">
                <ToggleButton value="pix" sx={{ gap: 1, textTransform: 'none', fontWeight: 600 }}><QrCode size={16} /> Pix</ToggleButton>
                <ToggleButton value="card" sx={{ gap: 1, textTransform: 'none', fontWeight: 600 }}><CreditCard size={16} /> Cartão</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <Button variant="contained" size="large" loading={submitting} onClick={pay} startIcon={method === 'pix' ? <QrCode size={18} /> : <CreditCard size={18} />}>
              Pagar {money(plan.total)} {method === 'pix' ? 'com Pix' : 'com cartão'}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 0.75, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <Lock size={13} /> Abre uma janela segura do Asaas por cima desta página · liberação automática
            </Typography>
            {help && (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                Dúvida sobre o pagamento? <a href={help} target="_blank" rel="noopener" style={{ color: tokens.accentText, fontWeight: 600 }}>Fale com a gente</a>
              </Typography>
            )}
          </Stack>
        )}
        </>
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
      <Button size="small" variant="contained" fullWidth onClick={() => setOpen(true)}>Assinar · a partir de {money(PRICE_FROM).replace(',00', '')}/mês</Button>
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

      <SectionCard title="Plano" description={`Mensal ${money(PRICE_MONTHLY)}, semestral ${money(PLANS[1].perMonth)}/mês ou anual ${money(PRICE_FROM)}/mês. Pagar durante o teste não desperdiça os dias restantes.`}>
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
