import type { ReactNode } from 'react';
import { Avatar, Box, Card, Skeleton, Stack, Typography } from '@mui/material';
import { initials } from '@/lib/format';
import type { EventTone } from '@/lib/events';
import { TONE_COLORS } from './StatusChip';
import { tokens } from '@/theme/tokens';

/** Número de destaque do painel. */
export function StatCard({ label, value, hint, icon, loading }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; loading?: boolean }) {
  return (
    <Card sx={{ p: 2.25, minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ fontWeight: 550, minWidth: 0 }}>{label}</Typography>
        {icon && <Box sx={{ color: tokens.textTertiary, display: { xs: 'none', sm: 'flex' }, flexShrink: 0, '& svg': { width: 17, height: 17 } }}>{icon}</Box>}
      </Stack>
      {loading ? (
        <Skeleton variant="text" width="60%" sx={{ fontSize: 30 }} />
      ) : (
        <Typography sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 700, letterSpacing: '-0.03em', mt: 0.75, fontFeatureSettings: '"tnum"' }} noWrap>
          {value}
        </Typography>
      )}
      {hint && <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>{hint}</Typography>}
    </Card>
  );
}

const AVATAR_COLORS = ['#E6EEFD', '#EEEAFB', '#FBF1DE', '#E5F4EB', '#FBE7E5', '#EEF8D2'];

/** Avatar com iniciais e cor estável por nome. */
export function NameAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return (
    <Avatar sx={{ width: size, height: size, bgcolor: AVATAR_COLORS[hash % AVATAR_COLORS.length], color: tokens.textPrimary, fontSize: size * 0.36, fontWeight: 650 }}>
      {initials(name)}
    </Avatar>
  );
}

/** Bolinha colorida da linha do tempo. */
export function ToneDot({ tone, size = 8 }: { tone: EventTone; size?: number }) {
  return <Box component="span" sx={{ width: size, height: size, borderRadius: '50%', bgcolor: TONE_COLORS[tone].dot, flexShrink: 0, display: 'inline-block' }} />;
}

/** Barra horizontal simples (funil). */
export function Bar({ value, max, color = tokens.primary }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(value > 0 ? 3 : 0, (value / max) * 100) : 0;
  return (
    <Box sx={{ height: 8, borderRadius: 4, bgcolor: tokens.muted, overflow: 'hidden' }}>
      <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: 4, transition: 'width .5s cubic-bezier(.2,.7,.2,1)' }} />
    </Box>
  );
}
