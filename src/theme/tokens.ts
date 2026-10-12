/**
 * Design tokens do FechaProposta. Claro, com cara de papel: tinta escura
 * para ações principais e o verde-lima da marca ("fecha.") como destaque.
 * Use via theme.palette sempre que possível; aqui ficam os valores crus.
 */
export const tokens = {
  // Superfícies
  background: '#F6F6F2', // fundo do painel (papel)
  surface: '#FFFFFF', // cards
  surfaceElevated: '#FFFFFF', // menus, diálogos
  muted: '#EFF0EA', // trilhas, áreas secundárias
  hover: '#F1F2EC',
  border: '#E3E5DD',
  borderStrong: '#CDD1C5',

  // Texto
  textPrimary: '#141A16',
  textSecondary: '#5C645D',
  textTertiary: '#8A928A',

  // Marca
  ink: '#121915', // botão principal, menu lateral escuro
  inkHover: '#26302A',
  onInk: '#FFFFFF',
  lime: '#C5EB4F', // destaque sobre tinta
  limeSoft: '#EEF8D2',
  limeText: '#4E6B12', // destaque legível sobre branco
  ring: 'rgba(132, 176, 26, 0.45)',

  // Status
  success: '#2F8F5B',
  successSoft: '#E5F4EB',
  warning: '#B7791F',
  warningSoft: '#FBF1DE',
  error: '#C2413A',
  errorSoft: '#FBE7E5',
  info: '#2F6FEB',
  infoSoft: '#E6EEFD',
  violet: '#7357D1',
  violetSoft: '#EEEAFB',

  radius: 8,
  radiusLg: 14,
} as const;

export const shadows = {
  xs: '0 1px 2px rgba(20, 26, 22, 0.05)',
  sm: '0 1px 2px rgba(20, 26, 22, 0.06), 0 1px 3px rgba(20, 26, 22, 0.05)',
  md: '0 4px 12px -2px rgba(20, 26, 22, 0.08), 0 2px 4px -2px rgba(20, 26, 22, 0.05)',
  lg: '0 12px 32px -8px rgba(20, 26, 22, 0.14), 0 4px 8px -4px rgba(20, 26, 22, 0.06)',
  xl: '0 24px 56px -12px rgba(20, 26, 22, 0.22)',
  ring: `0 0 0 3px rgba(132, 176, 26, 0.45)`,
} as const;

export const fontFamily = '"Geist", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const displayFont = '"Instrument Serif", Georgia, "Times New Roman", serif';
export const monoFont = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
