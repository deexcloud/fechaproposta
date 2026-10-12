// Lógica pura da cobrança (Asaas), usada pelas Edge Functions (Deno) e testada com Vitest.
// Sem dependências.

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_MONTHS = 24;

/** Eventos do Asaas que indicam cobrança paga (cartão aprovado ou Pix recebido). */
export const PAID_EVENTS = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'];
/** Situações da cobrança que liberam a assinatura. */
export const PAID_STATUSES = ['CONFIRMED', 'RECEIVED'];

/** Referência que vai no checkout: "<id da empresa>:<meses>". */
export function buildExternalReference(orgId: string, months: number): string {
  return `${orgId}:${months}`;
}

export function parseExternalReference(ref: unknown): { orgId: string; months: number } | null {
  if (typeof ref !== 'string') return null;
  const [orgId, monthsText, ...rest] = ref.split(':');
  if (rest.length || !orgId || !UUID.test(orgId)) return null;
  const months = Number(monthsText);
  if (!Number.isInteger(months) || months < 1 || months > MAX_MONTHS) return null;
  return { orgId: orgId.toLowerCase(), months };
}

export function validMonths(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_MONTHS;
}

/**
 * Endereços do Asaas. O ambiente vem de ASAAS_ENV ("sandbox" ou "production");
 * sem ele, a chave diz: chaves de teste têm "_hmlg_" ($aact_hmlg_...).
 */
export function asaasUrls(apiKey: string, env?: string | null): { api: string; web: string; sandbox: boolean } {
  const sandbox = env ? env.toLowerCase() === 'sandbox' : apiKey.includes('_hmlg_');
  return sandbox
    ? { api: 'https://api-sandbox.asaas.com/v3', web: 'https://sandbox.asaas.com', sandbox }
    : { api: 'https://api.asaas.com/v3', web: 'https://asaas.com', sandbox };
}

export function checkoutLink(webBase: string, checkoutId: string): string {
  return `${webBase}/checkoutSession/show?id=${encodeURIComponent(checkoutId)}`;
}

/** Forma de pagamento pedida pelo painel. */
export type PayMethod = 'pix' | 'card';

export function parseMethod(value: unknown): PayMethod | null {
  if (value === undefined || value === null || value === 'card') return 'card';
  return value === 'pix' ? 'pix' : null;
}

const ASAAS_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Extrai o evento e o id da cobrança do aviso do Asaas ({ event, payment: { id } }). */
export function readAsaasEvent(body: unknown): { event: string | null; paymentId: string | null } {
  const b = (body && typeof body === 'object' ? body : {}) as { event?: unknown; payment?: { id?: unknown } };
  const event = typeof b.event === 'string' ? b.event : null;
  const rawId = b.payment?.id;
  const paymentId = typeof rawId === 'string' && ASAAS_ID.test(rawId) ? rawId : null;
  return { event, paymentId };
}

/** Comparação em tempo constante (não vaza o token pelo tempo de resposta). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Confere o cabeçalho asaas-access-token com o token cadastrado no webhook. */
export function validWebhookToken(expected: string, received: string | null): boolean {
  return Boolean(expected) && received !== null && safeEqual(expected, received);
}
