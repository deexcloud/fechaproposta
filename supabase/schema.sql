-- FechaProposta: estrutura inicial para autenticação e dados por espaço de trabalho.
-- Execute este arquivo no SQL Editor do Supabase antes de conectar gravações do app.

create schema if not exists fechaproposta_private;
revoke all on schema fechaproposta_private from public, anon;
grant usage on schema fechaproposta_private to authenticated;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.account_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  constraint account_trials_valid_period check (ends_at > started_at)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  email text,
  company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null,
  code text not null,
  title text not null check (length(trim(title)) between 1 and 240),
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'sent', 'viewed', 'negotiating', 'accepted', 'expired')),
  summary text not null default '',
  deliverables text[] not null default '{}',
  timeline text not null default '',
  next_step text not null default '',
  exclusions text not null default '',
  terms text not null default '',
  due_date date not null,
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  share_token uuid not null default gen_random_uuid() unique,
  share_enabled boolean not null default false,
  accepted_by text,
  accepted_at timestamptz,
  signature_mode text check (signature_mode in ('drawn', 'typed')),
  signature_text text,
  signature_storage_path text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, code),
  unique (workspace_id, id),
  foreign key (workspace_id, client_id)
    references public.clients(workspace_id, id) on delete restrict,
  check (status <> 'accepted' or (accepted_by is not null and accepted_at is not null))
);

create table public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  proposal_id uuid not null,
  position integer not null check (position >= 0),
  name text not null check (length(trim(name)) between 1 and 240),
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now(),
  unique (proposal_id, position),
  foreign key (workspace_id, proposal_id)
    references public.proposals(workspace_id, id) on delete cascade
);

create index clients_workspace_name_idx on public.clients (workspace_id, name);
create index proposals_workspace_created_idx on public.proposals (workspace_id, created_at desc);
create index proposals_workspace_status_idx on public.proposals (workspace_id, status);
create index proposals_workspace_due_date_idx on public.proposals (workspace_id, due_date);
create index proposal_items_workspace_proposal_idx on public.proposal_items (workspace_id, proposal_id, position);

create function fechaproposta_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function fechaproposta_private.set_updated_at();

create trigger clients_set_updated_at
before update on public.clients
for each row execute function fechaproposta_private.set_updated_at();

create trigger proposals_set_updated_at
before update on public.proposals
for each row execute function fechaproposta_private.set_updated_at();

create function fechaproposta_private.add_workspace_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger workspaces_add_owner
after insert on public.workspaces
for each row execute function fechaproposta_private.add_workspace_owner();

create function fechaproposta_private.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members as member
    where member.workspace_id = target_workspace_id
      and member.user_id = (select auth.uid())
  );
$$;

create function fechaproposta_private.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members as member
    where member.workspace_id = target_workspace_id
      and member.user_id = (select auth.uid())
      and member.role = 'owner'
  );
$$;

create function fechaproposta_private.has_workspace_access(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspaces as workspace
    join public.workspace_members as member on member.workspace_id = workspace.id
    left join public.account_trials as trial on trial.user_id = workspace.owner_id
    where workspace.id = target_workspace_id
      and member.user_id = (select auth.uid())
      and (trial.user_id is null or trial.ends_at > now())
  );
$$;

revoke all on function fechaproposta_private.set_updated_at() from public, anon, authenticated;
revoke all on function fechaproposta_private.add_workspace_owner() from public, anon, authenticated;
revoke all on function fechaproposta_private.is_workspace_member(uuid) from public, anon, authenticated;
revoke all on function fechaproposta_private.is_workspace_owner(uuid) from public, anon, authenticated;
revoke all on function fechaproposta_private.has_workspace_access(uuid) from public, anon, authenticated;
grant execute on function fechaproposta_private.is_workspace_member(uuid) to authenticated;
grant execute on function fechaproposta_private.is_workspace_owner(uuid) to authenticated;
grant execute on function fechaproposta_private.has_workspace_access(uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.account_trials enable row level security;
alter table public.clients enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_items enable row level security;

create policy "workspace members can read their workspaces"
on public.workspaces for select to authenticated
using ((select fechaproposta_private.is_workspace_member(id)));

create policy "workspace owners can update their workspaces"
on public.workspaces for update to authenticated
using (
  (select fechaproposta_private.is_workspace_owner(id))
  and (select fechaproposta_private.has_workspace_access(id))
)
with check (
  (select fechaproposta_private.is_workspace_owner(id))
  and (select fechaproposta_private.has_workspace_access(id))
  and owner_id = (select auth.uid())
);

create policy "workspace owners can delete their workspaces"
on public.workspaces for delete to authenticated
using (
  (select fechaproposta_private.is_workspace_owner(id))
  and (select fechaproposta_private.has_workspace_access(id))
);

create policy "workspace members can read membership"
on public.workspace_members for select to authenticated
using ((select fechaproposta_private.is_workspace_member(workspace_id)));

create policy "workspace members can manage clients"
on public.clients for all to authenticated
using ((select fechaproposta_private.has_workspace_access(workspace_id)))
with check ((select fechaproposta_private.has_workspace_access(workspace_id)));

create policy "workspace members can manage proposals"
on public.proposals for all to authenticated
using ((select fechaproposta_private.has_workspace_access(workspace_id)))
with check ((select fechaproposta_private.has_workspace_access(workspace_id)));

create policy "workspace members can manage proposal items"
on public.proposal_items for all to authenticated
using ((select fechaproposta_private.has_workspace_access(workspace_id)))
with check ((select fechaproposta_private.has_workspace_access(workspace_id)));

revoke all on table public.workspaces, public.workspace_members, public.clients,
  public.proposals, public.proposal_items from public, anon, authenticated;
revoke all on table public.account_trials from public, anon, authenticated;

grant select, update, delete on table public.workspaces to authenticated;
grant select on table public.workspace_members to authenticated;
grant select, insert, update, delete on table public.clients, public.proposals,
  public.proposal_items to authenticated;

create or replace function public.create_workspace(target_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  created_workspace public.workspaces;
  trial_started_at timestamptz;
  trial_ends_at timestamptz;
begin
  if caller_id is null then
    raise exception 'É necessário entrar na conta para continuar';
  end if;

  if target_name is null or length(trim(target_name)) not between 1 and 120 then
    raise exception 'O nome do espaço deve ter entre 1 e 120 caracteres';
  end if;

  insert into public.account_trials (user_id, started_at, ends_at)
  values (caller_id, now(), now() + interval '3 days')
  on conflict (user_id) do nothing;

  select trial.started_at, trial.ends_at
  into trial_started_at, trial_ends_at
  from public.account_trials as trial
  where trial.user_id = caller_id;

  if trial_ends_at <= now() then
    raise exception 'Seu período de teste grátis de três dias terminou';
  end if;

  insert into public.workspaces (name, owner_id)
  values (trim(target_name), caller_id)
  returning * into created_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (created_workspace.id, caller_id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  return jsonb_build_object(
    'id', created_workspace.id,
    'name', created_workspace.name,
    'owner_id', created_workspace.owner_id,
    'created_at', created_workspace.created_at,
    'updated_at', created_workspace.updated_at,
    'trial_started_at', trial_started_at,
    'trial_ends_at', trial_ends_at
  );
end;
$$;

revoke all on function public.create_workspace(text) from public, anon, authenticated;
grant execute on function public.create_workspace(text) to authenticated;

create or replace function public.get_workspace_trial(target_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  workspace_owner_id uuid;
  trial_started_at timestamptz;
  trial_ends_at timestamptz;
begin
  if caller_id is null then
    raise exception 'É necessário entrar na conta para continuar';
  end if;

  select workspace.owner_id into workspace_owner_id
  from public.workspaces as workspace
  where workspace.id = target_workspace_id
    and exists (
      select 1 from public.workspace_members as member
      where member.workspace_id = workspace.id and member.user_id = caller_id
    );

  if workspace_owner_id is null then
    raise exception 'Workspace not found or access denied';
  end if;

  select trial.started_at, trial.ends_at
  into trial_started_at, trial_ends_at
  from public.account_trials as trial
  where trial.user_id = workspace_owner_id;

  return jsonb_build_object(
    'workspace_id', target_workspace_id,
    'status', case
      when trial_ends_at is null then 'active'
      when trial_ends_at > now() then 'trialing'
      else 'expired'
    end,
    'trial_started_at', trial_started_at,
    'trial_ends_at', trial_ends_at,
    'seconds_remaining', case
      when trial_ends_at is null then null
      else greatest(0, floor(extract(epoch from (trial_ends_at - now())))::bigint)
    end
  );
end;
$$;

revoke all on function public.get_workspace_trial(uuid) from public, anon, authenticated;
grant execute on function public.get_workspace_trial(uuid) to authenticated;

create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  created_at timestamptz not null default now()
);

alter table public.demo_requests enable row level security;
revoke all on table public.demo_requests from public, anon, authenticated;
grant insert on table public.demo_requests to anon, authenticated;
create policy "Anyone can request a product demo"
on public.demo_requests for insert to anon, authenticated
with check (email = lower(email) and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$');

create or replace function public.save_workspace_proposal(
  target_workspace_id uuid,
  target_proposal_id uuid,
  target_client_id uuid,
  target_client_name text,
  target_client_email text,
  target_code text,
  target_title text,
  target_status text,
  target_summary text,
  target_deliverables text[],
  target_timeline text,
  target_next_step text,
  target_exclusions text,
  target_terms text,
  target_due_date date,
  target_total_amount numeric,
  target_items jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved_client_id uuid := target_client_id;
  saved_proposal_id uuid := target_proposal_id;
begin
  if saved_client_id is null then
    select client.id into saved_client_id
    from public.clients as client
    where client.workspace_id = target_workspace_id
      and lower(client.email) = lower(nullif(trim(target_client_email), ''))
    order by client.created_at
    limit 1;
  end if;

  if saved_client_id is null then
    insert into public.clients (workspace_id, name, email)
    values (target_workspace_id, trim(target_client_name), nullif(trim(target_client_email), ''))
    returning id into saved_client_id;
  else
    update public.clients
    set name = trim(target_client_name), email = nullif(trim(target_client_email), '')
    where id = saved_client_id and workspace_id = target_workspace_id;
    if not found then raise exception 'Client does not belong to this workspace'; end if;
  end if;

  if saved_proposal_id is null then
    insert into public.proposals (
      workspace_id, client_id, code, title, status, summary, deliverables,
      timeline, next_step, exclusions, terms, due_date, total_amount, created_by
    ) values (
      target_workspace_id, saved_client_id, target_code, trim(target_title), target_status,
      coalesce(target_summary, ''), coalesce(target_deliverables, '{}'), coalesce(target_timeline, ''),
      coalesce(target_next_step, ''), coalesce(target_exclusions, ''), coalesce(target_terms, ''),
      target_due_date, target_total_amount, auth.uid()
    ) returning id into saved_proposal_id;
  else
    update public.proposals set
      client_id = saved_client_id,
      title = trim(target_title),
      status = target_status,
      summary = coalesce(target_summary, ''),
      deliverables = coalesce(target_deliverables, '{}'),
      timeline = coalesce(target_timeline, ''),
      next_step = coalesce(target_next_step, ''),
      exclusions = coalesce(target_exclusions, ''),
      terms = coalesce(target_terms, ''),
      due_date = target_due_date,
      total_amount = target_total_amount
    where id = saved_proposal_id and workspace_id = target_workspace_id;
    if not found then raise exception 'Proposal does not belong to this workspace'; end if;
    delete from public.proposal_items
    where proposal_id = saved_proposal_id and workspace_id = target_workspace_id;
  end if;

  insert into public.proposal_items (workspace_id, proposal_id, position, name, quantity, unit_price)
  select target_workspace_id, saved_proposal_id, item.position, trim(item.name), item.quantity, item.unit_price
  from jsonb_to_recordset(coalesce(target_items, '[]'::jsonb)) as item(
    position integer, name text, quantity numeric, unit_price numeric
  );

  return saved_proposal_id;
end;
$$;

revoke all on function public.save_workspace_proposal(uuid, uuid, uuid, text, text, text, text, text, text, text[], text, text, text, text, date, numeric, jsonb) from public, anon;
grant execute on function public.save_workspace_proposal(uuid, uuid, uuid, text, text, text, text, text, text, text[], text, text, text, text, date, numeric, jsonb) to authenticated;

create or replace function public.get_shared_proposal(target_share_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', proposal.id,
    'code', proposal.code,
    'title', proposal.title,
    'status', proposal.status,
    'summary', proposal.summary,
    'deliverables', proposal.deliverables,
    'timeline', proposal.timeline,
    'next_step', proposal.next_step,
    'exclusions', proposal.exclusions,
    'terms', proposal.terms,
    'due_date', proposal.due_date,
    'total_amount', proposal.total_amount,
    'accepted_by', proposal.accepted_by,
    'accepted_at', proposal.accepted_at,
    'signature_mode', proposal.signature_mode,
    'signature_text', proposal.signature_text,
    'client', jsonb_build_object('name', client.name, 'email', client.email),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', item.name,
        'quantity', item.quantity,
        'unit_price', item.unit_price
      ) order by item.position)
      from public.proposal_items as item
      where item.workspace_id = proposal.workspace_id and item.proposal_id = proposal.id
    ), '[]'::jsonb)
  )
  from public.proposals as proposal
  join public.clients as client
    on client.workspace_id = proposal.workspace_id and client.id = proposal.client_id
  where proposal.share_token = target_share_token
    and proposal.share_enabled
  limit 1;
$$;

create or replace function public.accept_shared_proposal(
  target_share_token uuid,
  target_signatory_name text,
  target_sign_mode text,
  target_sign_text text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(trim(target_signatory_name)) not between 1 and 200
    or target_sign_mode not in ('drawn', 'typed')
    or length(target_sign_text) > 1000000 then
    raise exception 'Invalid signature details';
  end if;

  update public.proposals as proposal
  set status = 'accepted',
      accepted_by = trim(target_signatory_name),
      accepted_at = now(),
      signature_mode = target_sign_mode,
      signature_text = target_sign_text,
      updated_at = now()
  where proposal.share_token = target_share_token
    and proposal.share_enabled
    and proposal.status <> 'accepted'
    and proposal.due_date >= current_date;

  return found;
end;
$$;

revoke all on function public.get_shared_proposal(uuid) from public, anon, authenticated;
revoke all on function public.accept_shared_proposal(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.get_shared_proposal(uuid) to anon, authenticated;
grant execute on function public.accept_shared_proposal(uuid, text, text, text) to anon, authenticated;
