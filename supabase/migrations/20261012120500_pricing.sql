-- =====================================================================
-- FechaProposta — Preço por período (mensal, semestral e anual)
--
--   1 mês   R$  79,00             (R$ 79/mês)
--   6 meses R$ 414,00             (R$ 69/mês, 12% de desconto)
--  12 meses R$ 708,00             (R$ 59/mês, 25% de desconto)
--
-- Ao mudar, atualize também PLANS em src/lib/pricing.ts (textos do site)
-- e PLAN_MONTHS em supabase/functions/_shared/billing.ts.
-- =====================================================================

-- Preço do plano mensal (referência para quem paga mês a mês).
create or replace function public.billing_monthly_price()
returns numeric
language sql
immutable
set search_path = ''
as $$
  select 79.00::numeric;
$$;

-- Total cobrado por um período. Períodos fora da tabela pagam o preço mensal cheio.
create or replace function public.billing_price(p_months integer)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case p_months
    when 12 then 708.00
    when 6 then 414.00
    else public.billing_monthly_price() * p_months
  end::numeric;
$$;

grant execute on function public.billing_price(integer) to anon, authenticated, service_role;

-- Mesma função de antes; muda só a conferência do valor pago (agora pelo período).
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
  if p_amount is null or p_amount + 0.009 < public.billing_price(p_months) then
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
