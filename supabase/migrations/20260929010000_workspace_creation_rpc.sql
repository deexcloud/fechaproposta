-- Create workspaces through a narrowly scoped RPC so ownership always comes
-- from the authenticated JWT rather than a client-supplied owner_id.
create or replace function public.create_workspace(target_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  created_workspace public.workspaces;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  if target_name is null or length(trim(target_name)) not between 1 and 120 then
    raise exception 'Workspace name must be between 1 and 120 characters';
  end if;

  insert into public.workspaces (name, owner_id)
  values (trim(target_name), caller_id)
  returning * into created_workspace;

  -- The existing trigger normally adds the owner. This also covers databases
  -- where that trigger was not installed, without creating a duplicate row.
  insert into public.workspace_members (workspace_id, user_id, role)
  values (created_workspace.id, caller_id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  return jsonb_build_object(
    'id', created_workspace.id,
    'name', created_workspace.name,
    'owner_id', created_workspace.owner_id,
    'created_at', created_workspace.created_at,
    'updated_at', created_workspace.updated_at
  );
end;
$$;

revoke all on function public.create_workspace(text) from public, anon, authenticated;
grant execute on function public.create_workspace(text) to authenticated;
