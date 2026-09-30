-- Start one three-day trial per account on its first workspace creation.
create table if not exists public.account_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  constraint account_trials_valid_period check (ends_at > started_at)
);

-- Give already-created workspaces a single rollout trial instead of leaving
-- existing accounts outside trial enforcement.
insert into public.account_trials (user_id, started_at, ends_at)
select distinct workspace.owner_id, now(), now() + interval '3 days'
from public.workspaces as workspace
on conflict (user_id) do nothing;

alter table public.account_trials enable row level security;
revoke all on table public.account_trials from public, anon, authenticated;

create or replace function fechaproposta_private.has_workspace_access(target_workspace_id uuid)
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

revoke all on function fechaproposta_private.has_workspace_access(uuid) from public, anon, authenticated;
grant execute on function fechaproposta_private.has_workspace_access(uuid) to authenticated;

-- Remove direct workspace creation so accounts cannot bypass the one-time trial RPC.
drop policy if exists "authenticated users can create their own workspaces" on public.workspaces;
revoke insert on table public.workspaces from public, anon, authenticated;

drop policy if exists "workspace owners can update their workspaces" on public.workspaces;
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

drop policy if exists "workspace owners can delete their workspaces" on public.workspaces;
create policy "workspace owners can delete their workspaces"
on public.workspaces for delete to authenticated
using (
  (select fechaproposta_private.is_workspace_owner(id))
  and (select fechaproposta_private.has_workspace_access(id))
);

drop policy if exists "workspace members can manage clients" on public.clients;
create policy "workspace members can manage clients"
on public.clients for all to authenticated
using ((select fechaproposta_private.has_workspace_access(workspace_id)))
with check ((select fechaproposta_private.has_workspace_access(workspace_id)));

drop policy if exists "workspace members can manage proposals" on public.proposals;
create policy "workspace members can manage proposals"
on public.proposals for all to authenticated
using ((select fechaproposta_private.has_workspace_access(workspace_id)))
with check ((select fechaproposta_private.has_workspace_access(workspace_id)));

drop policy if exists "workspace members can manage proposal items" on public.proposal_items;
create policy "workspace members can manage proposal items"
on public.proposal_items for all to authenticated
using ((select fechaproposta_private.has_workspace_access(workspace_id)))
with check ((select fechaproposta_private.has_workspace_access(workspace_id)));

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
