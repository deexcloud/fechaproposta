import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Aceita o nome novo do painel do Supabase ("publishable key") e o antigo ("anon key").
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

/** false quando o .env.local ainda não foi preenchido. */
export const isSupabaseConfigured = Boolean(url && anonKey);

// "Manter conectado": marcado, a sessão fica no localStorage e sobrevive a fechar o navegador;
// desmarcado, fica no sessionStorage e some ao fechar a aba. A escolha em si fica no localStorage.
const REMEMBER_KEY = 'fp-remember-session';

function rememberSession(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== '0';
  } catch {
    return true;
  }
}

/** Chamar antes de entrar. Padrão: lembrar (como sempre foi). */
export function setRememberSession(remember: boolean): void {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  } catch {
    /* sem armazenamento: o Supabase cai na memória da aba */
  }
}

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

/** Guarda a sessão onde a pessoa escolheu e limpa o outro lugar, para não sobrar login antigo. */
const sessionStore = {
  getItem: (key: string) => {
    const [active, other] = rememberSession() ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
    return safe(() => active.getItem(key) ?? other.getItem(key), null);
  },
  setItem: (key: string, value: string) => {
    const [active, other] = rememberSession() ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
    safe(() => {
      active.setItem(key, value);
      other.removeItem(key);
    }, undefined);
  },
  removeItem: (key: string) => {
    safe(() => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }, undefined);
  },
};

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: sessionStore },
});

export const ORG_MEDIA_BUCKET = 'org-media';

export function getPublicMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(ORG_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}
