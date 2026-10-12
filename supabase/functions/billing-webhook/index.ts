// Edge Function: recebe os avisos de cobrança do Asaas.
// Nunca confia no conteúdo do aviso: busca a cobrança na API do Asaas e só
// libera a empresa se ela estiver paga e tiver vindo de um checkout aberto pelo painel.
//
// Publicar SEM verificação de JWT (o Asaas não manda login):
//   supabase functions deploy billing-webhook --no-verify-jwt
//
// Segredos (Supabase → Edge Functions → Secrets):
//   ASAAS_API_KEY        Chave de API do Asaas
//   ASAAS_WEBHOOK_TOKEN  Token de autenticação cadastrado no webhook do Asaas (obrigatório)
//   ASAAS_ENV            Opcional: "sandbox" ou "production"
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem em toda Edge Function.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { asaasUrls, PAID_EVENTS, PAID_STATUSES, parseExternalReference, readAsaasEvent, validWebhookToken } from '../_shared/billing.ts';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') ?? '';
const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '';
const ASAAS = asaasUrls(ASAAS_API_KEY, Deno.env.get('ASAAS_ENV'));
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  // O Asaas só envia POST; qualquer outra coisa recebe 200 e é ignorada.
  if (req.method !== 'POST') return json({ ignored: true });

  if (!ASAAS_API_KEY || !ASAAS_WEBHOOK_TOKEN || !SERVICE_ROLE_KEY) return json({ error: 'Cobrança não configurada.' }, 503);
  if (!validWebhookToken(ASAAS_WEBHOOK_TOKEN, req.headers.get('asaas-access-token'))) {
    return json({ error: 'Token inválido.' }, 401);
  }

  const { event, paymentId } = readAsaasEvent(await req.json().catch(() => null));
  // Outros eventos (cobrança criada, vencida, estornada...) só recebem 200.
  if (!event || !PAID_EVENTS.includes(event) || !paymentId) return json({ ignored: true });

  const response = await fetch(`${ASAAS.api}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { access_token: ASAAS_API_KEY, 'User-Agent': 'FechaProposta' },
  });
  if (response.status === 404) return json({ ignored: true, reason: 'payment_not_found' });
  // Erro temporário: responder com falha faz o Asaas tentar de novo depois.
  if (!response.ok) return json({ error: 'Asaas indisponível.' }, 502);

  const payment = (await response.json()) as {
    id: string;
    status?: string;
    value?: number;
    billingType?: string;
    externalReference?: string | null;
    checkoutSession?: string | null;
    deleted?: boolean;
  };

  if (payment.deleted || !PAID_STATUSES.includes(payment.status ?? '')) {
    return json({ ignored: true, status: payment.status });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // A cobrança precisa ter vindo de um checkout aberto pelo painel (Pix ou cartão).
  // A referência gravada no checkout tem que bater (quando o Asaas a repassa à cobrança).
  if (!payment.checkoutSession) {
    console.warn('Cobrança fora de checkout do FechaProposta ignorada', payment.id);
    return json({ ignored: true, reason: 'not_from_checkout' });
  }
  const { data: checkout, error: checkoutError } = await admin
    .from('billing_checkouts')
    .select('organization_id, months')
    .eq('id', payment.checkoutSession)
    .maybeSingle();
  if (checkoutError) return json({ error: 'Falha ao consultar o checkout.' }, 500);
  if (!checkout) {
    console.warn('Checkout desconhecido ignorado', payment.id, payment.checkoutSession);
    return json({ ignored: true, reason: 'unknown_checkout' });
  }
  const ref = parseExternalReference(payment.externalReference);
  if (payment.externalReference && (!ref || ref.orgId !== checkout.organization_id || ref.months !== checkout.months)) {
    console.warn('Referência da cobrança não bate com o checkout', payment.id);
    return json({ ignored: true, reason: 'reference_mismatch' });
  }

  const { data, error } = await admin.rpc('billing_apply_payment', {
    p_payment_id: payment.id,
    p_org: checkout.organization_id,
    p_months: checkout.months,
    p_amount: payment.value ?? 0,
    p_method: payment.billingType ?? null,
  });

  if (error) {
    console.error('Falha ao aplicar pagamento', payment.id, error.message);
    // Regra de negócio (valor menor, empresa inexistente): tentar de novo não resolve.
    if (error.code === 'P0001') return json({ ignored: true, reason: error.message });
    return json({ error: 'Falha ao registrar o pagamento.' }, 500);
  }
  return json(data);
});
