import { supabase } from '@/lib/supabase';
import type { MemberRole } from '@/types';

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Dono',
  manager: 'Gerente',
  staff: 'Vendedor',
};

export const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  owner: 'Acesso total, inclusive assinatura e equipe.',
  manager: 'Cuida de tudo: propostas, catálogo, configurações e equipe de vendas.',
  staff: 'Cria e envia propostas e cadastra clientes. Não altera o catálogo nem as configurações.',
};

export interface TeamMember {
  user_id: string;
  role: MemberRole;
  full_name: string | null;
  email: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: MemberRole;
  token: string;
  created_at: string;
  expires_at: string;
}

export interface InvitationInfo {
  organization_name: string;
  email: string;
  role: MemberRole;
  expired: boolean;
  accepted: boolean;
}

export const inviteLink = (token: string) => `${window.location.origin}/convite/${token}`;

export async function listMembers(orgId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase.rpc('list_members', { p_org: orgId });
  if (error) throw error;
  return data as TeamMember[];
}

export async function listInvitations(orgId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from('organization_invitations')
    .select('id, email, role, token, created_at, expires_at')
    .eq('organization_id', orgId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Invitation[];
}

export async function createInvitation(orgId: string, email: string, role: MemberRole): Promise<Invitation> {
  const { data, error } = await supabase.rpc('create_invitation', { p_org: orgId, p_email: email, p_role: role });
  if (error) throw error;
  return data as Invitation;
}

export async function revokeInvitation(id: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_invitation', { p_id: id });
  if (error) throw error;
}

export async function getInvitation(token: string): Promise<InvitationInfo | null> {
  const { data, error } = await supabase.rpc('get_invitation', { p_token: token });
  if (error) throw error;
  return data as InvitationInfo | null;
}

export async function acceptInvitation(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_invitation', { p_token: token });
  if (error) throw error;
  return data as string;
}

export async function updateMemberRole(orgId: string, userId: string, role: MemberRole): Promise<void> {
  const { error } = await supabase.rpc('update_member_role', { p_org: orgId, p_user: userId, p_role: role });
  if (error) throw error;
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_member', { p_org: orgId, p_user: userId });
  if (error) throw error;
}
