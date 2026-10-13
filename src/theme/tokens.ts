/**
 * Design tokens do FechaProposta.
 *
 * O sistema é escuro: preto levemente arroxeado, superfícies em camadas e UMA cor de
 * destaque (violeta → índigo, em degradê) para ações e seleção. Cores de status
 * aparecem só em detalhes (pontos, textos pequenos), nunca em blocos grandes.
 *
 * A proposta que o cliente final recebe continua clara (é um documento, vai para o PDF
 * e carrega a marca de quem vende, não a nossa). Por isso cada cor existe em duas
 * versões e `tokens` aponta para variáveis CSS: dentro de `.fp-light` elas viram claras.
 */

type Palette = Record<
  | 'background' | 'surface' | 'surfaceElevated' | 'subtle' | 'muted' | 'hover' | 'border' | 'borderStrong'
  | 'textPrimary' | 'textSecondary' | 'textTertiary'
  | 'ink' | 'inkHover' | 'onInk'
  | 'primary' | 'primaryHover' | 'onPrimary' | 'accent' | 'accentSoft' | 'accentText' | 'ring'
  | 'success' | 'successSoft' | 'successText' | 'warning' | 'warningSoft' | 'warningText'
  | 'error' | 'errorSoft' | 'errorText' | 'info' | 'infoSoft' | 'infoText'
  | 'violet' | 'violetSoft' | 'glass' | 'glassStrong' | 'backdrop',
  string
>;

const dark: Palette = {
  // Superfícies: preto com um fio de violeta, em camadas
  background: '#07060B',
  surface: '#0F0E15',
  surfaceElevated: '#16141F',
  subtle: '#0B0A10',
  muted: '#1B1925',
  hover: '#1E1C29',
  border: '#26232F',
  borderStrong: '#3A3648',

  // Texto (todos com contraste AA sobre surface)
  textPrimary: '#F4F3F8',
  textSecondary: '#A9A6B8',
  textTertiary: '#827E96',

  // "Tinta": o neutro de maior contraste (avatar, tooltip)
  ink: '#ECEAF4',
  inkHover: '#FFFFFF',
  onInk: '#0B0A10',

  // Destaque: violeta corporativo
  primary: '#6D4CF5',
  primaryHover: '#7C5FFF',
  onPrimary: '#FFFFFF',
  accent: '#8B72FF',
  accentSoft: 'rgba(124, 95, 255, 0.14)',
  accentText: '#B9A9FF',
  ring: 'rgba(124, 95, 255, 0.45)',

  // Status
  success: '#22C55E',
  successSoft: 'rgba(34, 197, 94, 0.12)',
  successText: '#4ADE80',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.12)',
  warningText: '#FBBF24',
  error: '#F05252',
  errorSoft: 'rgba(240, 82, 82, 0.12)',
  errorText: '#F87171',
  info: '#60A5FA',
  infoSoft: 'rgba(96, 165, 250, 0.12)',
  infoText: '#93C5FD',
  violet: '#8B72FF',
  violetSoft: 'rgba(124, 95, 255, 0.14)',

  // Barras fixas com desfoque
  glass: 'rgba(11, 10, 16, 0.72)',
  glassStrong: 'rgba(11, 10, 16, 0.9)',
  backdrop: 'rgba(3, 2, 8, 0.7)',
};

const light: Palette = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  subtle: '#FAFAFA',
  muted: '#F4F4F5',
  hover: '#F4F4F5',
  border: '#E4E4E7',
  borderStrong: '#D4D4D8',

  textPrimary: '#09090B',
  textSecondary: '#52525B',
  textTertiary: '#71717A',

  ink: '#18181B',
  inkHover: '#27272A',
  onInk: '#FFFFFF',

  primary: '#6243F0',
  primaryHover: '#5434E0',
  onPrimary: '#FFFFFF',
  accent: '#6243F0',
  accentSoft: '#F1EEFE',
  accentText: '#4F33D6',
  ring: 'rgba(9, 9, 11, 0.22)',

  success: '#16A34A',
  successSoft: '#F0FDF4',
  successText: '#15803D',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  warningText: '#B45309',
  error: '#DC2626',
  errorSoft: '#FEF2F2',
  errorText: '#B91C1C',
  info: '#2563EB',
  infoSoft: '#EFF6FF',
  infoText: '#1D4ED8',
  violet: '#6243F0',
  violetSoft: '#F1EEFE',

  glass: 'rgba(255, 255, 255, 0.85)',
  glassStrong: 'rgba(255, 255, 255, 0.94)',
  backdrop: 'rgba(9, 9, 11, 0.45)',
};

/** Valores reais, para quem não aceita variável CSS (canvas, contas de contraste, paleta do MUI). */
export const palettes = { dark, light } as const;

const cssVar = (key: string) => `--fp-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/** Cores para usar em `sx`: resolvem para escuro no app e para claro dentro de `.fp-light`. */
export const tokens = {
  ...(Object.fromEntries(Object.keys(dark).map((k) => [k, `var(${cssVar(k)})`])) as Palette),
  radius: 8,
  radiusLg: 12,
};

const shadowValues = {
  dark: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.4)',
    sm: '0 1px 2px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.3)',
    md: '0 8px 20px -6px rgba(0, 0, 0, 0.55), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
    lg: '0 18px 40px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.03)',
    xl: '0 30px 70px -16px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.04)',
    glow: '0 10px 40px -10px rgba(109, 76, 245, 0.55)',
  },
  light: {
    xs: '0 1px 2px rgba(9, 9, 11, 0.04)',
    sm: '0 1px 2px rgba(9, 9, 11, 0.05), 0 1px 3px rgba(9, 9, 11, 0.04)',
    md: '0 4px 12px -2px rgba(9, 9, 11, 0.07), 0 2px 4px -2px rgba(9, 9, 11, 0.04)',
    lg: '0 12px 32px -8px rgba(9, 9, 11, 0.12), 0 4px 8px -4px rgba(9, 9, 11, 0.04)',
    xl: '0 24px 56px -12px rgba(9, 9, 11, 0.18)',
    glow: '0 8px 24px -10px rgba(98, 67, 240, 0.45)',
  },
};

export const shadows = {
  ...(Object.fromEntries(Object.keys(shadowValues.dark).map((k) => [k, `var(--fp-shadow-${k})`])) as Record<keyof typeof shadowValues.dark, string>),
  ring: `0 0 0 3px ${tokens.ring}`,
};

/** Degradês da marca: violeta → índigo, sempre discretos. */
export const gradients = {
  /** Botão principal e logo. */
  primary: 'linear-gradient(135deg, #8466FF 0%, #6D4CF5 48%, #4F46E5 100%)',
  primaryHover: 'linear-gradient(135deg, #9479FF 0%, #7C5FFF 48%, #5B54F0 100%)',
  /** Texto em destaque (títulos). */
  text: 'linear-gradient(100deg, #C4B5FF 0%, #8B72FF 45%, #6E7BFF 100%)',
  /** Fundo da página: preto com brilhos violeta/índigo nos cantos. */
  page: 'radial-gradient(1100px 520px at 0% -8%, rgba(109, 76, 245, 0.16), transparent 62%), radial-gradient(900px 480px at 100% 0%, rgba(79, 70, 229, 0.10), transparent 60%)',
  /** Superfície de card: um véu claro descendo, dá profundidade sem cor. */
  surface: 'linear-gradient(180deg, rgba(255, 255, 255, 0.025) 0%, rgba(255, 255, 255, 0) 60%)',
  /** Blocos de chamada (CTA final, destaque de preço). */
  panel: 'radial-gradient(120% 140% at 0% 0%, rgba(132, 102, 255, 0.35) 0%, rgba(79, 70, 229, 0.18) 40%, rgba(15, 14, 21, 0) 75%), #12101B',
  /** Borda luminosa (usar como background de um wrapper com padding 1px). */
  border: 'linear-gradient(135deg, rgba(164, 140, 255, 0.55), rgba(79, 70, 229, 0.15) 50%, rgba(255, 255, 255, 0.06))',
} as const;

const toVars = (p: Palette, s: Record<string, string>) => ({
  ...Object.fromEntries(Object.entries(p).map(([k, v]) => [cssVar(k), v])),
  ...Object.fromEntries(Object.entries(s).map(([k, v]) => [`--fp-shadow-${k}`, v])),
});

/** Variáveis CSS: escuro na raiz, claro dentro de `.fp-light`. */
export const cssVariables = {
  ':root': { ...toVars(dark, shadowValues.dark), colorScheme: 'dark' },
  '.fp-light': { ...toVars(light, shadowValues.light), colorScheme: 'light' },
};

export const fontFamily = '"Geist", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
/** Títulos grandes: a mesma Geist, mais pesada (sem fonte serifada). */
export const displayFont = fontFamily;
/** Assinatura digitada: cursiva, para parecer escrita à mão. */
export const signatureFont = '"Instrument Serif", Georgia, serif';
export const monoFont = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
