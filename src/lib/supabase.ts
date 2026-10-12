import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Aceita o nome novo do painel do Supabase ("publishable key") e o antigo ("anon key").
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

/** false quando o .env.local ainda não foi preenchido. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const ORG_MEDIA_BUCKET = 'org-media';

export function getPublicMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(ORG_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}
