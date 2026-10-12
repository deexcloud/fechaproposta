import type { Organization } from '@/types';

export interface SubscriptionState {
  /** Pode criar e enviar propostas. */
  active: boolean;
  /** Está no teste grátis (sem assinatura paga vigente). */
  inTrial: boolean;
  /** Dias restantes do teste, arredondado para cima (0 quando acabou). */
  trialDaysLeft: number;
  trialEndsAt: Date;
  paidUntil: Date | null;
  /** Dias até a assinatura paga vencer (null sem assinatura paga). */
  paidDaysLeft: number | null;
}

const DAY = 86_400_000;

/**
 * Mesma regra de public.subscription_active() no banco: ativa enquanto o teste
 * não venceu ou o pagamento está em dia. O banco é quem bloqueia de verdade;
 * aqui é só para mostrar a situação no painel.
 */
export function subscriptionState(org: Pick<Organization, 'trial_ends_at' | 'paid_until'>, now = new Date()): SubscriptionState {
  const trialEndsAt = new Date(org.trial_ends_at);
  const paidUntil = org.paid_until ? new Date(org.paid_until) : null;
  const paid = paidUntil !== null && paidUntil > now;
  const trialOpen = trialEndsAt > now;
  return {
    active: paid || trialOpen,
    inTrial: !paid && trialOpen,
    trialDaysLeft: trialOpen ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY) : 0,
    trialEndsAt,
    paidUntil,
    paidDaysLeft: paid ? Math.ceil((paidUntil.getTime() - now.getTime()) / DAY) : null,
  };
}
