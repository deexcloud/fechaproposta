-- =====================================================================
-- FechaProposta — Assinatura (teste grátis + paid_until) e /admin
--
-- Regras:
--   * Toda empresa nova ganha 7 dias de teste (trial_ends_at).
--   * A empresa está ativa enquanto o teste não venceu OU paid_until está no futuro.
--   * Empresa inativa não cria, edita nem envia propostas (bloqueio no banco).
--     Os dados continuam guardados e os links já enviados seguem abrindo
--     para o cliente, que ainda consegue aceitar.
--   * O painel NÃO altera essas datas (sem grant de update nas colunas).
--     Quem libera é o webhook do Asaas ou a administração da plataforma.
-- =====================================================================

alter table public.organizations
  add column trial_ends_at timestamptz not null default (now() + interval '7 days'),
  add column paid_until timestamptz;

comment on column public.organizations.trial_ends_at is 'Fim do teste grátis.';
comment on column public.organizations.paid_until is 'Assinatura paga até esta data (null = nunca pagou).';

create or replace function public.subscription_active(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select o.trial_ends_at > now() or coalesce(o.paid_until > now(), false)
     from public.organizations o where o.id = p_org),
    false
  );
$$;

revoke execute on function public.subscription_active(uuid) from public, anon, authenticated;

-- Chamado pelas funções que criam, alteram ou enviam propostas.
create or replace function public._require_subscription(p_org uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.subscription_active(p_org) then
    raise exception 'Seu período de acesso terminou. Assine para voltar a criar e enviar propostas.'
      using errcode = 'P0001', hint = 'subscription_inactive';
  end if;
end;
$$;

revoke execute on function public._require_subscription(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Administração da plataforma (dono do FechaProposta)
--
-- Para virar administrador, rode no SQL Editor:
--   insert into public.platform_admins (user_id)
--   select id from auth.users where email = 'seu-email@exemplo.com';
-- ---------------------------------------------------------------------

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
revoke all on table public.platform_admins from anon, authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and exists (select 1 from public.platform_admins a where a.user_id = auth.uid());
$$;

revoke execute on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public._require_platform_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso restrito à administração do FechaProposta.' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public._require_platform_admin() from public, anon, authenticated;

-- Empresas com a situação da assinatura e números básicos de uso.
create or replace function public.platform_list_organizations()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public._require_platform_admin();
  return coalesce((
    select jsonb_agg(row_to_json(s) order by s.created_at desc)
    from (
      select
        o.id,
        o.name,
        o.whatsapp,
        o.created_at,
        o.trial_ends_at,
        o.paid_until,
        owner.email as owner_email,
        coalesce(p.full_name, owner.raw_user_meta_data ->> 'full_name') as owner_name,
        (select count(*) from public.organization_members m where m.organization_id = o.id) as members,
        (select count(*) from public.proposals pr where pr.organization_id = o.id) as proposals,
        (select count(*) from public.proposals pr
          where pr.organization_id = o.id and pr.status = 'accepted'
            and pr.accepted_at >= now() - interval '30 days') as accepted_30d,
        (select max(pr.created_at) from public.proposals pr where pr.organization_id = o.id) as last_proposal_at
      from public.organizations o
      left join lateral (
        select u.id, u.email, u.raw_user_meta_data
        from public.organization_members m
        join auth.users u on u.id = m.user_id
        where m.organization_id = o.id and m.role = 'owner'
        order by m.created_at
        limit 1
      ) owner on true
      left join public.profiles p on p.id = owner.id
    ) s
  ), '[]'::jsonb);
end;
$$;

-- Soma meses de assinatura (a partir de hoje ou do vencimento atual, o que for depois).
create or replace function public.platform_add_paid_months(p_org uuid, p_months integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizations;
begin
  perform public._require_platform_admin();
  if p_months is null or p_months < 1 or p_months > 24 then
    raise exception 'Informe de 1 a 24 meses.' using errcode = 'P0001';
  end if;
  update public.organizations o
     set paid_until = greatest(coalesce(o.paid_until, now()), now()) + make_interval(months => p_months)
   where o.id = p_org
  returning * into v_org;
  if not found then
    raise exception 'Empresa não encontrada.' using errcode = 'P0001';
  end if;
  return jsonb_build_object('id', v_org.id, 'trial_ends_at', v_org.trial_ends_at, 'paid_until', v_org.paid_until);
end;
$$;

create or replace function public.platform_extend_trial(p_org uuid, p_days integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizations;
begin
  perform public._require_platform_admin();
  if p_days is null or p_days < 1 or p_days > 90 then
    raise exception 'Informe de 1 a 90 dias.' using errcode = 'P0001';
  end if;
  update public.organizations o
     set trial_ends_at = greatest(o.trial_ends_at, now()) + make_interval(days => p_days)
   where o.id = p_org
  returning * into v_org;
  if not found then
    raise exception 'Empresa não encontrada.' using errcode = 'P0001';
  end if;
  return jsonb_build_object('id', v_org.id, 'trial_ends_at', v_org.trial_ends_at, 'paid_until', v_org.paid_until);
end;
$$;

-- Encerra a assinatura agora (a empresa é pausada se o teste também tiver acabado).
create or replace function public.platform_end_subscription(p_org uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizations;
begin
  perform public._require_platform_admin();
  update public.organizations o
     set paid_until = least(coalesce(o.paid_until, now()), now()),
         trial_ends_at = least(o.trial_ends_at, now())
   where o.id = p_org
  returning * into v_org;
  if not found then
    raise exception 'Empresa não encontrada.' using errcode = 'P0001';
  end if;
  return jsonb_build_object('id', v_org.id, 'trial_ends_at', v_org.trial_ends_at, 'paid_until', v_org.paid_until);
end;
$$;

revoke execute on function public.platform_list_organizations() from public, anon;
revoke execute on function public.platform_add_paid_months(uuid, integer) from public, anon;
revoke execute on function public.platform_extend_trial(uuid, integer) from public, anon;
revoke execute on function public.platform_end_subscription(uuid) from public, anon;
grant execute on function public.platform_list_organizations() to authenticated;
grant execute on function public.platform_add_paid_months(uuid, integer) to authenticated;
grant execute on function public.platform_extend_trial(uuid, integer) to authenticated;
grant execute on function public.platform_end_subscription(uuid) to authenticated;
