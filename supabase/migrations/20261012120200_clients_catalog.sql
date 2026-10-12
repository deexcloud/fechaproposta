-- =====================================================================
-- FechaProposta — Clientes, catálogo de serviços e modelos de proposta
-- Toda a equipe lê e cadastra; apagar é só para dono/gerente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Clientes (quem recebe as propostas)
-- ---------------------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  company text check (company is null or char_length(company) <= 120),
  email text check (email is null or (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254)),
  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{10,13}$'),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Permite chave estrangeira composta: proposta e cliente da mesma empresa.
  unique (organization_id, id)
);

create index clients_org_name_idx on public.clients (organization_id, lower(name));

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Catálogo de serviços (itens reutilizáveis com preço padrão)
-- ---------------------------------------------------------------------

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 140),
  description text check (description is null or char_length(description) <= 600),
  unit text not null default 'un' check (char_length(unit) between 1 and 20),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0 and unit_price <= 99999999),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index services_org_idx on public.services (organization_id, is_active, lower(name));

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Modelos de proposta (conteúdo pronto para começar uma proposta nova)
-- content: { title, summary, deliverables[], timeline, next_step, exclusions,
--            terms, items: [{ name, description, unit, quantity, unit_price, is_optional }] }
-- ---------------------------------------------------------------------

create table public.proposal_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  description text check (description is null or char_length(description) <= 300),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object' and pg_column_size(content) <= 65536),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index proposal_templates_org_idx on public.proposal_templates (organization_id, created_at desc);

create trigger proposal_templates_set_updated_at
  before update on public.proposal_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.proposal_templates enable row level security;

create policy "clients_select_member" on public.clients
  for select to authenticated using (public.is_org_member(organization_id));
create policy "clients_insert_member" on public.clients
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "clients_update_member" on public.clients
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "clients_delete_manager" on public.clients
  for delete to authenticated using (public.can_manage_org(organization_id));

-- Preços do catálogo: só dono/gerente alteram.
create policy "services_select_member" on public.services
  for select to authenticated using (public.is_org_member(organization_id));
create policy "services_insert_manager" on public.services
  for insert to authenticated with check (public.can_manage_org(organization_id));
create policy "services_update_manager" on public.services
  for update to authenticated
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));
create policy "services_delete_manager" on public.services
  for delete to authenticated using (public.can_manage_org(organization_id));

create policy "templates_select_member" on public.proposal_templates
  for select to authenticated using (public.is_org_member(organization_id));
create policy "templates_insert_member" on public.proposal_templates
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "templates_update_member" on public.proposal_templates
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "templates_delete_manager" on public.proposal_templates
  for delete to authenticated using (public.can_manage_org(organization_id));

revoke all on table public.clients from anon;
revoke all on table public.services from anon;
revoke all on table public.proposal_templates from anon;
revoke truncate on table public.clients from authenticated;
revoke truncate on table public.services from authenticated;
revoke truncate on table public.proposal_templates from authenticated;

-- Empresa e criador não mudam depois de criados.
revoke update on table public.clients from authenticated;
grant update (name, company, email, whatsapp, notes) on table public.clients to authenticated;
revoke update on table public.services from authenticated;
grant update (name, description, unit, unit_price, is_active) on table public.services to authenticated;
revoke update on table public.proposal_templates from authenticated;
grant update (name, description, content) on table public.proposal_templates to authenticated;
