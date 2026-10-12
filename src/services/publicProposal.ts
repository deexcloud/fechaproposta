// Chamadas da página do cliente (/p/:token). Funcionam sem login.
import { supabase } from '@/lib/supabase';
import type { PublicProposal } from '@/types';

export async function getPublicProposal(token: string): Promise<PublicProposal | null> {
  const { data, error } = await supabase.rpc('get_public_proposal', { p_token: token });
  if (error) {
    // Token mal formado não é erro de sistema: é link inválido.
    if (error.code === '22P02') return null;
    throw error;
  }
  if (!data) return null;
  const p = data as PublicProposal;
  return {
    ...p,
    discount: Number(p.discount),
    total_amount: Number(p.total_amount),
    optional_amount: Number(p.optional_amount),
    items: p.items.map((i) => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
    acceptance: p.acceptance ? { ...p.acceptance, total: Number(p.acceptance.total) } : null,
  };
}

export async function registerView(token: string): Promise<void> {
  await supabase.rpc('register_proposal_view', { p_token: token });
}

export async function requestChanges(token: string, name: string, message: string): Promise<void> {
  const { error } = await supabase.rpc('request_proposal_changes', { p_token: token, p_name: name, p_message: message });
  if (error) throw error;
}

export interface AcceptInput {
  name: string;
  email: string | null;
  mode: 'typed' | 'drawn';
  signature: string | null;
  selectedItems: string[];
}

export async function acceptProposal(token: string, input: AcceptInput): Promise<void> {
  const { error } = await supabase.rpc('accept_public_proposal', {
    p_token: token,
    p_signer_name: input.name,
    p_signer_email: input.email,
    p_signature_mode: input.mode,
    p_signature_data: input.signature,
    p_selected_items: input.selectedItems,
  });
  if (error) throw error;
}

export async function declineProposal(token: string, name: string, reason: string | null): Promise<void> {
  const { error } = await supabase.rpc('decline_public_proposal', { p_token: token, p_name: name, p_reason: reason });
  if (error) throw error;
}
