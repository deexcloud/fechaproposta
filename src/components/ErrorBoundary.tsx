import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { isStaleBuildError, reloadForNewVersion } from '@/lib/staleBuild';

interface State {
  error: Error | null;
}

/**
 * Evita a tela em branco quando algo inesperado quebra a interface:
 * mostra uma mensagem simples e permite recarregar.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro na interface:', error, info.componentStack);
    // Arquivo de uma versão antiga do site: recarregar resolve sozinho.
    if (isStaleBuildError(error)) reloadForNewVersion();
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    // Ao trocar de página, tenta exibir a nova página normalmente.
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Stack spacing={2} sx={{ minHeight: '60vh', alignItems: 'center', justifyContent: 'center', p: 3, textAlign: 'center' }} role="alert">
        <Typography variant="h2">Algo deu errado nesta tela</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
          Seus dados salvos não foram afetados. Recarregue a página para continuar.
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>Recarregar página</Button>
      </Stack>
    );
  }
}
