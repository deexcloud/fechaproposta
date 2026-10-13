import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Alert, Button, Snackbar } from '@mui/material';

type Severity = 'success' | 'error' | 'info' | 'warning';

/** Botão dentro da mensagem, ex.: "Desfazer". */
interface NoticeAction {
  label: string;
  onClick: () => void;
}

interface Notice {
  id: number;
  message: string;
  severity: Severity;
  action?: NoticeAction;
}

interface NotifyApi {
  success: (message: string, action?: NoticeAction) => void;
  error: (message: string) => void;
  info: (message: string, action?: NoticeAction) => void;
}

const NotifyContext = createContext<NotifyApi | null>(null);

/** Mensagens curtas de confirmação ("Horários salvos") no rodapé da tela. */
export function NotifyProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);

  const show = useCallback((message: string, severity: Severity, action?: NoticeAction) => {
    setNotice({ id: Date.now(), message, severity, action });
  }, []);

  const api = useMemo<NotifyApi>(
    () => ({
      success: (m, a) => show(m, 'success', a),
      error: (m) => show(m, 'error'),
      info: (m, a) => show(m, 'info', a),
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
        // Com "Desfazer", fica mais tempo na tela para dar tempo de reagir.
        autoHideDuration={notice?.severity === 'error' || notice?.action ? 8000 : 4000}
        onClose={(_, reason) => reason !== 'clickaway' && close()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 88, md: 24 } }}
      >
        <Alert
          onClose={close}
          severity={notice?.severity ?? 'info'}
          variant="filled"
          sx={{ width: '100%', alignItems: 'center' }}
          action={
            notice?.action && (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  notice.action!.onClick();
                  close();
                }}
                sx={{ fontWeight: 700, minHeight: 32, backgroundImage: 'none' }}
              >
                {notice.action.label}
              </Button>
            )
          }
        >
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
