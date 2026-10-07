import { createTheme } from '@mui/material/styles'

const colors = {
  canvas: '#17191a',
  paper: '#202426',
  elevated: '#282d2f',
  outline: '#394043',
  text: '#eeeae2',
  muted: '#a5aca9',
  champagne: '#c6ab7a',
  champagneHover: '#d5bd91',
  emerald: '#58a988',
}

const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: colors.champagne, light: colors.champagneHover, dark: '#9d8155', contrastText: '#20201d' },
    secondary: { main: colors.emerald, light: '#7bc3a4', dark: '#397d62', contrastText: '#10231b' },
    success: { main: colors.emerald, light: '#7bc3a4', dark: '#397d62' },
    warning: { main: '#d4b46c' },
    info: { main: '#91b2c1' },
    error: { main: '#d98278' },
    background: { default: colors.canvas, paper: colors.paper },
    text: { primary: colors.text, secondary: colors.muted },
    divider: colors.outline,
  },
  typography: {
    fontFamily: '"DM Sans", sans-serif',
    h1: { fontFamily: 'Manrope, sans-serif', fontWeight: 700 },
    h2: { fontFamily: 'Manrope, sans-serif', fontWeight: 700 },
    h3: { fontFamily: 'Manrope, sans-serif', fontWeight: 700 },
    button: { fontWeight: 650, textTransform: 'none' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minWidth: 0, borderRadius: 9, fontSize: '0.8125rem', lineHeight: 1.3 },
        containedPrimary: { color: '#20201d', '&:hover': { backgroundColor: colors.champagneHover } },
        outlined: { borderColor: colors.outline },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiCard: {
      styleOverrides: {
        root: { border: `1px solid ${colors.outline}`, backgroundColor: colors.paper, boxShadow: '0 14px 36px rgba(0,0,0,.16)' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          backgroundColor: '#191d1e',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.outline },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#626b6b' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.champagne, borderWidth: 1 },
        },
        input: { color: colors.text, '&::placeholder': { color: '#818a87', opacity: 1 } },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { color: colors.muted, '&.Mui-focused': { color: colors.champagne } } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: colors.outline, color: colors.text },
        head: { color: colors.muted, fontWeight: 700, fontSize: '0.7rem', letterSpacing: '.06em' },
      },
    },
    MuiDialog: { styleOverrides: { paper: { border: `1px solid ${colors.outline}`, borderRadius: 14, backgroundColor: colors.paper, backgroundImage: 'none' } } },
    MuiAccordion: { styleOverrides: { root: { border: `1px solid ${colors.outline}`, backgroundColor: colors.paper, '&:before': { display: 'none' } } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 650 }, outlined: { borderColor: colors.outline } } },
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: colors.canvas },
        '::selection': { backgroundColor: 'rgba(198,171,122,.32)' },
        '*:focus-visible': { outline: '2px solid #c6ab7a', outlineOffset: 3 },
      },
    },
  },
})

export default muiTheme
