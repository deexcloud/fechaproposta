import { supabase } from '@/lib/supabase';
import type { ProposalTemplate, Service, ServiceInput } from '@/types';

// ---------- Catálogo de serviços ----------

export async function listServices(orgId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('organization_id', orgId)
    .order('name', { ascending: true })
    .limit(1000);
  if (error) throw error;
  return (data ?? []).map((s) => ({ ...s, unit_price: Number(s.unit_price) })) as Service[];
}

export async function saveService(orgId: string, id: string | null, input: ServiceInput): Promise<void> {
  const { error } = id
    ? await supabase.from('services').update(input).eq('id', id)
    : await supabase.from('services').insert({ ...input, organization_id: orgId });
  if (error) throw error;
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Modelos de proposta ----------

export async function listTemplates(orgId: string): Promise<ProposalTemplate[]> {
  const { data, error } = await supabase
    .from('proposal_templates')
    .select('*')
    .eq('organization_id', orgId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as ProposalTemplate[];
}

export async function getTemplate(id: string): Promise<ProposalTemplate> {
  const { data, error } = await supabase.from('proposal_templates').select('*').eq('id', id).single();
  if (error) throw error;
  return data as ProposalTemplate;
}

export async function saveTemplate(
  orgId: string,
  id: string | null,
  input: Pick<ProposalTemplate, 'name' | 'description' | 'content'>,
): Promise<string> {
  if (id) {
    const { error } = await supabase.from('proposal_templates').update(input).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase
    .from('proposal_templates')
    .insert({ ...input, organization_id: orgId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('proposal_templates').delete().eq('id', id);
  if (error) throw error;
}
