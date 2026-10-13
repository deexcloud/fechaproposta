import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, Slider, Stack, Typography } from '@mui/material';
import { ArrowRight, Check, X } from 'lucide-react';
import { money, moneyShort } from '@/lib/format';
import { PRICE_MONTHLY } from '@/lib/pricing';
import { shadows, tokens } from '@/theme/tokens';

const BEFORE = [
  'PDF perdido no meio da conversa do WhatsApp',
  '"Será que ele viu?" e nenhuma resposta',
  'Cliente pede desconto porque não entendeu o valor',
  'Aprovação por "ok" na mensagem, sem registro',
  'Proposta refeita do zero a cada cliente',
];
const AFTER = [
  'Link com a sua marca, que abre no computador ou no celular',
  'Aviso de quando o cliente abriu, e quantas vezes',
  'Escopo, prazo e extras explicados: o valor fica claro',
  'Aceite com assinatura, data e comprovante',
  'Modelos e catálogo: a próxima sai em minutos',
];

/** O jeito de hoje (PDF no WhatsApp) contra o FechaProposta. */
export function BeforeAfter() {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      <Card sx={{ p: { xs: 2.5, sm: 3.5 }, bgcolor: tokens.subtle, boxShadow: 'none' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.textTertiary }}>Hoje</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 20, mt: 0.5, mb: 2.5, letterSpacing: '-0.02em' }}>PDF no WhatsApp e torcida</Typography>
        <Stack spacing={1.5}>
          {BEFORE.map((t) => (
            <Stack key={t} direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
              <Box sx={{ mt: 0.25, color: tokens.textTertiary, display: 'flex' }}><X size={17} strokeWidth={2.5} /></Box>
              <Typography sx={{ color: tokens.textSecondary }}>{t}</Typography>
            </Stack>
          ))}
        </Stack>
      </Card>
      <Card sx={{ p: { xs: 2.5, sm: 3.5 }, borderColor: tokens.primary, borderWidth: 1.5, boxShadow: shadows.md }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.primary }}>Com o FechaProposta</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 20, mt: 0.5, mb: 2.5, letterSpacing: '-0.02em' }}>Proposta que conduz até o sim</Typography>
        <Stack spacing={1.5}>
          {AFTER.map((t) => (
            <Stack key={t} direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
              <Box sx={{ mt: 0.25, color: tokens.primary, display: 'flex' }}><Check size={17} strokeWidth={3} /></Box>
              <Typography>{t}</Typography>
            </Stack>
          ))}
        </Stack>
      </Card>
    </Box>
  );
}

/** Quantas vezes a assinatura se paga com um fechamento a mais por mês. */
export function RoiCalculator({ startTo, ctaLabel }: { startTo: string; ctaLabel: string }) {
  const [ticket, setTicket] = useState(2500);
  const [extra, setExtra] = useState(1);
  const gain = ticket * extra;
  const times = Math.floor(gain / PRICE_MONTHLY);

  return (
    <Card sx={{ p: { xs: 2.5, sm: 4 } }}>
      <Box sx={{ display: 'grid', gap: { xs: 4, md: 6 }, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, alignItems: 'center' }}>
        <Stack spacing={3.5}>
          <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography sx={{ fontWeight: 600 }}>Valor médio de uma proposta sua</Typography>
              <Typography sx={{ fontWeight: 750, fontSize: 20, fontFeatureSettings: '"tnum"' }}>{moneyShort(ticket)}</Typography>
            </Stack>
            <Slider value={ticket} min={300} max={20000} step={100} onChange={(_, v) => setTicket(v as number)} aria-label="Valor médio da proposta" sx={{ mt: 1 }} />
          </Box>
          <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography sx={{ fontWeight: 600 }}>Propostas a mais fechadas por mês</Typography>
              <Typography sx={{ fontWeight: 750, fontSize: 20 }}>{extra}</Typography>
            </Stack>
            <Slider value={extra} min={1} max={5} step={1} marks onChange={(_, v) => setExtra(v as number)} aria-label="Propostas a mais por mês" sx={{ mt: 1 }} />
            <Typography variant="caption" color="text.secondary">Com lembrete no momento certo e extras opcionais, uma a mais já faz diferença.</Typography>
          </Box>
        </Stack>
        <Box sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: '12px', border: `1px solid ${tokens.border}`, bgcolor: tokens.subtle }}>
          <Typography color="text.secondary">A mais no seu caixa, por mês</Typography>
          <Typography sx={{ fontSize: { xs: 44, sm: 54 }, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1.05, mt: 0.5, color: tokens.primary, fontFeatureSettings: '"tnum"' }}>
            {moneyShort(gain)}
          </Typography>
          <Typography sx={{ mt: 1.5, color: tokens.textSecondary }}>
            {times >= 2 ? (
              <>A assinatura de {money(PRICE_MONTHLY)} se paga <Box component="strong" sx={{ color: tokens.textPrimary }}>{times} vezes</Box>.</>
            ) : (
              <>Já cobre a assinatura de {money(PRICE_MONTHLY)} no mês.</>
            )}
          </Typography>
          <Button component={RouterLink} to={startTo} variant="contained" endIcon={<ArrowRight />} sx={{ mt: 3 }}>
            {ctaLabel}
          </Button>
        </Box>
      </Box>
    </Card>
  );
}

/** Chamada fixa no rodapé do celular, depois que a pessoa passa da abertura. */
export function MobileStickyCta({ startTo, ctaLabel, hint }: { startTo: string; ctaLabel: string; hint?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <Box
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        zIndex: 30,
        p: 1,
        borderRadius: '14px',
        bgcolor: 'rgba(255,255,255,.92)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${tokens.border}`,
        boxShadow: shadows.lg,
        transform: visible ? 'none' : 'translateY(160%)',
        transition: 'transform .3s cubic-bezier(.2,.7,.2,1)',
      }}
    >
      <Button component={RouterLink} to={startTo} fullWidth size="large" variant="contained" endIcon={<ArrowRight />} sx={{ minHeight: 50, fontSize: 16 }}>
        {ctaLabel}
      </Button>
      {hint && (
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 0.5, color: tokens.textSecondary }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}
