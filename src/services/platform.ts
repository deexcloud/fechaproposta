import { supabase } from '@/lib/supabase';

export interface PlatformOrganization {
  id: string;
  name: string;
  whatsapp: string | null;
  created_at: string;
  trial_ends_at: string;
  paid_until: string | null;
  owner_email: string | null;
  owner_name: string | null;
  members: number;
  proposals: number;
  accepted_30d: number;
  last_proposal_at: string | null;
}

export async function isPlatformAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_platform_admin');
  if (error) throw error;
  return Boolean(data);
}

export async function listPlatformOrganizations(): Promise<PlatformOrganization[]> {
  const { data, error } = await supabase.rpc('platform_list_organizations');
  if (error) throw error;
  return (data ?? []) as PlatformOrganization[];
}

export async function addPaidMonths(orgId: string, months: number): Promise<void> {
  const { error } = await supabase.rpc('platform_add_paid_months', { p_org: orgId, p_months: months });
  if (error) throw error;
}

export async function extendTrial(orgId: string, days: number): Promise<void> {
  const { error } = await supabase.rpc('platform_extend_trial', { p_org: orgId, p_days: days });
  if (error) throw error;
}

export async function endSubscription(orgId: string): Promise<void> {
  const { error } = await supabase.rpc('platform_end_subscription', { p_org: orgId });
  if (error) throw error;
}
