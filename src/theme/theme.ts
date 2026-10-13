import { alpha, createTheme } from '@mui/material/styles';
import { cssVariables, fontFamily, gradients, palettes, shadows, tokens } from './tokens';

const focusRing = { outline: 'none', boxShadow: shadows.ring };

/** Animações curtas e impressão (PDF pelo navegador). */
const globalCss = {
  '@keyframes fp-fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
  '@keyframes fp-pulse': { '0%': { transform: 'scale(1)', opacity: 0.6 }, '100%': { transform: 'scale(2.4)', opacity: 0 } },
  '@keyframes fp-float': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
  '@keyframes fp-pop': { from: { opacity: 0, transform: 'translateY(10px) scale(.94)' }, to: { opacity: 1, transform: 'none' } },
  '@keyframes fp-in-left': { from: { opacity: 0, transform: 'translateX(-48px)' }, to: { opacity: 1, transform: 'none' } },
  '@keyframes fp-in-right': { from: { opacity: 0, transform: 'translateX(48px)' }, to: { opacity: 1, transform: 'none' } },
  '.fp-fade-up': { animation: 'fp-fade-up .35s cubic-bezier(.2,.7,.2,1) both' },
  // Revelar ao rolar (componente Reveal): só opacidade e transform, que o navegador anima sem custo.
  '[data-reveal]': {
    opacity: 0,
    transition: 'opacity .7s cubic-bezier(.2,.7,.2,1), transform .8s cubic-bezier(.2,.7,.2,1)',
    transitionDelay: 'var(--fp-reveal-delay, 0ms)',
  },
  '[data-reveal="up"]': { transform: 'translateY(28px)' },
  '[data-reveal="left"]': { transform: 'translateX(-40px)' },
  '[data-reveal="right"]': { transform: 'translateX(40px)' },
  '[data-reveal="scale"]': { transform: 'scale(.96)' },
  '[data-reveal][data-visible]': { opacity: 1, transform: 'none' },
  '@media (prefers-reduced-motion: reduce)': {
    '*, *::before, *::after': { animationDuration: '0.01ms !important', animationIterationCount: '1 !important', transitionDuration: '0.01ms !important' },
    '[data-reveal]': { opacity: 1, transform: 'none' },
  },
  '@media print': {
    body: { backgroundColor: '#fff !important', backgroundImage: 'none !important', color: '#09090B' },
    '.no-print': { display: 'none !important' },
    '.print-plain': { boxShadow: 'none !important', border: 'none !important', margin: '0 !important', padding: '0 !important', maxWidth: 'none !important' },
    '@page': { margin: '14mm' },
  },
};

type Mode = 'dark' | 'light';

/**
 * O mesmo tema nas duas versões. Os estilos usam `tokens` (variáveis CSS), então mudam
 * sozinhos dentro de `.fp-light`; a paleta do MUI precisa de valores reais, por isso `p`.
 */
function makeTheme(mode: Mode) {
  const p = palettes[mode];
  const dark = mode === 'dark';
  // Portais (diálogos, menus) saem da árvore: no tema claro levam o escopo junto.
  const lightScope = dark ? {} : { className: 'fp-light' };
  return createTheme({
  palette: {
    mode,
    primary: { main: p.primary, dark: p.primaryHover, light: p.accent, contrastText: p.onPrimary },
    secondary: { main: p.ink, contrastText: p.onInk },
    success: { main: p.success, contrastText: '#fff' },
    warning: { main: p.warning, contrastText: '#fff' },
    error: { main: p.error },
    info: { main: p.info },
    background: { default: p.background, paper: p.surface },
    text: { primary: p.textPrimary, secondary: p.textSecondary, disabled: p.textTertiary },
    divider: p.border,
    action: { hover: p.hover, selected: p.muted },
  },
  shape: { borderRadius: tokens.radius },
  typography: {
    fontFamily,
    fontSize: 14,
    h1: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.2 },
    h2: { fontSize: '1.375rem', fontWeight: 650, letterSpacing: '-0.025em', lineHeight: 1.25 },
    h3: { fontSize: '1.0625rem', fontWeight: 600, letterSpacing: '-0.015em' },
    h4: { fontSize: '0.9375rem', fontWeight: 600 },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.55 },
    caption: { fontSize: '0.75rem' },
    overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 550, fontSize: '0.875rem' },
  },
  components: {
    // Opção escolhida em violeta: fica óbvio qual está ativa (período, Pix/cartão…).
    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: tokens.textSecondary,
          '&.Mui-selected, &.Mui-selected:hover': {
            color: tokens.accentText,
            backgroundColor: tokens.accentSoft,
            boxShadow: `inset 0 0 0 1.5px ${tokens.primary}`,
            zIndex: 1,
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        ...cssVariables,
        body: {
          backgroundColor: tokens.background,
          // Preto com brilho violeta/índigo nos cantos: o degradê do sistema, sem cansar a vista.
          backgroundImage: dark ? gradients.page : 'none',
          backgroundAttachment: 'fixed',
          color: tokens.textPrimary,
          WebkitFontSmoothing: 'antialiased',
          fontFeatureSettings: '"ss01"',
        },
        '::selection': { background: alpha(p.primary, dark ? 0.45 : 0.2) },
        // Barra de rolagem discreta.
        '*': { scrollbarColor: `${tokens.borderStrong} transparent` },
        a: { color: 'inherit' },
        ...globalCss,
      },
    },

    MuiButtonBase: { defaultProps: { disableRipple: true } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 40,
          paddingInline: 16,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          borderRadius: tokens.radius,
          transition: 'background-color .15s ease, color .15s ease, border-color .15s ease, box-shadow .2s ease, transform .1s ease',
          '&.Mui-focusVisible': focusRing,
          '&:active': { transform: 'scale(0.98)' },
          '& .MuiButton-startIcon > svg, & .MuiButton-endIcon > svg': { width: 17, height: 17 },
        },
        sizeSmall: { minHeight: 32, paddingInline: 12, fontSize: '0.8125rem' },
        sizeLarge: { minHeight: 48, paddingInline: 22, fontSize: '0.9375rem' },
        outlined: {
          borderColor: tokens.border,
          backgroundColor: tokens.surface,
          boxShadow: shadows.xs,
          '&:hover': { backgroundColor: tokens.hover, borderColor: tokens.borderStrong },
        },
        text: { '&:hover': { backgroundColor: tokens.hover } },
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            // No escuro, degradê violeta → índigo. No claro (páginas do cliente) os botões levam
            // a cor da marca de quem vende via bgcolor, e um degradê por cima a esconderia.
            backgroundImage: dark ? gradients.primary : 'none',
            boxShadow: `inset 0 1px 0 rgba(255,255,255,.18), 0 1px 2px ${alpha(p.primary, 0.35)}, 0 6px 20px -8px ${alpha(p.primary, dark ? 0.7 : 0.4)}`,
            '&:hover': { backgroundImage: dark ? gradients.primaryHover : 'none', backgroundColor: p.primaryHover },
            '&.Mui-disabled': { backgroundImage: 'none', backgroundColor: tokens.muted, color: tokens.textTertiary, boxShadow: 'none' },
          },
        },
        { props: { variant: 'outlined', color: 'primary' }, style: { color: tokens.textPrimary } },
        { props: { variant: 'outlined', color: 'inherit' }, style: { color: tokens.textPrimary } },
        { props: { variant: 'text', color: 'primary' }, style: { color: tokens.textPrimary } },
      ],
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: tokens.radius, color: tokens.textSecondary, '&:hover': { backgroundColor: tokens.hover, color: tokens.textPrimary }, '&.Mui-focusVisible': focusRing },
      },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' }, outlined: { borderColor: tokens.border } },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: { backgroundColor: tokens.surface, backgroundImage: dark ? gradients.surface : 'none', borderColor: tokens.border, borderRadius: tokens.radiusLg, boxShadow: shadows.xs },
      },
    },
    MuiCardContent: { styleOverrides: { root: { padding: 20, '&:last-child': { paddingBottom: 20 } } } },
    MuiDivider: { styleOverrides: { root: { borderColor: tokens.border } } },

    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiInputLabel: { styleOverrides: { root: { fontSize: '0.875rem' } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius,
          backgroundColor: tokens.surface,
          fontSize: '0.9rem',
          transition: 'box-shadow .15s ease',
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tokens.borderStrong },
          '&.Mui-focused': { boxShadow: `0 0 0 3px ${tokens.ring}` },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tokens.primary, borderWidth: 1 },
        },
        input: { paddingTop: 10.5, paddingBottom: 10.5, '.MuiInputBase-sizeSmall &': { paddingTop: 7.5, paddingBottom: 7.5 } },
        notchedOutline: { borderColor: tokens.border },
      },
    },
    MuiFormHelperText: { styleOverrides: { root: { marginInline: 2, fontSize: '0.75rem' } } },
    MuiFormLabel: { styleOverrides: { root: { '&.Mui-focused': { color: tokens.accentText } } } },
    // Link em violeta claro: o violeta da marca puro não tem contraste AA sobre preto.
    MuiLink: { styleOverrides: { root: { color: tokens.accentText, textDecorationColor: 'currentColor', textUnderlineOffset: 3 } } },

    MuiChip: {
      styleOverrides: {
        root: { height: 24, borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 },
        label: { paddingInline: 8 },
        sizeSmall: { height: 22 },
        outlined: { borderColor: tokens.border },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40 },
        indicator: { backgroundColor: dark ? tokens.primary : tokens.textPrimary, backgroundImage: dark ? gradients.primary : 'none', height: 2, borderRadius: 2 },
        scrollButtons: { width: 28, '&.Mui-disabled': { opacity: 0.3 } },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 40,
          minWidth: 0,
          padding: '8px 12px',
          fontSize: '0.875rem',
          fontWeight: 550,
          textTransform: 'none',
          color: tokens.textSecondary,
          '&.Mui-selected': { color: tokens.textPrimary },
          '&:hover:not(.Mui-selected)': { color: tokens.textPrimary },
        },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        root: { width: 40, height: 22, padding: 0, margin: 8 },
        switchBase: {
          padding: 2,
          '&.Mui-checked': { transform: 'translateX(18px)', color: '#fff' },
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: tokens.primary, opacity: 1 },
          '&.Mui-focusVisible + .MuiSwitch-track': { boxShadow: shadows.ring },
          '&.Mui-disabled + .MuiSwitch-track': { opacity: 0.4 },
        },
        thumb: { width: 18, height: 18, boxShadow: shadows.sm, backgroundColor: '#fff' },
        track: { borderRadius: 11, backgroundColor: tokens.borderStrong, opacity: 1 },
      },
    },
    MuiCheckbox: { styleOverrides: { root: { color: tokens.borderStrong, '&.Mui-checked': { color: tokens.primary } } } },
    MuiRadio: { styleOverrides: { root: { color: tokens.borderStrong, '&.Mui-checked': { color: tokens.primary } } } },

    MuiDialog: {
      defaultProps: lightScope,
      styleOverrides: {
        paper: { borderRadius: tokens.radiusLg, boxShadow: shadows.xl, border: `1px solid ${tokens.border}`, backgroundColor: tokens.surfaceElevated },
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: '1.125rem', fontWeight: 650, letterSpacing: '-0.02em', paddingBottom: 8 } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '12px 24px 20px', gap: 8 } } },
    MuiBackdrop: { styleOverrides: { root: { backgroundColor: tokens.backdrop, backdropFilter: 'blur(4px)' } } },
    MuiDrawer: { defaultProps: lightScope, styleOverrides: { paper: { borderColor: tokens.border, backgroundColor: tokens.surface } } },
    MuiMenu: {
      defaultProps: lightScope,
      styleOverrides: {
        paper: { border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, boxShadow: shadows.lg, marginTop: 4, backgroundColor: tokens.surfaceElevated },
        list: { padding: 4 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: { borderRadius: 6, fontSize: '0.875rem', minHeight: 36, gap: 10, '&:hover': { backgroundColor: tokens.hover }, '& svg': { width: 16, height: 16, color: tokens.textSecondary } },
      },
    },
    MuiPopover: { defaultProps: lightScope, styleOverrides: { paper: { border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, boxShadow: shadows.lg, backgroundColor: tokens.surfaceElevated } } },
    MuiAutocomplete: {
      styleOverrides: {
        paper: { border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, boxShadow: shadows.lg, marginTop: 4, backgroundColor: tokens.surfaceElevated },
        option: { fontSize: '0.875rem', borderRadius: 6, margin: '0 4px' },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: false },
      styleOverrides: {
        tooltip: { backgroundColor: tokens.ink, color: tokens.onInk, fontSize: '0.75rem', fontWeight: 500, borderRadius: 6, padding: '6px 10px' },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: tokens.radius, border: '1px solid', alignItems: 'flex-start', fontSize: '0.875rem' },
      },
      variants: [
        { props: { variant: 'standard', severity: 'error' }, style: { borderColor: alpha(p.error, 0.3), backgroundColor: tokens.errorSoft } },
        { props: { variant: 'standard', severity: 'warning' }, style: { borderColor: alpha(p.warning, 0.3), backgroundColor: tokens.warningSoft } },
        { props: { variant: 'standard', severity: 'info' }, style: { borderColor: tokens.border, backgroundColor: tokens.muted, color: tokens.textPrimary } },
        { props: { variant: 'standard', severity: 'success' }, style: { borderColor: alpha(p.success, 0.3), backgroundColor: tokens.successSoft } },
        { props: { variant: 'filled' }, style: { border: 'none' } },
      ],
    },
    MuiLinearProgress: {
      styleOverrides: { root: { height: 6, borderRadius: 6, backgroundColor: tokens.muted }, bar: { borderRadius: 6, backgroundColor: dark ? tokens.primary : tokens.textPrimary, backgroundImage: dark ? gradients.primary : 'none' } },
    },
    MuiSkeleton: { styleOverrides: { root: { backgroundColor: tokens.muted }, rounded: { borderRadius: tokens.radius } } },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 38,
          paddingBlock: 6,
          '&:hover': { backgroundColor: tokens.hover },
          '&.Mui-selected': { backgroundColor: tokens.accentSoft, color: tokens.textPrimary, boxShadow: `inset 2px 0 0 ${tokens.primary}`, '& .MuiListItemIcon-root': { color: tokens.accentText }, '&:hover': { backgroundColor: tokens.accentSoft } },
          '&.Mui-focusVisible': focusRing,
        },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 32, color: tokens.textSecondary } } },
    MuiListItemText: { styleOverrides: { primary: { fontSize: '0.875rem' }, secondary: { fontSize: '0.8125rem' } } },
    MuiAccordion: { styleOverrides: { root: { backgroundColor: 'transparent', '&:before': { display: 'none' } } } },
    MuiBottomNavigationAction: {
      styleOverrides: { root: { color: tokens.textTertiary, '&.Mui-selected': { color: tokens.accentText } }, label: { fontSize: '0.6875rem', '&.Mui-selected': { fontSize: '0.6875rem', fontWeight: 600 } } },
    },
  },
});
}

/** Tema do sistema (escuro). */
export const theme = makeTheme('dark');
/** Tema do documento da proposta e das páginas do cliente final (claro). */
export const lightTheme = makeTheme('light');
