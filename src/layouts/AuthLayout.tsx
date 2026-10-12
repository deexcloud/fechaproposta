import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { Check } from 'lucide-react';
import { BrandMark } from '@/components/common';
import { displayFont, tokens } from '@/theme/tokens';

const HIGHLIGHTS = [
  'Proposta bonita com a sua marca, pronta em minutos',
  'Aviso quando o cliente abre o link',
  'Aceite com assinatura, direto no celular do cliente',
];

/** Telas de acesso: painel escuro da marca à esquerda + formulário limpo. */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Box component="main" sx={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 5,
          bgcolor: tokens.ink,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box aria-hidden sx={{ position: 'absolute', width: 520, height: 520, borderRadius: '50%', right: -180, bottom: -220, background: `radial-gradient(closest-side, rgba(197,235,79,.22), transparent)` }} />
        <RouterLink to="/" aria-label="Página inicial"><BrandMark inverted /></RouterLink>
        <Box sx={{ position: 'relative' }}>
          <Typography sx={{ fontFamily: displayFont, fontSize: '3rem', lineHeight: 1.05, maxWidth: 480 }}>
            Seu trabalho merece um <Box component="em" sx={{ color: tokens.lime }}>sim.</Box>
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 4 }}>
            {HIGHLIGHTS.map((h) => (
              <Stack key={h} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 22, height: 22, borderRadius: '6px', bgcolor: tokens.lime, color: tokens.ink, display: 'grid', placeItems: 'center' }}>
                  <Check size={14} strokeWidth={3} />
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.78)' }}>{h}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.5)', position: 'relative' }}>
          Para agências, freelancers, consultorias e prestadores de serviço.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'center', px: 2, py: { xs: 4, sm: 6 } }}>
        <Stack spacing={3} sx={{ width: '100%', maxWidth: 400 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center' }}>
            <RouterLink to="/" aria-label="Página inicial"><BrandMark /></RouterLink>
          </Box>
          <Card className="fp-fade-up">
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Typography variant="h2" component="h1">{title}</Typography>
              {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{subtitle}</Typography>}
              <Box sx={{ mt: 3 }}>{children}</Box>
            </CardContent>
          </Card>
          {footer && <Box sx={{ textAlign: 'center', fontSize: '0.875rem' }}>{footer}</Box>}
        </Stack>
      </Box>
    </Box>
  );
}
