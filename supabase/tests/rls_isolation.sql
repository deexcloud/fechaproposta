-- =====================================================================
-- Teste de isolamento entre empresas (RLS)
--
-- Como rodar: npm run test:db, ou cole no SQL Editor do Supabase.
-- Tudo é desfeito no final (ROLLBACK). Sucesso: última linha "RLS OK".
-- =====================================================================

begin;

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-0000-0000-00000000000a', 'rls-a@teste.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'rls-b@teste.local', 'authenticated', 'authenticated');

-- ---------- Usuário A cria a empresa A, um cliente, um serviço e uma proposta ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select set_config('test.org_a', (select id::text from public.create_organization('Estúdio A')), true);

insert into public.services (organization_id, name, unit_price)
values (current_setting('test.org_a')::uuid, 'Identidade visual', 3000);
insert into public.proposal_templates (organization_id, name)
values (current_setting('test.org_a')::uuid, 'Modelo A');

select set_config('test.proposal_a', public.save_proposal(
  current_setting('test.org_a')::uuid, null,
  '{"title":"Site institucional","client":{"name":"Cliente da A","email":"cli@a.com"},
    "items":[{"name":"Design","quantity":1,"unit_price":2500}]}'::jsonb
)::text, true);

-- ---------- Usuário B cria a empresa B ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select set_config('test.org_b', (select id::text from public.create_organization('Estúdio B')), true);

do $$
declare
  v_org_a uuid := current_setting('test.org_a')::uuid;
  v_org_b uuid := current_setting('test.org_b')::uuid;
  v_prop_a uuid := current_setting('test.proposal_a')::uuid;
  v_count integer;
begin
  select count(*) into v_count from public.organizations;
  if v_count <> 1 then raise exception 'FALHOU: B enxerga % empresas', v_count; end if;

  select count(*) into v_count from public.organization_members where organization_id = v_org_a;
  if v_count <> 0 then raise exception 'FALHOU: B enxerga membros de A'; end if;

  select count(*) into v_count from public.clients where organization_id = v_org_a;
  if v_count <> 0 then raise exception 'FALHOU: B enxerga clientes de A'; end if;

  select count(*) into v_count from public.services where organization_id = v_org_a;
  if v_count <> 0 then raise exception 'FALHOU: B enxerga serviços de A'; end if;

  select count(*) into v_count from public.proposal_templates where organization_id = v_org_a;
  if v_count <> 0 then raise exception 'FALHOU: B enxerga modelos de A'; end if;

  select count(*) into v_count from public.proposals;
  if v_count <> 0 then raise exception 'FALHOU: B enxerga propostas de A'; end if;

  select count(*) into v_count from public.proposal_items;
  if v_count <> 0 then raise exception 'FALHOU: B enxerga itens de A'; end if;

  select count(*) into v_count from public.proposal_events;
  if v_count <> 0 then raise exception 'FALHOU: B enxerga a linha do tempo de A'; end if;

  -- B não altera nada de A (RLS filtra: 0 linhas)
  update public.organizations set name = 'Invadida' where id = v_org_a;
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FALHOU: B alterou a empresa A'; end if;

  update public.clients set name = 'Invadido' where organization_id = v_org_a;
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FALHOU: B alterou clientes de A'; end if;

  -- B não cadastra nada em A
  begin
    insert into public.clients (organization_id, name) values (v_org_a, 'Intruso');
    raise exception 'FALHOU: B cadastrou cliente em A';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.organization_members (organization_id, user_id, role)
    values (v_org_a, '00000000-0000-0000-0000-00000000000b', 'owner');
    raise exception 'FALHOU: B entrou como membro de A';
  exception when insufficient_privilege then null;
  end;

  -- Propostas: escrita direta é proibida, e as funções recusam a proposta de A.
  begin
    insert into public.proposals (organization_id, number, title, valid_until) values (v_org_b, 99, 'Direta', current_date + 5);
    raise exception 'FALHOU: proposta inserida direto na tabela';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.send_proposal(v_prop_a);
    raise exception 'FALHOU: B enviou a proposta de A';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  begin
    perform public.duplicate_proposal(v_prop_a);
    raise exception 'FALHOU: B duplicou a proposta de A';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  begin
    perform public.save_proposal(v_org_a, null, '{"title":"Intrusa","client":{"name":"X Y"},"items":[{"name":"a","quantity":1,"unit_price":1}]}'::jsonb);
    raise exception 'FALHOU: B criou proposta na empresa A';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.save_proposal(v_org_b, v_prop_a, '{"title":"Sequestro","client":{"name":"X Y"},"items":[{"name":"a","quantity":1,"unit_price":1}]}'::jsonb);
    raise exception 'FALHOU: B editou a proposta de A';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  -- B não usa um cliente de A numa proposta de B.
  begin
    perform public.save_proposal(v_org_b, null, jsonb_build_object(
      'title', 'Com cliente alheio',
      'client_id', (select p.client_id from public.proposals p where p.id = v_prop_a),
      'items', '[{"name":"a","quantity":1,"unit_price":1}]'::jsonb));
    raise exception 'FALHOU: B usou cliente de A';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  -- B não vê a equipe de A.
  select count(*) into v_count from public.list_members(v_org_a);
  if v_count <> 0 then raise exception 'FALHOU: B listou a equipe de A'; end if;
end;
$$;

-- ---------- Visitante anônimo não lê tabelas internas ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
begin
  begin
    perform 1 from public.organizations limit 1;
    raise exception 'FALHOU: anônimo leu organizations';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.proposals limit 1;
    raise exception 'FALHOU: anônimo leu proposals';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.clients limit 1;
    raise exception 'FALHOU: anônimo leu clients';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_proposal(current_setting('test.org_a')::uuid, null, '{}'::jsonb);
    raise exception 'FALHOU: anônimo chamou save_proposal';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

select 'RLS OK' as resultado;

rollback;
