import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface BillingPayment {
  id: string;
  months: number;
  amount: number;
  method: string | null;
  paid_until_after: string;
  created_at: string;
}

export const PAYMENT_METHOD_NAMES: Record<string, string> = {
  PIX: 'Pix',
  CREDIT_CARD: 'Cartão de crédito',
  DEBIT_CARD: 'Cartão de débito',
};

/**
 * Cria o Checkout do Asaas (Edge Function billing-checkout) só com a forma
 * escolhida e devolve o link. O preço é definido no servidor.
 */
export async function startCheckout(orgId: string, method: 'pix' | 'card', months = 1): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>('billing-checkout', {
    body: { organization_id: orgId, months, method },
  });
  if (error) {
    // Mensagem amigável enviada pela função, quando houver.
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? 'Não foi possível abrir o pagamento. Tente novamente.');
    }
    throw new Error('Não foi possível abrir o pagamento. Verifique sua internet e tente de novo.');
  }
  if (!data?.url) throw new Error(data?.error ?? 'Não foi possível abrir o pagamento. Tente novamente.');
  return data.url;
}

export async function listBillingPayments(orgId: string): Promise<BillingPayment[]> {
  const { data, error } = await supabase
    .from('billing_payments')
    .select('id, months, amount, method, paid_until_after, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(24);
  if (error) throw error;
  return data as BillingPayment[];
}
