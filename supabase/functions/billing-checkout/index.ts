// Edge Function: cria o Checkout do Asaas da assinatura e devolve o link.
// Só o dono ou gerente da empresa pode chamar.
//   method "pix"  → checkout só com Pix
//   method "card" → checkout só com cartão (padrão)
// Os dados de quem paga (nome, CPF) são preenchidos na página do Asaas; o sistema não guarda.
//
// Segredos (Supabase → Edge Functions → Secrets):
//   ASAAS_API_KEY  Chave de API do Asaas ($aact_prod_... ou, para testes, $aact_hmlg_...)
//   APP_URL        Endereço do site, sem barra no final, ex.: https://fechaproposta.vercel.app
//   ASAAS_ENV      Opcional: "sandbox" ou "production" (sem ele, a chave define)
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já existem em toda Edge Function.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { asaasUrls, buildExternalReference, checkoutLink, parseMethod, UUID, validMonths } from '../_shared/billing.ts';

const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/+$/, '');
const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') ?? '';
const ASAAS = asaasUrls(ASAAS_API_KEY, Deno.env.get('ASAAS_ENV'));
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function corsHeaders(origin: string | null): Record<string, string> {
  // Libera o site oficial e o ambiente de desenvolvimento local.
  const allowed = origin && (origin === APP_URL || /^http:\/\/localhost(:\d+)?$/.test(origin)) ? origin : APP_URL || 'null';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('origin'));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  if (!ASAAS_API_KEY || !APP_URL || !SERVICE_ROLE_KEY) return json({ error: 'O pagamento online ainda não foi configurado.' }, 503);

  const authorization = req.headers.get('authorization');
  if (!authorization) return json({ error: 'Faça login para continuar.' }, 401);

  // Cliente com o login do próprio usuário: as regras de acesso (RLS) valem normalmente.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return json({ error: 'Faça login para continuar.' }, 401);

  const body = (await req.json().catch(() => null)) as { organization_id?: unknown; months?: unknown; method?: unknown } | null;
  const orgId = typeof body?.organization_id === 'string' ? body.organization_id.toLowerCase() : '';
  const months = body?.months ?? 1;
  const method = parseMethod(body?.method);
  if (!UUID.test(orgId) || !validMonths(months) || !method) return json({ error: 'Pedido inválido.' }, 400);

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership || !['owner', 'manager'].includes(membership.role)) {
    return json({ error: 'Só o dono ou o gerente da empresa pode assinar.' }, 403);
  }

  const { data: org } = await supabase.from('organizations').select('name').eq('id', orgId).single();
  const { data: price, error: priceError } = await supabase.rpc('billing_monthly_price');
  if (!org || priceError || (typeof price !== 'number' && typeof price !== 'string')) {
    return json({ error: 'Não foi possível preparar o pagamento. Tente novamente.' }, 500);
  }
  const total = Math.round(Number(price) * months * 100) / 100;
  const back = `${APP_URL}/painel`;

  const response = await fetch(`${ASAAS.api}/checkouts`, {
    method: 'POST',
    headers: { access_token: ASAAS_API_KEY, 'Content-Type': 'application/json', 'User-Agent': 'FechaProposta' },
    body: JSON.stringify({
      // Sem boleto (demora dias para compensar) e sem parcelamento.
      billingTypes: [method === 'pix' ? 'PIX' : 'CREDIT_CARD'],
      chargeTypes: ['DETACHED'],
      minutesToExpire: 60,
      externalReference: buildExternalReference(orgId, months),
      callback: {
        successUrl: `${back}?assinatura=retorno`,
        cancelUrl: `${back}?assinatura=falhou`,
        expiredUrl: `${back}?assinatura=falhou`,
      },
      items: [
        {
          name: `FechaProposta — ${months} ${months === 1 ? 'mês' : 'meses'}`,
          description: `Assinatura de ${org.name}`.slice(0, 200),
          quantity: 1,
          value: total,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error('Asaas recusou o checkout', response.status, await response.text());
    return json({ error: 'Não foi possível abrir o pagamento agora. Tente novamente em instantes.' }, 502);
  }

  const created = (await response.json()) as { id?: string; link?: string };
  if (!created.id) return json({ error: 'Resposta inesperada do Asaas.' }, 502);

  // Guarda de qual empresa é o checkout: o webhook usa isso para liberar a empresa certa.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { error: saveError } = await admin
    .from('billing_checkouts')
    .insert({ id: created.id, organization_id: orgId, months, created_by: user.id });
  if (saveError) {
    console.error('Falha ao registrar o checkout', created.id, saveError.message);
    return json({ error: 'Não foi possível preparar o pagamento. Tente novamente.' }, 500);
  }

  return json({ method, url: created.link || checkoutLink(ASAAS.web, created.id) });
});
