-- =====================================================================
-- FechaProposta — Fundação multiempresa
-- Perfis, organizações (empresas), membros, convites, funções de
-- autorização e arquivos da marca (logo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 120), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Organizações (cada empresa cliente do FechaProposta)
-- ---------------------------------------------------------------------

create type public.member_role as enum ('owner', 'manager', 'staff');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),

  -- Dados que aparecem na proposta do cliente
  email text check (email is null or (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254)),
  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{10,13}$'),
  website text check (website is null or char_length(website) <= 200),
  document text check (document is null or document ~ '^[0-9]{11}$|^[0-9]{14}$'),
  city text check (city is null or char_length(city) <= 80),

  -- Marca
  logo_path text check (logo_path is null or char_length(logo_path) <= 300),
  brand_color text check (brand_color is null or brand_color ~ '^#[0-9A-Fa-f]{6}$'),

  -- Padrões de proposta nova
  default_validity_days integer not null default 15 check (default_validity_days between 1 and 180),
  default_terms text check (default_terms is null or char_length(default_terms) <= 2000),
  default_next_step text check (default_next_step is null or char_length(default_next_step) <= 500),

  -- Numeração das propostas (FP-0001, FP-0002...). Só o banco altera.
  next_proposal_number integer not null default 1 check (next_proposal_number >= 1),

  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members (user_id);

-- ---------------------------------------------------------------------
-- Funções de autorização (usadas nas políticas RLS)
-- security definer evita recursão de RLS ao consultar organization_members.
-- ---------------------------------------------------------------------

create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_org_role(p_org uuid, p_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org
      and m.user_id = (select auth.uid())
      and m.role = any (p_roles)
  );
$$;

create or replace function public.can_manage_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_org_role(p_org, array['owner', 'manager']::public.member_role[]);
$$;

revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.has_org_role(uuid, public.member_role[]) from public, anon;
revoke execute on function public.can_manage_org(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.member_role[]) to authenticated;
grant execute on function public.can_manage_org(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Organizações: membros leem; dono/gerente editam. Criação via create_organization().
create policy "organizations_select_member" on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy "organizations_update_manager" on public.organizations
  for update to authenticated
  using (public.can_manage_org(id))
  with check (public.can_manage_org(id));

create policy "organization_members_select_member" on public.organization_members
  for select to authenticated
  using (public.is_org_member(organization_id));

revoke all on table public.profiles from anon;
revoke all on table public.organizations from anon;
revoke all on table public.organization_members from anon;

revoke insert, update, delete, truncate on table public.profiles from authenticated;
grant update (full_name) on table public.profiles to authenticated;

-- Colunas que o painel pode alterar diretamente (numeração e assinatura ficam de fora).
revoke insert, update, delete, truncate on table public.organizations from authenticated;
grant update (
  name, email, whatsapp, website, document, city,
  logo_path, brand_color,
  default_validity_days, default_terms, default_next_step,
  onboarding_completed_at
) on table public.organizations to authenticated;

revoke insert, update, delete, truncate on table public.organization_members from authenticated;

-- ---------------------------------------------------------------------
-- Criação da empresa
-- ---------------------------------------------------------------------

create or replace function public.create_organization(p_name text)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org public.organizations;
begin
  if v_user is null then
    raise exception 'Faça login para criar sua empresa.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 80 then
    raise exception 'Informe o nome da empresa (2 a 80 letras).' using errcode = 'P0001';
  end if;
  if (select count(*) from public.organization_members m
      where m.user_id = v_user and m.role = 'owner') >= 5 then
    raise exception 'Você atingiu o limite de empresas por conta.' using errcode = 'P0001';
  end if;

  insert into public.organizations (name, email)
  values (trim(p_name), (select lower(u.email) from auth.users u where u.id = v_user))
  returning * into v_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org.id, v_user, 'owner');

  return v_org;
end;
$$;

revoke execute on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

-- ---------------------------------------------------------------------
-- Convites para a equipe (por link)
-- ---------------------------------------------------------------------

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  role public.member_role not null check (role <> 'owner'),
  token uuid not null default gen_random_uuid() unique,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null
);

create unique index organization_invitations_pending_unique
  on public.organization_invitations (organization_id, lower(email))
  where accepted_at is null;

alter table public.organization_invitations enable row level security;

create policy "invitations_select_manager" on public.organization_invitations
  for select to authenticated using (public.can_manage_org(organization_id));

revoke all on table public.organization_invitations from anon;
revoke insert, update, delete, truncate on table public.organization_invitations from authenticated;

-- Equipe com nome e e-mail (perfis são privados; aqui só a equipe da própria empresa).
create or replace function public.list_members(p_org uuid)
returns table (user_id uuid, role public.member_role, full_name text, email text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, m.role, p.full_name, u.email::text, m.created_at
  from public.organization_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.organization_id = p_org
    and public.is_org_member(p_org)
  order by case m.role when 'owner' then 0 when 'manager' then 1 else 2 end, m.created_at;
$$;

create or replace function public.create_invitation(p_org uuid, p_email text, p_role public.member_role)
returns public.organization_invitations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_inv public.organization_invitations;
begin
  if not public.can_manage_org(p_org) then
    raise exception 'Apenas o dono ou o gerente podem convidar pessoas.' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'Não é possível convidar outro dono.' using errcode = 'P0001';
  end if;
  if p_role = 'manager' and not public.has_org_role(p_org, array['owner']::public.member_role[]) then
    raise exception 'Apenas o dono pode convidar gerentes.' using errcode = 'P0001';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail inválido.' using errcode = 'P0001', hint = 'invalid_email';
  end if;
  if exists (
    select 1 from public.organization_members m join auth.users u on u.id = m.user_id
    where m.organization_id = p_org and lower(u.email) = v_email
  ) then
    raise exception 'Essa pessoa já faz parte da equipe.' using errcode = 'P0001', hint = 'already_member';
  end if;

  -- Reenviar convite substitui o anterior (novo link, novo prazo).
  delete from public.organization_invitations
   where organization_id = p_org and lower(email) = v_email and accepted_at is null;

  insert into public.organization_invitations (organization_id, email, role, invited_by)
  values (p_org, v_email, p_role, auth.uid())
  returning * into v_inv;
  return v_inv;
end;
$$;

create or replace function public.revoke_invitation(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.organization_invitations where id = p_id and accepted_at is null;
  if v_org is null or not public.can_manage_org(v_org) then
    raise exception 'Convite não encontrado.' using errcode = 'P0001';
  end if;
  delete from public.organization_invitations where id = p_id;
end;
$$;

-- Dados para a página do convite (antes de entrar/criar conta).
create or replace function public.get_invitation(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'organization_name', o.name,
    'email', i.email,
    'role', i.role,
    'expired', i.expires_at < now(),
    'accepted', i.accepted_at is not null
  )
  from public.organization_invitations i
  join public.organizations o on o.id = i.organization_id
  where i.token = p_token;
$$;

-- Aceita o convite. Só vale para a conta com o mesmo e-mail convidado.
create or replace function public.accept_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.organization_invitations;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para aceitar o convite.' using errcode = '42501';
  end if;
  select * into v_inv from public.organization_invitations where token = p_token for update;
  if not found then
    raise exception 'Convite não encontrado.' using errcode = 'P0001', hint = 'not_found';
  end if;
  if v_inv.accepted_at is not null then
    if v_inv.accepted_by = auth.uid() then
      return v_inv.organization_id;
    end if;
    raise exception 'Este convite já foi usado.' using errcode = 'P0001', hint = 'already_used';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'Este convite expirou. Peça um novo para a empresa.' using errcode = 'P0001', hint = 'expired';
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is distinct from lower(v_inv.email) then
    raise exception 'Este convite foi enviado para %. Entre com esse e-mail para aceitar.', v_inv.email
      using errcode = 'P0001', hint = 'wrong_email';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_inv.organization_id, auth.uid(), v_inv.role)
  on conflict (organization_id, user_id) do nothing;

  update public.organization_invitations set accepted_at = now(), accepted_by = auth.uid() where id = v_inv.id;
  return v_inv.organization_id;
end;
$$;

create or replace function public.update_member_role(p_org uuid, p_user uuid, p_role public.member_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_org_role(p_org, array['owner']::public.member_role[]) then
    raise exception 'Apenas o dono pode alterar perfis.' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'Não é possível tornar outra pessoa dona da empresa por aqui.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.organization_members where organization_id = p_org and user_id = p_user and role = 'owner') then
    raise exception 'O perfil do dono não pode ser alterado.' using errcode = 'P0001';
  end if;
  update public.organization_members set role = p_role where organization_id = p_org and user_id = p_user;
  if not found then
    raise exception 'Pessoa não encontrada na equipe.' using errcode = 'P0001';
  end if;
end;
$$;

-- Remove alguém da equipe (ou a própria pessoa, para sair da empresa).
create or replace function public.remove_member(p_org uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.member_role;
begin
  select role into v_target from public.organization_members where organization_id = p_org and user_id = p_user;
  if v_target is null then
    raise exception 'Pessoa não encontrada na equipe.' using errcode = 'P0001';
  end if;
  if v_target = 'owner' then
    raise exception 'O dono não pode ser removido da empresa.' using errcode = 'P0001';
  end if;
  if p_user <> auth.uid() and not (
    public.has_org_role(p_org, array['owner']::public.member_role[])
    or (v_target = 'staff' and public.has_org_role(p_org, array['manager']::public.member_role[]))
  ) then
    raise exception 'Você não tem permissão para remover esta pessoa.' using errcode = '42501';
  end if;
  delete from public.organization_members where organization_id = p_org and user_id = p_user;
end;
$$;

revoke execute on function public.list_members(uuid) from public, anon;
revoke execute on function public.create_invitation(uuid, text, public.member_role) from public, anon;
revoke execute on function public.revoke_invitation(uuid) from public, anon;
revoke execute on function public.get_invitation(uuid) from public;
revoke execute on function public.accept_invitation(uuid) from public, anon;
revoke execute on function public.update_member_role(uuid, uuid, public.member_role) from public, anon;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.list_members(uuid) to authenticated;
grant execute on function public.create_invitation(uuid, text, public.member_role) to authenticated;
grant execute on function public.revoke_invitation(uuid) to authenticated;
grant execute on function public.get_invitation(uuid) to anon, authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;
grant execute on function public.update_member_role(uuid, uuid, public.member_role) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Arquivos da marca (logo): pasta <id da empresa>/ no bucket público org-media.
-- Leitura pública (a logo aparece na proposta do cliente); gravação só da equipe gestora.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('org-media', 'org-media', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.storage_org_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end;
$$;

grant execute on function public.storage_org_id(text) to authenticated;

create policy "org_media_insert_manager" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'org-media' and public.can_manage_org(public.storage_org_id(name)));

create policy "org_media_update_manager" on storage.objects
  for update to authenticated
  using (bucket_id = 'org-media' and public.can_manage_org(public.storage_org_id(name)));

create policy "org_media_delete_manager" on storage.objects
  for delete to authenticated
  using (bucket_id = 'org-media' and public.can_manage_org(public.storage_org_id(name)));
