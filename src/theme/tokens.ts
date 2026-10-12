/**
 * Design tokens do FechaProposta, no estilo shadcn/ui: base neutra (zinc),
 * bordas finas e UMA cor de destaque (violeta) para ações e seleção.
 * Cores de status aparecem só em detalhes (pontos), nunca em blocos grandes.
 */
export const tokens = {
  // Superfícies
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  subtle: '#FAFAFA', // zinc-50: fundo de áreas secundárias
  muted: '#F4F4F5', // zinc-100
  hover: '#F4F4F5',
  border: '#E4E4E7', // zinc-200
  borderStrong: '#D4D4D8', // zinc-300

  // Texto
  textPrimary: '#09090B', // zinc-950
  textSecondary: '#52525B', // zinc-600
  textTertiary: '#A1A1AA', // zinc-400

  // Neutro escuro (texto forte, avatar, assinatura)
  ink: '#18181B', // zinc-900
  inkHover: '#27272A',
  onInk: '#FFFFFF',

  // Destaque único: violeta
  primary: '#6243F0',
  primaryHover: '#5434E0',
  onPrimary: '#FFFFFF',
  accent: '#6243F0',
  accentSoft: '#F1EEFE',
  accentText: '#4F33D6',
  ring: 'rgba(98, 67, 240, 0.28)',

  // Status (só em pontos e textos pequenos)
  success: '#16A34A',
  successSoft: '#F0FDF4',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  error: '#DC2626',
  errorSoft: '#FEF2F2',
  info: '#2563EB',
  infoSoft: '#EFF6FF',
  violet: '#6243F0',
  violetSoft: '#F1EEFE',

  radius: 8,
  radiusLg: 12,
} as const;

export const shadows = {
  xs: '0 1px 2px rgba(9, 9, 11, 0.04)',
  sm: '0 1px 2px rgba(9, 9, 11, 0.05), 0 1px 3px rgba(9, 9, 11, 0.04)',
  md: '0 4px 12px -2px rgba(9, 9, 11, 0.07), 0 2px 4px -2px rgba(9, 9, 11, 0.04)',
  lg: '0 12px 32px -8px rgba(9, 9, 11, 0.12), 0 4px 8px -4px rgba(9, 9, 11, 0.04)',
  xl: '0 24px 56px -12px rgba(9, 9, 11, 0.18)',
  ring: '0 0 0 3px rgba(98, 67, 240, 0.28)',
} as const;

export const fontFamily = '"Geist", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
/** Títulos grandes: a mesma Geist, mais pesada (sem fonte serifada). */
export const displayFont = fontFamily;
/** Assinatura digitada: cursiva, para parecer escrita à mão. */
export const signatureFont = '"Instrument Serif", Georgia, serif';
export const monoFont = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
