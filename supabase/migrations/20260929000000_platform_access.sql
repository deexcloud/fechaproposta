-- Apply after the initial FechaProposta schema when the database already exists.
create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  created_at timestamptz not null default now()
);

alter table public.demo_requests enable row level security;
revoke all on table public.demo_requests from public, anon, authenticated;
grant insert on table public.demo_requests to anon, authenticated;
drop policy if exists "Anyone can request a product demo" on public.demo_requests;
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
