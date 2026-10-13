-- =====================================================================
-- Teste da cobrança (aplicação de pagamento confirmado pelo webhook)
-- Tudo é desfeito no final (ROLLBACK). Sucesso: última linha "COBRANCA OK".
-- =====================================================================

begin;

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'cobranca@teste.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c2', 'outro@teste.local', 'authenticated', 'authenticated');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select set_config('test.org', (select id::text from public.create_organization('Empresa Cobrança')), true);

do $$
begin
  -- O painel não consegue se dar meses de assinatura.
  begin
    perform public.billing_apply_payment('fake-1', current_setting('test.org')::uuid, 12, 708, 'pix');
    raise exception 'FALHOU: painel aplicou pagamento.';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.billing_payments (id, organization_id, months, amount, paid_until_after)
    values ('fake-2', current_setting('test.org')::uuid, 12, 708, now() + interval '1 year');
    raise exception 'FALHOU: painel inseriu pagamento.';
  exception when insufficient_privilege then null;
  end;
  -- Nem forja nem lê os checkouts do Asaas (só o servidor mexe).
  begin
    insert into public.billing_checkouts (id, organization_id, months)
    values ('chk-falso', current_setting('test.org')::uuid, 12);
    raise exception 'FALHOU: painel registrou checkout.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.billing_checkouts;
    raise exception 'FALHOU: painel leu checkouts.';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- ---------- Servidor (webhook) aplica o pagamento ----------
reset role;

do $$
declare
  v_org uuid := current_setting('test.org')::uuid;
  v_trial timestamptz;
  v_result jsonb;
  v_until timestamptz;
begin
  select trial_ends_at into v_trial from public.organizations where id = v_org;

  -- Valor menor que o preço é recusado.
  begin
    perform public.billing_apply_payment('pay_100', v_org, 1, 1.00, 'pix');
    raise exception 'FALHOU: aceitou valor menor.';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  -- Pago durante o teste: 1 mês começa no fim do teste (não perde os dias).
  v_result := public.billing_apply_payment('pay_101', v_org, 1, public.billing_price(1), 'PIX');
  v_until := (v_result ->> 'paid_until')::timestamptz;
  if not (v_result ->> 'applied')::boolean then
    raise exception 'FALHOU: pagamento não aplicado.';
  end if;
  if v_until < v_trial + interval '27 days' then
    raise exception 'FALHOU: perdeu os dias do teste (% vs %).', v_until, v_trial;
  end if;

  -- O mesmo pagamento avisado de novo (cartão: CONFIRMED e depois RECEIVED) conta uma vez.
  v_result := public.billing_apply_payment('pay_101', v_org, 1, public.billing_price(1), 'PIX');
  if (v_result ->> 'applied')::boolean then
    raise exception 'FALHOU: pagamento repetido foi aplicado de novo.';
  end if;
  if (select paid_until from public.organizations where id = v_org) <> v_until then
    raise exception 'FALHOU: paid_until mudou com pagamento repetido.';
  end if;

  -- Outro pagamento soma ao vencimento atual.
  v_result := public.billing_apply_payment('pay_102', v_org, 1, public.billing_price(1), 'CREDIT_CARD');
  if (v_result ->> 'paid_until')::timestamptz < v_until + interval '27 days' then
    raise exception 'FALHOU: segundo pagamento não somou.';
  end if;

  -- Anual tem desconto (R$ 59/mês), mas não aceita menos que o preço do pacote.
  if public.billing_price(12) >= public.billing_price(1) * 12 then
    raise exception 'FALHOU: anual sem desconto.';
  end if;
  begin
    perform public.billing_apply_payment('pay_103', v_org, 12, public.billing_price(12) - 1, 'PIX');
    raise exception 'FALHOU: aceitou anual com valor menor.';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
  v_result := public.billing_apply_payment('pay_104', v_org, 12, public.billing_price(12), 'PIX');
  if not (v_result ->> 'applied')::boolean then
    raise exception 'FALHOU: anual não aplicado.';
  end if;
end;
$$;

-- ---------- Quem vê o histórico ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.billing_payments) <> 3 then
    raise exception 'FALHOU: dono deveria ver 3 pagamentos.';
  end if;
end;
$$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.billing_payments) <> 0 then
    raise exception 'FALHOU: outro usuário viu pagamentos de outra empresa.';
  end if;
end;
$$;

select 'COBRANCA OK' as resultado;

rollback;
