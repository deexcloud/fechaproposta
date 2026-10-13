import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { Check } from 'lucide-react';
import { BrandMark } from '@/components/common';
import { tokens } from '@/theme/tokens';

const HIGHLIGHTS = [
  'Proposta com a sua marca, pronta em minutos',
  'Aviso quando o cliente abre o link',
  'Aceite com assinatura, no computador ou no celular do cliente',
];

/** Telas de acesso: painel lateral neutro + formulário limpo (estilo shadcn). */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Box component="main" sx={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 5,
          bgcolor: tokens.subtle,
          borderRight: `1px solid ${tokens.border}`,
          backgroundImage: `radial-gradient(${tokens.border} 1px, transparent 1px)`,
          backgroundSize: '22px 22px',
        }}
      >
        <RouterLink to="/" aria-label="Página inicial"><BrandMark /></RouterLink>
        <Box>
          <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.045em', maxWidth: 460 }}>
            Propostas que o cliente <Box component="span" sx={{ color: tokens.primary }}>aprova até pelo celular.</Box>
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 4 }}>
            {HIGHLIGHTS.map((h) => (
              <Stack key={h} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 22, height: 22, borderRadius: '6px', bgcolor: tokens.accentSoft, color: tokens.primary, display: 'grid', placeItems: 'center' }}>
                  <Check size={14} strokeWidth={3} />
                </Box>
                <Typography variant="body2" color="text.secondary">{h}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
        <Typography variant="caption" color="text.secondary">
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
