import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Stack, Typography } from '@mui/material';

/** Mensagem que esta página manda para o painel quando o Asaas termina. */
export const CHECKOUT_MESSAGE = 'fechaproposta:assinatura';

/**
 * Para onde o Asaas manda quem pagou (/assinatura/retorno?status=ok|falhou).
 * Aberta na janelinha: avisa o painel que a abriu e fecha sozinha.
 * Aberta na mesma aba (janela bloqueada pelo navegador): volta ao painel com o aviso de sempre.
 */
export function CheckoutReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ok = params.get('status') === 'ok';

  useEffect(() => {
    const opener = window.opener as Window | null;
    if (opener && !opener.closed) {
      try {
        opener.postMessage({ type: CHECKOUT_MESSAGE, status: ok ? 'ok' : 'falhou' }, window.location.origin);
        opener.focus();
      } catch {
        /* painel em outro endereço: só fecha */
      }
      window.close();
      return;
    }
    navigate(`/painel?assinatura=${ok ? 'retorno' : 'falhou'}`, { replace: true });
  }, [ok, navigate]);

  return (
    <Stack spacing={1} sx={{ minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', p: 3, textAlign: 'center' }}>
      <Typography sx={{ fontWeight: 650 }}>{ok ? 'Pagamento enviado.' : 'Pagamento não concluído.'}</Typography>
      <Typography variant="body2" color="text.secondary">Pode fechar esta janela e voltar ao FechaProposta.</Typography>
    </Stack>
  );
}
