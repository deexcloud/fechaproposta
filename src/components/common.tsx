import type { ReactNode } from 'react';
import { Alert, Box, Button, Card, Skeleton, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { tokens } from '@/theme/tokens';

/** Logo "fecha." — tinta escura e o ponto verde-lima da marca. */
export function BrandMark({ size = 'medium', inverted = false }: { size?: 'small' | 'medium' | 'large'; inverted?: boolean }) {
  const font = size === 'small' ? 19 : size === 'large' ? 30 : 23;
  const mark = size === 'small' ? 24 : size === 'large' ? 36 : 28;
  return (
    // inline-flex: impede que o sublinhado do link em volta atravesse a marca.
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', display: 'inline-flex', verticalAlign: 'middle' }} aria-label="FechaProposta">
      <Box
        aria-hidden
        sx={{
          width: mark,
          height: mark,
          borderRadius: '8px',
          bgcolor: inverted ? tokens.lime : tokens.ink,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Box component="svg" viewBox="0 0 24 24" sx={{ width: '62%', height: '62%' }}>
          <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke={inverted ? tokens.ink : tokens.lime} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </Box>
      </Box>
      <Typography component="span" sx={{ fontWeight: 700, fontSize: font, letterSpacing: '-0.045em', lineHeight: 1, color: inverted ? '#fff' : tokens.textPrimary }}>
        fecha<Box component="span" sx={{ color: inverted ? tokens.lime : tokens.limeText }}>.</Box>
      </Typography>
    </Stack>
  );
}

/** Carregamento de tela inteira (antes de saber quem é o usuário). */
export function BrandLoader({ label = 'Carregando…' }: { label?: string }) {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }} role="status" aria-label={label} aria-live="polite">
      <Stack spacing={2} sx={{ alignItems: 'center' }}>
        <Box sx={{ position: 'relative' }}>
          <Box aria-hidden sx={{ position: 'absolute', inset: 0, borderRadius: '8px', bgcolor: tokens.lime, animation: 'fp-pulse 1.4s ease-out infinite' }} />
          <Box sx={{ position: 'relative' }}><BrandMark size="large" /></Box>
        </Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </Stack>
    </Box>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert severity="error" action={onRetry && <Button color="inherit" size="small" onClick={onRetry}>Tentar de novo</Button>}>
      {message}
    </Alert>
  );
}

/** Cabeçalho de página: título, descrição e ações à direita. */
export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'flex-end' }, mb: 3 }}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && <Typography variant="overline" color="text.secondary" component="div">{eyebrow}</Typography>}
        <Typography variant="h1" component="h1">{title}</Typography>
        {subtitle && <Typography component="div" variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{subtitle}</Typography>}
      </Box>
      {actions && <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>{actions}</Stack>}
    </Stack>
  );
}

/** Estado vazio que ensina o próximo passo em vez de só dizer "nada aqui". */
export function EmptyState({ icon, title, description, action, compact }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: compact ? 4 : 8, px: 2 }}>
      {icon && (
        <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: tokens.limeSoft, color: tokens.limeText, display: 'grid', placeItems: 'center', '& svg': { width: 22, height: 22 } }}>
          {icon}
        </Box>
      )}
      <Typography variant="h3" component="p">{title}</Typography>
      {description && <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>{description}</Typography>}
      {action && <Box sx={{ pt: 1 }}>{action}</Box>}
    </Stack>
  );
}

/** Esqueleto genérico enquanto carrega uma lista. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Stack spacing={1} role="status" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={64} />
      ))}
    </Stack>
  );
}

/** Card com título de seção. */
export function SectionCard({ title, description, action, children, sx, padding = 2.5 }: { title?: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode; sx?: SxProps<Theme>; padding?: number }) {
  return (
    <Card sx={sx}>
      {(title || action) && (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between', px: padding, pt: padding, pb: 0 }}>
          <Box sx={{ minWidth: 0 }}>
            {title && <Typography variant="h3" component="h2">{title}</Typography>}
            {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{description}</Typography>}
          </Box>
          {action}
        </Stack>
      )}
      <Box sx={{ p: padding }}>{children}</Box>
    </Card>
  );
}

/** Tela exibida quando o .env.local ainda não tem os dados do Supabase. */
export function ConfigMissingScreen() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Stack spacing={3} sx={{ maxWidth: 520 }}>
        <BrandMark />
        <Typography variant="h2">Falta conectar o banco de dados</Typography>
        <Typography color="text.secondary">
          Crie o arquivo <code>.env.local</code> na raiz do projeto (use o <code>.env.example</code> como modelo)
          com a URL e a chave pública (anon) do seu projeto Supabase e reinicie o servidor.
        </Typography>
      </Stack>
    </Box>
  );
}

/** Texto em fonte monoespaçada (códigos, links). */
export function Mono({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box component="span" sx={{ fontFamily: '"Geist Mono", ui-monospace, monospace', fontSize: '0.8125em', letterSpacing: '-0.01em', ...sx }}>
      {children}
    </Box>
  );
}
