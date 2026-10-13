import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { ThemeProvider } from '@mui/material/styles';
import { lightTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * Área clara dentro do sistema escuro: a proposta é um documento (vai para o PDF e leva
 * a marca de quem vende), então o cliente final sempre a vê em fundo branco.
 * Troca a paleta do MUI e as variáveis CSS dos tokens ao mesmo tempo.
 */
export function LightScope({ children, sx, page }: { children: ReactNode; sx?: SxProps<Theme>; page?: boolean }) {
  return (
    <ThemeProvider theme={lightTheme}>
      <Box
        className="fp-light"
        sx={[{ color: tokens.textPrimary }, page ? { minHeight: '100dvh', bgcolor: tokens.background } : {}, ...(Array.isArray(sx) ? sx : [sx])]}
      >
        {children}
      </Box>
    </ThemeProvider>
  );
}
