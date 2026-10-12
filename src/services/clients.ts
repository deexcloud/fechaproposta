import { supabase } from '@/lib/supabase';
import type { Client, ClientInput } from '@/types';

export async function listClients(orgId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', orgId)
    .order('name', { ascending: true })
    .limit(2000);
  if (error) throw error;
  return data as Client[];
}

export async function createClient(orgId: string, input: ClientInput): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...input, organization_id: orgId })
    .select('*')
    .single();
  if (error) throw error;
  return data as Client;
}

export async function updateClient(id: string, input: ClientInput): Promise<Client> {
  const { data, error } = await supabase.from('clients').update(input).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Client;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}
