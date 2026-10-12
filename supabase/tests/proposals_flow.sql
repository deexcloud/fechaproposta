-- =====================================================================
-- Teste do ciclo da proposta: criar, enviar, abrir, pedir ajuste, aceitar.
-- Tudo é desfeito no final (ROLLBACK). Sucesso: última linha "PROPOSTAS OK".
-- =====================================================================

begin;

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'dono@teste.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d2', 'atendente@teste.local', 'authenticated', 'authenticated');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select set_config('test.org', (select id::text from public.create_organization('Agência Teste')), true);

-- Proposta com 2 itens fixos, 1 opcional e desconto.
select set_config('test.p1', public.save_proposal(current_setting('test.org')::uuid, null, '{
  "title": "Site novo",
  "client": {"name": "Maria Cliente", "email": "MARIA@cliente.com", "whatsapp": "(11) 98888-7777"},
  "summary": "Um site que vende.",
  "deliverables": ["Layout", "  ", "Publicação"],
  "discount": 100,
  "items": [
    {"name": "Design", "quantity": 1, "unit_price": 2000},
    {"name": "Páginas extras", "quantity": 3, "unit_price": 300},
    {"name": "Blog", "quantity": 1, "unit_price": 800, "is_optional": true}
  ]
}'::jsonb)::text, true);

do $$
declare
  v_p public.proposals;
  v_client public.clients;
begin
  select * into v_p from public.proposals where id = current_setting('test.p1')::uuid;
  if v_p.code <> 'FP-0001' then raise exception 'FALHOU: código %', v_p.code; end if;
  if v_p.total_amount <> 2800 then raise exception 'FALHOU: total % (esperado 2800)', v_p.total_amount; end if;
  if v_p.optional_amount <> 800 then raise exception 'FALHOU: opcionais %', v_p.optional_amount; end if;
  if v_p.deliverables <> array['Layout', 'Publicação'] then raise exception 'FALHOU: entregas %', v_p.deliverables; end if;
  if v_p.status <> 'draft' then raise exception 'FALHOU: status inicial %', v_p.status; end if;
  if v_p.valid_until <> public._today() + 15 then raise exception 'FALHOU: validade padrão %', v_p.valid_until; end if;

  select * into v_client from public.clients where id = v_p.client_id;
  if v_client.email <> 'maria@cliente.com' or v_client.whatsapp <> '11988887777' then
    raise exception 'FALHOU: cliente gravado como % / %', v_client.email, v_client.whatsapp;
  end if;

  -- Desconto maior que os itens é recusado.
  begin
    perform public.save_proposal(current_setting('test.org')::uuid, null, jsonb_build_object(
      'title', 'Desconto demais', 'client_id', v_p.client_id, 'discount', 50,
      'items', '[{"name":"a","quantity":1,"unit_price":10}]'::jsonb));
    raise exception 'FALHOU: aceitou desconto maior que o total';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  -- Só opcionais não pode.
  begin
    perform public.save_proposal(current_setting('test.org')::uuid, null, jsonb_build_object(
      'title', 'Só opcional', 'client_id', v_p.client_id,
      'items', '[{"name":"a","quantity":1,"unit_price":10,"is_optional":true}]'::jsonb));
    raise exception 'FALHOU: aceitou proposta só com opcionais';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  -- Validade no passado é recusada.
  begin
    perform public.save_proposal(current_setting('test.org')::uuid, null, jsonb_build_object(
      'title', 'Vencida', 'client_id', v_p.client_id, 'valid_until', (public._today() - 1)::text,
      'items', '[{"name":"a","quantity":1,"unit_price":10}]'::jsonb));
    raise exception 'FALHOU: aceitou validade no passado';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
end;
$$;

select set_config('test.token', (select share_token::text from public.proposals where id = current_setting('test.p1')::uuid), true);

-- ---------- Rascunho não aparece no link ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  if public.get_public_proposal(current_setting('test.token')::uuid) is not null then
    raise exception 'FALHOU: rascunho visível no link público';
  end if;
  -- Abrir um rascunho não conta visualização.
  perform public.register_proposal_view(current_setting('test.token')::uuid);
end;
$$;

-- ---------- Envio ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$
declare
  v_result jsonb;
begin
  v_result := public.send_proposal(current_setting('test.p1')::uuid);
  if v_result ->> 'status' <> 'sent' or v_result ->> 'share_token' <> current_setting('test.token') then
    raise exception 'FALHOU: envio devolveu %', v_result;
  end if;
  -- A equipe abrindo o próprio link não conta.
  perform public.register_proposal_view(current_setting('test.token')::uuid);
  if (select view_count from public.proposals where id = current_setting('test.p1')::uuid) <> 0 then
    raise exception 'FALHOU: visualização da equipe foi contada';
  end if;
end;
$$;

-- ---------- Cliente abre, pede ajuste ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare
  v_token uuid := current_setting('test.token')::uuid;
  v_public jsonb;
begin
  v_public := public.get_public_proposal(v_token);
  if v_public is null or v_public ->> 'status' <> 'sent' then
    raise exception 'FALHOU: proposta enviada não abriu (%).', v_public ->> 'status';
  end if;
  if v_public #>> '{organization,name}' <> 'Agência Teste' or jsonb_array_length(v_public -> 'items') <> 3 then
    raise exception 'FALHOU: conteúdo público incompleto';
  end if;
  if v_public ? 'organization_id' or v_public ? 'share_token' then
    raise exception 'FALHOU: dados internos expostos no link';
  end if;

  perform public.register_proposal_view(v_token);
  perform public.register_proposal_view(v_token);

  begin
    perform public.request_proposal_changes(v_token, 'Maria', '');
    raise exception 'FALHOU: pedido de ajuste vazio aceito';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
  perform public.request_proposal_changes(v_token, 'Maria', 'Dá para dividir em 3 vezes?');

  v_public := public.get_public_proposal(v_token);
  if v_public ->> 'status' <> 'negotiating' or jsonb_array_length(v_public -> 'messages') <> 1 then
    raise exception 'FALHOU: ajuste não registrado (%).', v_public ->> 'status';
  end if;
end;
$$;

-- ---------- Equipe vê a visualização e ajusta a proposta em negociação ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$
declare
  v_p public.proposals;
begin
  select * into v_p from public.proposals where id = current_setting('test.p1')::uuid;
  if v_p.view_count <> 2 or v_p.first_viewed_at is null then
    raise exception 'FALHOU: visualizações % / %', v_p.view_count, v_p.first_viewed_at;
  end if;
  if (select count(*) from public.proposal_events where proposal_id = v_p.id and kind = 'viewed') <> 1 then
    raise exception 'FALHOU: aberturas seguidas viraram mais de um evento';
  end if;

  perform public.save_proposal(v_p.organization_id, v_p.id, jsonb_build_object(
    'title', 'Site novo (3x sem juros)', 'client_id', v_p.client_id, 'terms', 'Em 3 vezes.',
    'items', '[
      {"name":"Design","quantity":1,"unit_price":2000},
      {"name":"Blog","quantity":1,"unit_price":800,"is_optional":true}
    ]'::jsonb));

  select * into v_p from public.proposals where id = v_p.id;
  if v_p.status <> 'negotiating' or v_p.total_amount <> 2000 or v_p.code <> 'FP-0001' then
    raise exception 'FALHOU: edição em negociação (% / % / %)', v_p.status, v_p.total_amount, v_p.code;
  end if;
  if not exists (select 1 from public.proposal_events where proposal_id = v_p.id and kind = 'updated') then
    raise exception 'FALHOU: alteração após envio não ficou na linha do tempo';
  end if;
end;
$$;

-- ---------- Cliente aceita com o opcional ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.headers', '{"x-forwarded-for":"200.1.2.3, 10.0.0.1","user-agent":"Teste/1.0"}', true);
do $$
declare
  v_token uuid := current_setting('test.token')::uuid;
  v_optional uuid;
  v_result jsonb;
begin
  -- Item que não é opcional (ou de outra proposta) não pode ser marcado.
  begin
    perform public.accept_public_proposal(v_token, 'Maria Cliente', null, 'typed', null, array[gen_random_uuid()]);
    raise exception 'FALHOU: aceitou opcional desconhecido';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  begin
    perform public.accept_public_proposal(v_token, 'Maria Cliente', null, 'drawn', 'javascript:alert(1)', '{}');
    raise exception 'FALHOU: aceitou assinatura desenhada inválida';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  select (item ->> 'id')::uuid into v_optional
  from jsonb_array_elements(public.get_public_proposal(v_token) -> 'items') item
  where (item ->> 'is_optional')::boolean;

  v_result := public.accept_public_proposal(v_token, 'Maria Cliente', 'maria@cliente.com', 'typed', null, array[v_optional]);
  if (v_result ->> 'total')::numeric <> 2800 then
    raise exception 'FALHOU: total aceito % (esperado 2800)', v_result ->> 'total';
  end if;

  begin
    perform public.accept_public_proposal(v_token, 'Maria Cliente', null, 'typed', null, '{}');
    raise exception 'FALHOU: aceitou duas vezes';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  begin
    perform 1 from public.proposal_acceptances;
    raise exception 'FALHOU: anônimo leu os aceites';
  exception when insufficient_privilege then null;
  end;

  if public.get_public_proposal(v_token) #>> '{acceptance,signer_name}' <> 'Maria Cliente' then
    raise exception 'FALHOU: aceite não aparece para o cliente';
  end if;
end;
$$;

-- ---------- Aceita fica travada ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$
declare
  v_p public.proposals;
  v_a public.proposal_acceptances;
begin
  select * into v_p from public.proposals where id = current_setting('test.p1')::uuid;
  select * into v_a from public.proposal_acceptances where proposal_id = v_p.id;
  if v_p.status <> 'accepted' or v_p.accepted_total <> 2800 then
    raise exception 'FALHOU: proposta aceita com % / %', v_p.status, v_p.accepted_total;
  end if;
  if v_a.ip <> '200.1.2.3' or v_a.user_agent <> 'Teste/1.0' or char_length(v_a.content_hash) <> 64 then
    raise exception 'FALHOU: trilha do aceite incompleta (% / % / %)', v_a.ip, v_a.user_agent, v_a.content_hash;
  end if;
  if v_a.snapshot ->> 'title' <> 'Site novo (3x sem juros)' or v_a.signature_data <> 'Maria Cliente' then
    raise exception 'FALHOU: cópia congelada errada';
  end if;

  begin
    perform public.save_proposal(v_p.organization_id, v_p.id, jsonb_build_object(
      'title', 'Mudando depois do aceite', 'client_id', v_p.client_id,
      'items', '[{"name":"a","quantity":1,"unit_price":1}]'::jsonb));
    raise exception 'FALHOU: editou proposta aceita';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  begin
    perform public.delete_proposal(v_p.id);
    raise exception 'FALHOU: apagou proposta aceita';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  begin
    update public.proposal_acceptances set total = 1;
    raise exception 'FALHOU: alterou o registro do aceite';
  exception when insufficient_privilege then null;
  end;

  -- Duplicar cria rascunho novo com os mesmos itens.
  perform set_config('test.p2', public.duplicate_proposal(v_p.id)::text, true);
end;
$$;

do $$
declare
  v_p public.proposals;
begin
  select * into v_p from public.proposals where id = current_setting('test.p2')::uuid;
  if v_p.code <> 'FP-0002' or v_p.status <> 'draft' or v_p.total_amount <> 2000 or v_p.optional_amount <> 800 then
    raise exception 'FALHOU: cópia % / % / %', v_p.code, v_p.status, v_p.total_amount;
  end if;
  if v_p.share_token = current_setting('test.token')::uuid then
    raise exception 'FALHOU: cópia reaproveitou o link';
  end if;
  perform public.send_proposal(v_p.id);
end;
$$;

-- ---------- Validade vencida ----------
reset role;
update public.proposals set valid_until = public._today() - 1 where id = current_setting('test.p2')::uuid;
select set_config('test.token2', (select share_token::text from public.proposals where id = current_setting('test.p2')::uuid), true);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
declare
  v_token uuid := current_setting('test.token2')::uuid;
begin
  if public.get_public_proposal(v_token) ->> 'status' <> 'expired' then
    raise exception 'FALHOU: proposta vencida não aparece como expirada';
  end if;
  begin
    perform public.accept_public_proposal(v_token, 'Maria Cliente', null, 'typed', null, '{}');
    raise exception 'FALHOU: aceitou proposta vencida';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
end;
$$;

-- ---------- Equipe renova a validade, cliente recusa, equipe reabre ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$
declare
  v_p public.proposals;
begin
  select * into v_p from public.proposals where id = current_setting('test.p2')::uuid;
  begin
    perform public.send_proposal(v_p.id);
    raise exception 'FALHOU: reenviou proposta vencida sem atualizar a data';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
  perform public.save_proposal(v_p.organization_id, v_p.id, jsonb_build_object(
    'title', v_p.title, 'client_id', v_p.client_id, 'valid_until', (public._today() + 10)::text,
    'items', '[{"name":"Design","quantity":1,"unit_price":2000}]'::jsonb));
end;
$$;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select public.decline_public_proposal(current_setting('test.token2')::uuid, 'Maria', 'Fechei com outro fornecedor.');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$
declare
  v_id uuid := current_setting('test.p2')::uuid;
begin
  if (select status from public.proposals where id = v_id) <> 'declined' then
    raise exception 'FALHOU: recusa não registrada';
  end if;
  perform public.reopen_proposal(v_id);
  if (select status from public.proposals where id = v_id) <> 'draft' then
    raise exception 'FALHOU: reabrir não voltou para rascunho';
  end if;
end;
$$;

-- ---------- Aceite registrado pela equipe ----------
do $$
declare
  v_org uuid := current_setting('test.org')::uuid;
  v_id uuid;
begin
  v_id := public.save_proposal(v_org, null, jsonb_build_object(
    'title', 'Fechado no WhatsApp', 'client_id', (select client_id from public.proposals where id = current_setting('test.p1')::uuid),
    'items', '[{"name":"Consultoria","quantity":2,"unit_price":500}]'::jsonb));
  perform public.record_manual_acceptance(v_id, 'Maria Cliente', '{}', 'Aprovou por mensagem.');
  if (select status from public.proposals where id = v_id) <> 'accepted'
     or (select signature_mode from public.proposal_acceptances where proposal_id = v_id) <> 'manual' then
    raise exception 'FALHOU: aceite manual';
  end if;
end;
$$;

-- ---------- Atendente: apaga só o próprio rascunho ----------
reset role;
insert into public.organization_members (organization_id, user_id, role)
values (current_setting('test.org')::uuid, '00000000-0000-0000-0000-0000000000d2', 'staff');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
do $$
declare
  v_org uuid := current_setting('test.org')::uuid;
  v_own uuid;
begin
  begin
    perform public.delete_proposal(current_setting('test.p2')::uuid);
    raise exception 'FALHOU: atendente apagou proposta de outra pessoa';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.services (organization_id, name, unit_price) values (v_org, 'Preço do atendente', 1);
    raise exception 'FALHOU: atendente alterou o catálogo';
  exception when insufficient_privilege then null;
  end;
  v_own := public.save_proposal(v_org, null, jsonb_build_object(
    'title', 'Rascunho do atendente', 'client', jsonb_build_object('name', 'Outro Cliente'),
    'items', '[{"name":"a","quantity":1,"unit_price":1}]'::jsonb));
  perform public.delete_proposal(v_own);
end;
$$;

reset role;

select 'PROPOSTAS OK' as resultado;

rollback;
