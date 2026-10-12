import { supabase } from '@/lib/supabase';
import type {
  ActivityEvent,
  ProposalAcceptance,
  ProposalEvent,
  ProposalFull,
  ProposalItem,
  ProposalListItem,
} from '@/types';

const LIST_COLUMNS = '*, client:clients(id, name, company, email, whatsapp)';

/** O banco devolve numeric como texto: converte os campos de valor. */
const toNumber = <T extends object>(row: T, keys: (keyof T)[]): T => {
  const out = { ...row };
  for (const k of keys) if (out[k] !== null && out[k] !== undefined) out[k] = Number(out[k]) as T[keyof T];
  return out;
};

const normalize = (row: ProposalListItem): ProposalListItem =>
  toNumber(row, ['discount', 'total_amount', 'optional_amount', 'accepted_total']);

export async function listProposals(orgId: string): Promise<ProposalListItem[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select(LIST_COLUMNS)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data as ProposalListItem[]).map(normalize);
}

export async function getProposal(id: string): Promise<ProposalFull> {
  const { data, error } = await supabase
    .from('proposals')
    .select(`${LIST_COLUMNS}, items:proposal_items(*)`)
    .eq('id', id)
    .single();
  if (error) throw error;
  const row = data as ProposalFull;
  return {
    ...normalize(row),
    items: [...row.items]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
  };
}

export async function listProposalEvents(proposalId: string): Promise<ProposalEvent[]> {
  const { data, error } = await supabase
    .from('proposal_events')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as ProposalEvent[];
}

/** Movimento recente da empresa (feed do início). */
export async function listRecentActivity(orgId: string, limit = 12): Promise<ActivityEvent[]> {
  const { data, error } = await supabase
    .from('proposal_events')
    .select('*, proposal:proposals(id, code, title, client:clients(name))')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ActivityEvent[];
}

export async function getAcceptance(proposalId: string): Promise<ProposalAcceptance | null> {
  const { data, error } = await supabase
    .from('proposal_acceptances')
    .select('proposal_id, signer_name, signer_email, signature_mode, signature_data, selected_items, total, content_hash, ip, user_agent, accepted_at')
    .eq('proposal_id', proposalId)
    .maybeSingle();
  if (error) throw error;
  return data ? ({ ...data, total: Number(data.total) } as ProposalAcceptance) : null;
}

export interface ProposalPayload {
  client_id?: string | null;
  client?: { name: string; company?: string | null; email?: string | null; whatsapp?: string | null } | null;
  title: string;
  summary: string | null;
  deliverables: string[];
  timeline: string | null;
  next_step: string | null;
  exclusions: string | null;
  terms: string | null;
  valid_until: string;
  discount: number;
  items: Omit<ProposalItem, 'id'>[];
}

export async function saveProposal(orgId: string, id: string | null, payload: ProposalPayload): Promise<string> {
  const { data, error } = await supabase.rpc('save_proposal', { p_org: orgId, p_id: id, p_data: payload });
  if (error) throw error;
  return data as string;
}

export async function sendProposal(id: string): Promise<{ share_token: string; status: string }> {
  const { data, error } = await supabase.rpc('send_proposal', { p_id: id });
  if (error) throw error;
  return data as { share_token: string; status: string };
}

export async function duplicateProposal(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('duplicate_proposal', { p_id: id });
  if (error) throw error;
  return data as string;
}

export async function recordManualAcceptance(id: string, signerName: string, selectedItems: string[], note: string | null): Promise<void> {
  const { error } = await supabase.rpc('record_manual_acceptance', {
    p_id: id,
    p_signer_name: signerName,
    p_selected_items: selectedItems,
    p_note: note,
  });
  if (error) throw error;
}

export async function markDeclined(id: string, reason: string | null): Promise<void> {
  const { error } = await supabase.rpc('mark_proposal_declined', { p_id: id, p_reason: reason });
  if (error) throw error;
}

export async function reopenProposal(id: string): Promise<void> {
  const { error } = await supabase.rpc('reopen_proposal', { p_id: id });
  if (error) throw error;
}

export async function deleteProposal(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_proposal', { p_id: id });
  if (error) throw error;
}
