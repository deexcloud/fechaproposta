import { ORG_MEDIA_BUCKET, supabase } from '@/lib/supabase';
import type { Membership, Organization, OrganizationUpdate } from '@/types';

export async function listMyMemberships(userId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('role, organization:organizations(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Membership[];
}

export async function createOrganization(name: string): Promise<Organization> {
  const { data, error } = await supabase.rpc('create_organization', { p_name: name });
  if (error) throw error;
  return data as Organization;
}

export async function updateOrganization(id: string, patch: OrganizationUpdate): Promise<Organization> {
  const { data, error } = await supabase.from('organizations').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Organization;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** Valida a imagem antes do envio. Retorna a mensagem de erro ou null. */
export function validateLogoFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Envie uma imagem JPG, PNG ou WEBP.';
  if (file.size > MAX_LOGO_BYTES) return 'A imagem precisa ter no máximo 2 MB.';
  return null;
}

export async function uploadLogo(orgId: string, file: File): Promise<string> {
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${orgId}/logo-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(ORG_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return path;
}

/** Remoção de logo antiga; falhas aqui não interrompem quem está usando. */
export async function removeMedia(path: string): Promise<void> {
  await supabase.storage.from(ORG_MEDIA_BUCKET).remove([path]);
}
