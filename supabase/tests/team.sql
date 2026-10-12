-- =====================================================================
-- Teste da equipe: convite por link, perfis e permissões.
-- Tudo é desfeito no final (ROLLBACK). Sucesso: última linha "EQUIPE OK".
-- =====================================================================

begin;

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000f1', 'dona@teste.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f2', 'vendedor@teste.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f3', 'curioso@teste.local', 'authenticated', 'authenticated');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
select set_config('test.org', (select id::text from public.create_organization('Escritório Teste')), true);
select set_config('test.token', (select token::text from public.create_invitation(current_setting('test.org')::uuid, 'VENDEDOR@teste.local', 'staff')), true);

do $$
begin
  if (select email from public.organizations where id = current_setting('test.org')::uuid) <> 'dona@teste.local' then
    raise exception 'FALHOU: e-mail da empresa não veio da conta';
  end if;
  begin
    perform public.create_invitation(current_setting('test.org')::uuid, 'outra@teste.local', 'owner');
    raise exception 'FALHOU: convidou outro dono';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
end;
$$;

-- Outra pessoa não usa o convite de alguém.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f3","role":"authenticated"}', true);
do $$
begin
  perform public.accept_invitation(current_setting('test.token')::uuid);
  raise exception 'FALHOU: convite aceito por outro e-mail';
exception when raise_exception then
  if sqlerrm like 'FALHOU%' then raise; end if;
end;
$$;

-- O convidado entra como atendente.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);
do $$
declare
  v_org uuid := current_setting('test.org')::uuid;
begin
  if public.accept_invitation(current_setting('test.token')::uuid) <> v_org then
    raise exception 'FALHOU: convite não devolveu a empresa';
  end if;
  if not public.is_org_member(v_org) or public.can_manage_org(v_org) then
    raise exception 'FALHOU: perfil do convidado errado';
  end if;
  -- Atendente não convida nem altera a empresa.
  begin
    perform public.create_invitation(v_org, 'mais@teste.local', 'staff');
    raise exception 'FALHOU: atendente convidou';
  exception when insufficient_privilege then null;
  end;
  update public.organizations set name = 'Mudou' where id = v_org;
  if (select name from public.organizations where id = v_org) <> 'Escritório Teste' then
    raise exception 'FALHOU: atendente alterou a empresa';
  end if;
  -- Mas cria propostas.
  perform public.save_proposal(v_org, null, '{"title":"Do vendedor","client":{"name":"Cliente X"},"items":[{"name":"a","quantity":1,"unit_price":5}]}'::jsonb);
end;
$$;

-- Dona promove e depois remove.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
do $$
declare
  v_org uuid := current_setting('test.org')::uuid;
begin
  if (select count(*) from public.list_members(v_org)) <> 2 then
    raise exception 'FALHOU: equipe deveria ter 2 pessoas';
  end if;
  perform public.update_member_role(v_org, '00000000-0000-0000-0000-0000000000f2', 'manager');
  begin
    perform public.remove_member(v_org, '00000000-0000-0000-0000-0000000000f1');
    raise exception 'FALHOU: removeu a dona';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
  perform public.remove_member(v_org, '00000000-0000-0000-0000-0000000000f2');
  if (select count(*) from public.list_members(v_org)) <> 1 then
    raise exception 'FALHOU: remoção não aconteceu';
  end if;
end;
$$;

reset role;

select 'EQUIPE OK' as resultado;

rollback;
