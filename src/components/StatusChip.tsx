import { Box } from '@mui/material';
import { STATUS_META, type Tone } from '@/lib/proposal';
import type { EffectiveStatus } from '@/types';
import { tokens } from '@/theme/tokens';

export const TONE_COLORS: Record<Tone, { fg: string; bg: string; dot: string }> = {
  neutral: { fg: tokens.textSecondary, bg: tokens.muted, dot: tokens.textTertiary },
  info: { fg: '#1D4ED8', bg: tokens.infoSoft, dot: tokens.info },
  warning: { fg: '#B45309', bg: tokens.warningSoft, dot: tokens.warning },
  violet: { fg: tokens.accentText, bg: tokens.accentSoft, dot: tokens.primary },
  success: { fg: '#15803D', bg: tokens.successSoft, dot: tokens.success },
  error: { fg: '#B91C1C', bg: tokens.errorSoft, dot: tokens.error },
  muted: { fg: tokens.textTertiary, bg: tokens.muted, dot: tokens.borderStrong },
};

/** Etiqueta de status: contorno neutro e só a bolinha colorida (cor nunca é a única pista). */
export function StatusChip({ status, size = 'medium' }: { status: EffectiveStatus; size?: 'small' | 'medium' }) {
  const meta = STATUS_META[status];
  const c = TONE_COLORS[meta.tone];
  return (
    <Box
      component="span"
      title={meta.hint}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: size === 'small' ? 22 : 26,
        px: size === 'small' ? 1 : 1.25,
        borderRadius: '6px',
        border: `1px solid ${tokens.border}`,
        bgcolor: tokens.surface,
        color: tokens.textPrimary,
        fontSize: size === 'small' ? 11.5 : 12.5,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.dot }} />
      {meta.label}
    </Box>
  );
}
