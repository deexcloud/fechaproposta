// Textos de preço da página de vendas e do painel.
// O valor cobrado de verdade vem de public.billing_price(meses) no banco
// (migration 20261012120500_pricing.sql); ao mudar lá, atualize aqui também.
export const TRIAL_DAYS = 7;

export interface Plan {
  months: 1 | 6 | 12;
  label: string;
  /** Total cobrado pelo período. */
  total: number;
  /** Quanto sai por mês. */
  perMonth: number;
}

export const PLANS: Plan[] = [
  { months: 1, label: 'Mensal', total: 79, perMonth: 79 },
  { months: 6, label: 'Semestral', total: 414, perMonth: 69 },
  { months: 12, label: 'Anual', total: 708, perMonth: 59 },
];

export const MONTHLY_PLAN = PLANS[0];
export const ANNUAL_PLAN = PLANS[2];

/** Preço cheio do mês, para quem paga mês a mês. */
export const PRICE_MONTHLY = MONTHLY_PLAN.perMonth;
/** Menor preço por mês (plano anual). */
export const PRICE_FROM = ANNUAL_PLAN.perMonth;

/** Quanto o período economiza em relação a pagar mês a mês. */
export const planSavings = (p: Plan) => PRICE_MONTHLY * p.months - p.total;
export const planDiscountPct = (p: Plan) => Math.round((planSavings(p) / (PRICE_MONTHLY * p.months)) * 100);

export const PLAN_FEATURES = [
  'Propostas e clientes ilimitados',
  'Link com aceite e assinatura online',
  'Itens opcionais que o cliente escolhe',
  'Aviso quando o cliente abre a proposta',
  'Catálogo de serviços e modelos',
  'Sua logo e suas cores',
  'Equipe com perfis de acesso',
  'PDF pronto para enviar',
];
