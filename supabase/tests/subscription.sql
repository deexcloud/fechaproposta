-- =====================================================================
-- Teste da assinatura: teste grátis, bloqueio no banco e administração.
-- Tudo é desfeito no final (ROLLBACK). Sucesso: última linha "ASSINATURA OK".
-- =====================================================================

begin;

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000e1', 'assinante@teste.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e2', 'admin@teste.local', 'authenticated', 'authenticated');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select set_config('test.org', (select id::text from public.create_organization('Consultoria Teste')), true);
select set_config('test.p1', public.save_proposal(current_setting('test.org')::uuid, null,
  '{"title":"Consultoria mensal","client":{"name":"Cliente Fiel"},"items":[{"name":"Hora","quantity":10,"unit_price":200}]}'::jsonb)::text, true);
select public.send_proposal(current_setting('test.p1')::uuid);

do $$
declare
  v_org public.organizations;
begin
  select * into v_org from public.organizations where id = current_setting('test.org')::uuid;
  if v_org.trial_ends_at < now() + interval '6 days 23 hours' then
    raise exception 'FALHOU: teste grátis menor que 7 dias';
  end if;
  -- O painel não consegue se dar mais dias nem meses pagos.
  begin
    update public.organizations set paid_until = now() + interval '1 year' where id = v_org.id;
    raise exception 'FALHOU: painel alterou paid_until';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.organizations set trial_ends_at = now() + interval '1 year' where id = v_org.id;
    raise exception 'FALHOU: painel alterou trial_ends_at';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.organizations set next_proposal_number = 1 where id = v_org.id;
    raise exception 'FALHOU: painel alterou a numeração';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.platform_add_paid_months(v_org.id, 12);
    raise exception 'FALHOU: não administrador liberou meses';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.platform_list_organizations();
    raise exception 'FALHOU: não administrador listou empresas';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- ---------- Teste vence ----------
reset role;
update public.organizations set trial_ends_at = now() - interval '1 minute' where id = current_setting('test.org')::uuid;
select set_config('test.token', (select share_token::text from public.proposals where id = current_setting('test.p1')::uuid), true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
do $$
declare
  v_org uuid := current_setting('test.org')::uuid;
  v_p public.proposals;
begin
  select * into v_p from public.proposals where id = current_setting('test.p1')::uuid;

  begin
    perform public.save_proposal(v_org, null, jsonb_build_object('title', 'Nova', 'client_id', v_p.client_id,
      'items', '[{"name":"a","quantity":1,"unit_price":1}]'::jsonb));
    raise exception 'FALHOU: criou proposta com assinatura vencida';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
  begin
    perform public.duplicate_proposal(v_p.id);
    raise exception 'FALHOU: duplicou com assinatura vencida';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
  begin
    perform public.send_proposal(v_p.id);
    raise exception 'FALHOU: enviou com assinatura vencida';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  -- Os dados continuam visíveis para a equipe.
  if (select count(*) from public.proposals where organization_id = v_org) <> 1 then
    raise exception 'FALHOU: dados sumiram com a assinatura vencida';
  end if;
end;
$$;

-- O cliente ainda consegue aceitar o que já recebeu.
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select public.accept_public_proposal(current_setting('test.token')::uuid, 'Cliente Fiel', null, 'typed', null, '{}');

-- ---------- Administração da plataforma libera ----------
reset role;
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000e2');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
do $$
declare
  v_org uuid := current_setting('test.org')::uuid;
  v_list jsonb;
  v_result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'FALHOU: admin não reconhecido'; end if;
  v_list := public.platform_list_organizations();
  if jsonb_array_length(v_list) <> 1 or (v_list -> 0 ->> 'proposals')::int <> 1 or (v_list -> 0 ->> 'accepted_30d')::int <> 1 then
    raise exception 'FALHOU: lista do admin %', v_list;
  end if;
  v_result := public.platform_add_paid_months(v_org, 1);
  if (v_result ->> 'paid_until')::timestamptz < now() + interval '27 days' then
    raise exception 'FALHOU: meses não liberados';
  end if;
  -- Admin não vira membro da empresa: continua sem ver as propostas.
  if (select count(*) from public.proposals) <> 0 then
    raise exception 'FALHOU: admin enxerga propostas das empresas';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
do $$
begin
  perform public.save_proposal(current_setting('test.org')::uuid, null, jsonb_build_object(
    'title', 'Depois de pagar', 'client', jsonb_build_object('name', 'Cliente Novo'),
    'items', '[{"name":"a","quantity":1,"unit_price":1}]'::jsonb));
end;
$$;

-- Encerrar a assinatura bloqueia de novo.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select public.platform_end_subscription(current_setting('test.org')::uuid);

reset role;
do $$
begin
  if public.subscription_active(current_setting('test.org')::uuid) then
    raise exception 'FALHOU: assinatura encerrada continua ativa';
  end if;
end;
$$;

select 'ASSINATURA OK' as resultado;

rollback;
