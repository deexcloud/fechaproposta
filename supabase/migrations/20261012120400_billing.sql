-- =====================================================================
-- FechaProposta — Cobrança da assinatura pelo Asaas (Checkout + webhook)
--
-- Fluxo:
--   1. O painel chama a Edge Function billing-checkout, que cria um Checkout
--      no Asaas (Pix ou cartão), guarda em billing_checkouts de qual empresa
--      ele é e devolve o link.
--   2. Quando o pagamento é confirmado, o Asaas avisa a Edge Function
--      billing-webhook (PAYMENT_CONFIRMED / PAYMENT_RECEIVED), que relê a
--      cobrança na API do Asaas e chama billing_apply_payment() com a chave
--      service_role (só no servidor).
--   3. billing_apply_payment() registra o pagamento uma única vez e estende
--      paid_until. Pagar durante o teste não desperdiça os dias restantes.
-- =====================================================================

-- Preço mensal (fonte única para a cobrança). Ao mudar, atualize também
-- PRICE_MONTHLY em src/lib/pricing.ts (texto da página de vendas).
create or replace function public.billing_monthly_price()
returns numeric
language sql
immutable
set search_path = ''
as $$
  select 59.00::numeric;
$$;

grant execute on function public.billing_monthly_price() to anon, authenticated, service_role;

create table public.billing_payments (
  -- id da cobrança no Asaas (pay_...)
  id text primary key check (char_length(id) between 1 and 64),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  months integer not null check (months between 1 and 24),
  amount numeric(10, 2) not null check (amount > 0),
  method text,
  paid_until_after timestamptz not null,
  created_at timestamptz not null default now()
);

create index billing_payments_org_idx on public.billing_payments (organization_id, created_at desc);

alter table public.billing_payments enable row level security;
revoke all on table public.billing_payments from anon, authenticated;
grant select on table public.billing_payments to authenticated;

-- Dono e gerente veem os pagamentos da própria empresa.
create policy billing_payments_select on public.billing_payments
  for select to authenticated
  using (public.can_manage_org(organization_id));

-- Checkouts abertos pelo painel: ligam o checkout do Asaas à empresa e aos meses.
create table public.billing_checkouts (
  id text primary key check (char_length(id) between 1 and 64),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  months integer not null check (months between 1 and 24),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index billing_checkouts_org_idx on public.billing_checkouts (organization_id, created_at desc);

-- Só o servidor (service_role) lê e grava.
alter table public.billing_checkouts enable row level security;
revoke all on table public.billing_checkouts from anon, authenticated;

-- Aplica um pagamento confirmado. Idempotente: o mesmo pagamento nunca conta duas vezes.
create or replace function public.billing_apply_payment(
  p_payment_id text,
  p_org uuid,
  p_months integer,
  p_amount numeric,
  p_method text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted text;
  v_until timestamptz;
begin
  if p_months is null or p_months < 1 or p_months > 24 then
    raise exception 'Quantidade de meses inválida.' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount + 0.009 < public.billing_monthly_price() * p_months then
    raise exception 'Valor pago menor que o preço da assinatura.' using errcode = 'P0001';
  end if;

  -- Trava a empresa: dois avisos simultâneos do mesmo pagamento não somam duas vezes.
  perform 1 from public.organizations where id = p_org for update;
  if not found then
    raise exception 'Empresa não encontrada.' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.billing_payments where id = p_payment_id) then
    return jsonb_build_object('applied', false, 'reason', 'already_applied');
  end if;

  update public.organizations o
     set paid_until = greatest(coalesce(o.paid_until, now()), o.trial_ends_at, now()) + make_interval(months => p_months)
   where o.id = p_org
  returning o.paid_until into v_until;

  insert into public.billing_payments (id, organization_id, months, amount, method, paid_until_after)
  values (p_payment_id, p_org, p_months, p_amount, left(p_method, 40), v_until)
  on conflict (id) do nothing
  returning id into v_inserted;

  return jsonb_build_object('applied', v_inserted is not null, 'paid_until', v_until);
end;
$$;

revoke execute on function public.billing_apply_payment(text, uuid, integer, numeric, text) from public, anon, authenticated;
grant execute on function public.billing_apply_payment(text, uuid, integer, numeric, text) to service_role;
