import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, Stack, Typography } from '@mui/material';
import { ArrowRight, Sparkles } from 'lucide-react';
import { BrandMark } from '@/components/common';
import { ProposalDocument } from '@/components/ProposalDocument';
import { money } from '@/lib/format';
import { computeTotals } from '@/lib/proposal';
import { TRIAL_DAYS } from '@/lib/pricing';
import { demoProposal } from './demo';
import { tokens } from '@/theme/tokens';

/** Proposta de exemplo interativa: o visitante sente o que o cliente dele vai ver. */
export function DemoProposalPage() {
  const data = useMemo(demoProposal, []);
  const [selected, setSelected] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const totals = computeTotals(data.items, data.discount, selected, (item, i) => item.id ?? i);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: tokens.muted, pb: { xs: 14, md: 6 } }}>
      <Box sx={{ bgcolor: tokens.ink, color: '#fff', px: 2, py: 1.25 }}>
        <Stack direction="row" spacing={1.5} sx={{ maxWidth: 1180, mx: 'auto', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Sparkles size={16} color={tokens.lime} />
            <Typography variant="body2" noWrap>Exemplo: é assim que o seu cliente recebe a proposta.</Typography>
          </Stack>
          <Button component={RouterLink} to="/criar-conta" size="small" variant="contained" sx={{ bgcolor: tokens.lime, color: tokens.ink, flexShrink: 0, '&:hover': { bgcolor: '#B4DA3E' } }}>
            Criar a minha
          </Button>
        </Stack>
      </Box>

      <Box sx={{ maxWidth: 1180, mx: 'auto', px: { xs: 0, sm: 3 }, pt: { xs: 0, sm: 4 }, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' }, alignItems: 'start' }}>
        <Box>
          {tried && (
            <Alert severity="success" sx={{ m: { xs: 2, sm: 0 }, mb: { sm: 2 } }} action={<Button component={RouterLink} to="/criar-conta" color="inherit" size="small">Testar grátis</Button>}>
              Neste ponto o cliente assinaria e você receberia o aceite no painel.
            </Alert>
          )}
          <ProposalDocument data={data} selectable selected={selected} onToggleOptional={toggle} />
        </Box>
        <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 24 }}>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="body2" color="text.secondary">Total</Typography>
            <Typography sx={{ fontWeight: 750, fontSize: 30, letterSpacing: '-0.03em' }}>{money(totals.withSelected)}</Typography>
            <Typography variant="caption" color="text.secondary">Marque os opcionais e veja o total mudar.</Typography>
            <Stack spacing={1} sx={{ mt: 2.5 }}>
              <Button size="large" variant="contained" onClick={() => setTried(true)} sx={{ bgcolor: '#1F4E3D', '&:hover': { bgcolor: '#173D30' } }}>Aceitar proposta</Button>
              <Button size="large" variant="outlined" onClick={() => setTried(true)}>Pedir ajuste</Button>
            </Stack>
          </Card>
          <Card sx={{ p: 2.5, mt: 2, bgcolor: tokens.ink, color: '#fff', borderColor: tokens.ink }}>
            <BrandMark size="small" inverted />
            <Typography variant="body2" sx={{ mt: 1.5, color: 'rgba(255,255,255,.75)' }}>
              Crie propostas assim com a sua marca. {TRIAL_DAYS} dias grátis, sem cartão.
            </Typography>
            <Button component={RouterLink} to="/criar-conta" fullWidth endIcon={<ArrowRight />} sx={{ mt: 2, bgcolor: tokens.lime, color: tokens.ink, '&:hover': { bgcolor: '#B4DA3E' } }}>
              Começar agora
            </Button>
          </Card>
        </Box>
      </Box>

      <Box sx={{ display: { xs: 'block', md: 'none' }, position: 'fixed', left: 0, right: 0, bottom: 0, bgcolor: '#fff', borderTop: `1px solid ${tokens.border}`, px: 2, pt: 1.25, pb: 'calc(12px + env(safe-area-inset-bottom))' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="caption" color="text.secondary">Total</Typography>
            <Typography sx={{ fontWeight: 750, fontSize: 20 }}>{money(totals.withSelected)}</Typography>
          </Box>
          <Button size="large" variant="contained" onClick={() => setTried(true)} sx={{ bgcolor: '#1F4E3D', px: 3, '&:hover': { bgcolor: '#173D30' } }}>Aceitar</Button>
        </Stack>
      </Box>
    </Box>
  );
}
