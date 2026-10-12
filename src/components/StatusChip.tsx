import { Box } from '@mui/material';
import { STATUS_META, type Tone } from '@/lib/proposal';
import type { EffectiveStatus } from '@/types';
import { tokens } from '@/theme/tokens';

export const TONE_COLORS: Record<Tone, { fg: string; bg: string; dot: string }> = {
  neutral: { fg: tokens.textSecondary, bg: tokens.muted, dot: tokens.textTertiary },
  info: { fg: '#1F55C4', bg: tokens.infoSoft, dot: tokens.info },
  warning: { fg: '#8A5A12', bg: tokens.warningSoft, dot: tokens.warning },
  violet: { fg: '#5B40B8', bg: tokens.violetSoft, dot: tokens.violet },
  success: { fg: '#1F6E44', bg: tokens.successSoft, dot: tokens.success },
  error: { fg: '#9E2F29', bg: tokens.errorSoft, dot: tokens.error },
  muted: { fg: tokens.textTertiary, bg: tokens.muted, dot: tokens.borderStrong },
};

/** Etiqueta de status com bolinha de cor (cor nunca é a única pista: sempre tem o texto). */
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
        borderRadius: '999px',
        bgcolor: c.bg,
        color: c.fg,
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
