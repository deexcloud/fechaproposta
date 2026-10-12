import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Alert, Snackbar } from '@mui/material';

type Severity = 'success' | 'error' | 'info' | 'warning';

interface Notice {
  id: number;
  message: string;
  severity: Severity;
}

interface NotifyApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const NotifyContext = createContext<NotifyApi | null>(null);

/** Mensagens curtas de confirmação ("Horários salvos") no rodapé da tela. */
export function NotifyProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);

  const show = useCallback((message: string, severity: Severity) => {
    setNotice({ id: Date.now(), message, severity });
  }, []);

  const api = useMemo<NotifyApi>(
    () => ({
      success: (m) => show(m, 'success'),
      error: (m) => show(m, 'error'),
      info: (m) => show(m, 'info'),
    }),
    [show],
  );

  const close = () => setNotice(null);

  return (
    <NotifyContext.Provider value={api}>
      {children}
      <Snackbar
        key={notice?.id}
        open={Boolean(notice)}
        autoHideDuration={notice?.severity === 'error' ? 8000 : 4000}
        onClose={(_, reason) => reason !== 'clickaway' && close()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 88, md: 24 } }}
      >
        <Alert onClose={close} severity={notice?.severity ?? 'info'} variant="filled" sx={{ width: '100%' }}>
          {notice?.message}
        </Alert>
      </Snackbar>
    </NotifyContext.Provider>
  );
}

export function useNotify(): NotifyApi {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error('useNotify precisa estar dentro de <NotifyProvider>');
  return ctx;
}
