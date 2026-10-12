interface ErrorLike {
  message?: string;
  code?: string;
  hint?: string;
  status?: number;
}

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos. Confira e tente de novo.',
  email_not_confirmed: 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  user_already_exists: 'Já existe uma conta com esse e-mail. Tente entrar ou recuperar a senha.',
  email_exists: 'Já existe uma conta com esse e-mail. Tente entrar ou recuperar a senha.',
  weak_password: 'Senha muito fraca. Use pelo menos 8 caracteres, misturando letras e números.',
  over_email_send_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  session_not_found: 'Sua sessão expirou. Entre novamente.',
};

/**
 * Converte qualquer erro (Supabase, rede, código) em uma mensagem simples
 * para quem usa. Nunca mostra detalhes técnicos.
 */
export function friendlyError(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (!error) return fallback;
  const e = error as ErrorLike;

  if (e.message?.includes('Failed to fetch') || e.message?.includes('NetworkError')) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
  }
  if (e.code && AUTH_MESSAGES[e.code]) return AUTH_MESSAGES[e.code];

  // Mensagens escritas por nós nas funções do banco (raise exception ... errcode P0001)
  if (e.code === 'P0001' && e.message) return e.message;
  if (e.code === '42501') return e.message && /[À-ú]/.test(e.message) ? e.message : 'Você não tem permissão para fazer isso.';
  if (e.code === '23505') return 'Já existe um cadastro com esses dados.';
  if (e.code === '23514') return 'Algum valor informado não é válido. Revise os campos.';
  if (e.status === 413) return 'Arquivo muito grande. Envie uma imagem de até 2 MB.';

  return fallback;
}

export function errorHint(error: unknown): string | undefined {
  return (error as ErrorLike | null)?.hint;
}
