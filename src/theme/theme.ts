import { alpha, createTheme } from '@mui/material/styles';
import { fontFamily, shadows, tokens } from './tokens';

const focusRing = { outline: 'none', boxShadow: shadows.ring };

/** Animações curtas e impressão (PDF pelo navegador). */
const globalCss = {
  '@keyframes fp-fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
  '@keyframes fp-pulse': { '0%': { transform: 'scale(1)', opacity: 0.6 }, '100%': { transform: 'scale(2.4)', opacity: 0 } },
  '.fp-fade-up': { animation: 'fp-fade-up .35s cubic-bezier(.2,.7,.2,1) both' },
  '@media (prefers-reduced-motion: reduce)': {
    '*, *::before, *::after': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' },
  },
  '@media print': {
    body: { backgroundColor: '#fff !important' },
    '.no-print': { display: 'none !important' },
    '.print-plain': { boxShadow: 'none !important', border: 'none !important', margin: '0 !important', padding: '0 !important', maxWidth: 'none !important' },
    '@page': { margin: '14mm' },
  },
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: tokens.ink, dark: tokens.inkHover, light: '#3A463F', contrastText: tokens.onInk },
    secondary: { main: tokens.limeText, contrastText: '#fff' },
    success: { main: tokens.success, contrastText: '#fff' },
    warning: { main: tokens.warning, contrastText: '#fff' },
    error: { main: tokens.error },
    info: { main: tokens.info },
    background: { default: tokens.background, paper: tokens.surface },
    text: { primary: tokens.textPrimary, secondary: tokens.textSecondary, disabled: tokens.textTertiary },
    divider: tokens.border,
    action: { hover: tokens.hover, selected: tokens.muted },
  },
  shape: { borderRadius: tokens.radius },
  typography: {
    fontFamily,
    fontSize: 14,
    h1: { fontSize: '1.75rem', fontWeight: 650, letterSpacing: '-0.03em', lineHeight: 1.2 },
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
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: tokens.background, WebkitFontSmoothing: 'antialiased', fontFeatureSettings: '"ss01"' },
        '::selection': { background: alpha(tokens.lime, 0.55) },
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
        { props: { variant: 'contained', color: 'primary' }, style: { '&:hover': { backgroundColor: tokens.inkHover } } },
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
        root: { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: tokens.radiusLg, boxShadow: shadows.xs },
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
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tokens.limeText, borderWidth: 1 },
        },
        input: { paddingTop: 10.5, paddingBottom: 10.5, '.MuiInputBase-sizeSmall &': { paddingTop: 7.5, paddingBottom: 7.5 } },
        notchedOutline: { borderColor: tokens.border },
      },
    },
    MuiFormHelperText: { styleOverrides: { root: { marginInline: 2, fontSize: '0.75rem' } } },
    MuiFormLabel: { styleOverrides: { root: { '&.Mui-focused': { color: tokens.limeText } } } },

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
        indicator: { backgroundColor: tokens.ink, height: 2, borderRadius: 2 },
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
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: tokens.ink, opacity: 1 },
          '&.Mui-focusVisible + .MuiSwitch-track': { boxShadow: shadows.ring },
          '&.Mui-disabled + .MuiSwitch-track': { opacity: 0.4 },
        },
        thumb: { width: 18, height: 18, boxShadow: shadows.sm, backgroundColor: '#fff' },
        track: { borderRadius: 11, backgroundColor: tokens.borderStrong, opacity: 1 },
      },
    },
    MuiCheckbox: { styleOverrides: { root: { color: tokens.borderStrong, '&.Mui-checked': { color: tokens.ink } } } },
    MuiRadio: { styleOverrides: { root: { color: tokens.borderStrong, '&.Mui-checked': { color: tokens.ink } } } },

    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: tokens.radiusLg, boxShadow: shadows.xl, border: `1px solid ${tokens.border}` },
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: '1.125rem', fontWeight: 650, letterSpacing: '-0.02em', paddingBottom: 8 } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '12px 24px 20px', gap: 8 } } },
    MuiBackdrop: { styleOverrides: { root: { backgroundColor: 'rgba(18, 25, 21, 0.45)', backdropFilter: 'blur(2px)' } } },
    MuiDrawer: { styleOverrides: { paper: { borderColor: tokens.border } } },
    MuiMenu: {
      styleOverrides: {
        paper: { border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, boxShadow: shadows.lg, marginTop: 4 },
        list: { padding: 4 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: { borderRadius: 6, fontSize: '0.875rem', minHeight: 36, gap: 10, '&:hover': { backgroundColor: tokens.hover }, '& svg': { width: 16, height: 16, color: tokens.textSecondary } },
      },
    },
    MuiPopover: { styleOverrides: { paper: { border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, boxShadow: shadows.lg } } },
    MuiAutocomplete: {
      styleOverrides: {
        paper: { border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, boxShadow: shadows.lg, marginTop: 4 },
        option: { fontSize: '0.875rem', borderRadius: 6, margin: '0 4px' },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: false },
      styleOverrides: {
        tooltip: { backgroundColor: tokens.ink, color: '#fff', fontSize: '0.75rem', fontWeight: 500, borderRadius: 6, padding: '6px 10px' },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: tokens.radius, border: '1px solid', alignItems: 'flex-start', fontSize: '0.875rem' },
      },
      variants: [
        { props: { variant: 'standard', severity: 'error' }, style: { borderColor: alpha(tokens.error, 0.25), backgroundColor: tokens.errorSoft } },
        { props: { variant: 'standard', severity: 'warning' }, style: { borderColor: alpha(tokens.warning, 0.3), backgroundColor: tokens.warningSoft } },
        { props: { variant: 'standard', severity: 'info' }, style: { borderColor: tokens.border, backgroundColor: tokens.muted, color: tokens.textPrimary } },
        { props: { variant: 'standard', severity: 'success' }, style: { borderColor: alpha(tokens.success, 0.25), backgroundColor: tokens.successSoft } },
        { props: { variant: 'filled' }, style: { border: 'none' } },
      ],
    },
    MuiLinearProgress: {
      styleOverrides: { root: { height: 6, borderRadius: 6, backgroundColor: tokens.muted }, bar: { borderRadius: 6, backgroundColor: tokens.ink } },
    },
    MuiSkeleton: { styleOverrides: { root: { backgroundColor: tokens.muted }, rounded: { borderRadius: tokens.radius } } },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 38,
          paddingBlock: 6,
          '&:hover': { backgroundColor: tokens.hover },
          '&.Mui-selected': { backgroundColor: tokens.muted, '&:hover': { backgroundColor: tokens.muted } },
          '&.Mui-focusVisible': focusRing,
        },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 32, color: tokens.textSecondary } } },
    MuiListItemText: { styleOverrides: { primary: { fontSize: '0.875rem' }, secondary: { fontSize: '0.8125rem' } } },
    MuiAccordion: { styleOverrides: { root: { backgroundColor: 'transparent', '&:before': { display: 'none' } } } },
    MuiBottomNavigationAction: {
      styleOverrides: { root: { color: tokens.textTertiary, '&.Mui-selected': { color: tokens.textPrimary } }, label: { fontSize: '0.6875rem', '&.Mui-selected': { fontSize: '0.6875rem', fontWeight: 600 } } },
    },
  },
});
