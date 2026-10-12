-- =====================================================================
-- FechaProposta — Propostas, itens, linha do tempo e aceite
--
-- O painel só LÊ estas tabelas; toda escrita passa pelas funções abaixo,
-- que cuidam da numeração, dos totais, da troca de status e do histórico.
--
-- Status gravados: draft → sent → viewed → negotiating → accepted | declined.
-- "Expirada" não é gravada: é uma proposta enviada com valid_until no passado
-- (veja proposal_effective_status).
--
-- O cliente acessa pelo link /p/<share_token>, sem login, por funções
-- dedicadas (get_public_proposal, register_proposal_view,
-- request_proposal_changes, accept_public_proposal, decline_public_proposal).
-- =====================================================================

create type public.proposal_status as enum ('draft', 'sent', 'viewed', 'negotiating', 'accepted', 'declined');

-- Data de hoje no fuso do Brasil (validade é por dia).
create or replace function public._today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

grant execute on function public._today() to anon, authenticated;

create or replace function public.proposal_effective_status(p_status public.proposal_status, p_valid_until date)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_status in ('sent', 'viewed', 'negotiating') and p_valid_until < public._today() then 'expired'
    else p_status::text
  end;
$$;

grant execute on function public.proposal_effective_status(public.proposal_status, date) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_id uuid,
  number integer not null check (number >= 1),
  code text generated always as (
    'FP-' || case when number < 10000 then lpad(number::text, 4, '0') else number::text end
  ) stored,
  title text not null check (char_length(trim(title)) between 3 and 160),
  summary text check (summary is null or char_length(summary) <= 3000),
  deliverables text[] not null default '{}' check (cardinality(deliverables) <= 30),
  timeline text check (timeline is null or char_length(timeline) <= 200),
  next_step text check (next_step is null or char_length(next_step) <= 500),
  exclusions text check (exclusions is null or char_length(exclusions) <= 2000),
  terms text check (terms is null or char_length(terms) <= 2000),
  valid_until date not null,
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  -- Totais calculados pelo banco: itens fixos (já com desconto) e soma dos opcionais.
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  optional_amount numeric(12, 2) not null default 0 check (optional_amount >= 0),

  status public.proposal_status not null default 'draft',
  share_token uuid not null default gen_random_uuid() unique,
  sent_at timestamptz,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer not null default 0 check (view_count >= 0),
  accepted_at timestamptz,
  accepted_total numeric(12, 2),
  declined_at timestamptz,
  decline_reason text check (decline_reason is null or char_length(decline_reason) <= 1000),

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, number),
  unique (organization_id, id),
  foreign key (organization_id, client_id)
    references public.clients (organization_id, id) on delete set null (client_id)
);

create index proposals_org_created_idx on public.proposals (organization_id, created_at desc);
create index proposals_org_status_idx on public.proposals (organization_id, status);
create index proposals_client_idx on public.proposals (client_id);

create trigger proposals_set_updated_at
  before update on public.proposals
  for each row execute function public.set_updated_at();

create table public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  proposal_id uuid not null,
  position integer not null check (position >= 0),
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text check (description is null or char_length(description) <= 600),
  unit text not null default 'un' check (char_length(unit) between 1 and 20),
  quantity numeric(10, 2) not null check (quantity > 0 and quantity <= 100000),
  unit_price numeric(12, 2) not null check (unit_price >= 0 and unit_price <= 99999999),
  is_optional boolean not null default false,
  foreign key (organization_id, proposal_id)
    references public.proposals (organization_id, id) on delete cascade
);

create index proposal_items_proposal_idx on public.proposal_items (proposal_id, position);

create table public.proposal_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  proposal_id uuid not null,
  kind text not null check (kind in (
    'created', 'updated', 'sent', 'viewed', 'change_requested',
    'accepted', 'declined', 'reopened', 'duplicated'
  )),
  actor text not null check (actor in ('team', 'client')),
  actor_user uuid references auth.users (id) on delete set null,
  actor_name text check (actor_name is null or char_length(actor_name) <= 120),
  message text check (message is null or char_length(message) <= 1000),
  created_at timestamptz not null default now(),
  foreign key (organization_id, proposal_id)
    references public.proposals (organization_id, id) on delete cascade
);

create index proposal_events_proposal_idx on public.proposal_events (proposal_id, created_at desc);
create index proposal_events_org_idx on public.proposal_events (organization_id, created_at desc);

-- Registro do aceite: cópia congelada do que foi aceito. Nunca é alterado.
create table public.proposal_acceptances (
  proposal_id uuid primary key,
  organization_id uuid not null,
  signer_name text not null check (char_length(trim(signer_name)) between 3 and 120),
  signer_email text check (signer_email is null or (signer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(signer_email) <= 254)),
  signature_mode text not null check (signature_mode in ('typed', 'drawn', 'manual')),
  signature_data text check (signature_data is null or char_length(signature_data) <= 150000),
  selected_items uuid[] not null default '{}',
  total numeric(12, 2) not null check (total >= 0),
  snapshot jsonb not null,
  content_hash text not null,
  ip text check (ip is null or char_length(ip) <= 100),
  user_agent text check (user_agent is null or char_length(user_agent) <= 400),
  recorded_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz not null default now(),
  foreign key (organization_id, proposal_id)
    references public.proposals (organization_id, id) on delete cascade
);

-- ---------------------------------------------------------------------
-- RLS: membros leem; ninguém escreve direto.
-- ---------------------------------------------------------------------

alter table public.proposals enable row level security;
alter table public.proposal_items enable row level security;
alter table public.proposal_events enable row level security;
alter table public.proposal_acceptances enable row level security;

create policy "proposals_select_member" on public.proposals
  for select to authenticated using (public.is_org_member(organization_id));
create policy "proposal_items_select_member" on public.proposal_items
  for select to authenticated using (public.is_org_member(organization_id));
create policy "proposal_events_select_member" on public.proposal_events
  for select to authenticated using (public.is_org_member(organization_id));
create policy "proposal_acceptances_select_member" on public.proposal_acceptances
  for select to authenticated using (public.is_org_member(organization_id));

revoke all on table public.proposals from anon;
revoke all on table public.proposal_items from anon;
revoke all on table public.proposal_events from anon;
revoke all on table public.proposal_acceptances from anon;
revoke insert, update, delete, truncate on table public.proposals from authenticated;
revoke insert, update, delete, truncate on table public.proposal_items from authenticated;
revoke insert, update, delete, truncate on table public.proposal_events from authenticated;
revoke insert, update, delete, truncate on table public.proposal_acceptances from authenticated;

-- Proposta nova só em empresa com assinatura ativa (vale para criar e duplicar).
create or replace function public.proposals_require_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._require_subscription(new.organization_id);
  return new;
end;
$$;

revoke execute on function public.proposals_require_subscription() from public, anon, authenticated;

create trigger proposals_require_subscription
  before insert on public.proposals
  for each row execute function public.proposals_require_subscription();

-- ---------------------------------------------------------------------
-- Funções internas
-- ---------------------------------------------------------------------

create or replace function public._log_proposal_event(
  p_proposal uuid, p_org uuid, p_kind text, p_actor text, p_actor_name text default null, p_message text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.proposal_events (organization_id, proposal_id, kind, actor, actor_user, actor_name, message)
  values (
    p_org, p_proposal, p_kind, p_actor,
    case when p_actor = 'team' then auth.uid() end,
    left(nullif(trim(p_actor_name), ''), 120),
    left(nullif(trim(p_message), ''), 1000)
  );
$$;

revoke execute on function public._log_proposal_event(uuid, uuid, text, text, text, text) from public, anon, authenticated;

-- Recalcula os totais a partir dos itens.
create or replace function public._recalc_proposal_totals(p_proposal uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base numeric;
  v_optional numeric;
  v_discount numeric;
begin
  select
    coalesce(sum(round(i.quantity * i.unit_price, 2)) filter (where not i.is_optional), 0),
    coalesce(sum(round(i.quantity * i.unit_price, 2)) filter (where i.is_optional), 0)
  into v_base, v_optional
  from public.proposal_items i where i.proposal_id = p_proposal;

  select discount into v_discount from public.proposals where id = p_proposal;
  if v_discount > v_base then
    raise exception 'O desconto não pode ser maior que o valor dos itens.' using errcode = 'P0001';
  end if;

  update public.proposals
     set total_amount = v_base - v_discount, optional_amount = v_optional
   where id = p_proposal;
end;
$$;

revoke execute on function public._recalc_proposal_totals(uuid) from public, anon, authenticated;

-- Conteúdo completo da proposta (usado na página do cliente e na cópia do aceite).
create or replace function public._proposal_payload(p_proposal uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'code', p.code,
    'title', p.title,
    'summary', p.summary,
    'deliverables', to_jsonb(p.deliverables),
    'timeline', p.timeline,
    'next_step', p.next_step,
    'exclusions', p.exclusions,
    'terms', p.terms,
    'valid_until', p.valid_until,
    'discount', p.discount,
    'total_amount', p.total_amount,
    'optional_amount', p.optional_amount,
    'status', public.proposal_effective_status(p.status, p.valid_until),
    'sent_at', p.sent_at,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'client', case when c.id is null then null else jsonb_build_object('name', c.name, 'company', c.company) end,
    'organization', jsonb_build_object(
      'name', o.name, 'email', o.email, 'whatsapp', o.whatsapp, 'website', o.website,
      'document', o.document, 'city', o.city, 'logo_path', o.logo_path, 'brand_color', o.brand_color
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'name', i.name, 'description', i.description, 'unit', i.unit,
        'quantity', i.quantity, 'unit_price', i.unit_price, 'is_optional', i.is_optional
      ) order by i.position)
      from public.proposal_items i where i.proposal_id = p.id
    ), '[]'::jsonb)
  )
  from public.proposals p
  join public.organizations o on o.id = p.organization_id
  left join public.clients c on c.id = p.client_id
  where p.id = p_proposal;
$$;

revoke execute on function public._proposal_payload(uuid) from public, anon, authenticated;

-- IP e navegador de quem chamou (cabeçalhos repassados pelo Supabase).
create or replace function public._request_header(p_name text)
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('request.headers', true), '')::jsonb ->> p_name;
$$;

revoke execute on function public._request_header(text) from public, anon, authenticated;

-- Busca a proposta da equipe já travada para alteração.
create or replace function public._lock_team_proposal(p_id uuid)
returns public.proposals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.proposals;
begin
  select * into v_row from public.proposals where id = p_id for update;
  if not found or not public.is_org_member(v_row.organization_id) then
    raise exception 'Proposta não encontrada.' using errcode = 'P0001', hint = 'not_found';
  end if;
  return v_row;
end;
$$;

revoke execute on function public._lock_team_proposal(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Equipe: salvar (criar ou editar)
--
-- p_data: {
--   client_id?, client?: { name, company?, email?, whatsapp? },
--   title, summary?, deliverables?: text[], timeline?, next_step?, exclusions?, terms?,
--   valid_until?: 'AAAA-MM-DD', discount?: number,
--   items: [{ name, description?, unit?, quantity, unit_price, is_optional? }]
-- }
-- ---------------------------------------------------------------------

create or replace function public.save_proposal(p_org uuid, p_id uuid, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.proposals;
  v_client uuid;
  v_title text := trim(coalesce(p_data ->> 'title', ''));
  v_valid date;
  v_discount numeric := coalesce((p_data ->> 'discount')::numeric, 0);
  v_deliverables text[];
  v_items jsonb := coalesce(p_data -> 'items', '[]'::jsonb);
  v_item jsonb;
  v_position integer := 0;
  v_number integer;
  v_default_days integer;
begin
  if not public.is_org_member(p_org) then
    raise exception 'Você não tem acesso a esta empresa.' using errcode = '42501';
  end if;
  perform public._require_subscription(p_org);

  if char_length(v_title) not between 3 and 160 then
    raise exception 'Dê um título à proposta (3 a 160 letras).' using errcode = 'P0001', hint = 'title';
  end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'Adicione pelo menos um item com valor.' using errcode = 'P0001', hint = 'items';
  end if;
  if jsonb_array_length(v_items) > 50 then
    raise exception 'Use no máximo 50 itens por proposta.' using errcode = 'P0001', hint = 'items';
  end if;
  if not exists (select 1 from jsonb_array_elements(v_items) e where not coalesce((e ->> 'is_optional')::boolean, false)) then
    raise exception 'Pelo menos um item precisa ser fixo (não opcional).' using errcode = 'P0001', hint = 'items';
  end if;
  if v_discount < 0 then
    raise exception 'O desconto não pode ser negativo.' using errcode = 'P0001', hint = 'discount';
  end if;

  select array_agg(left(trim(d), 300)) into v_deliverables
  from jsonb_array_elements_text(coalesce(p_data -> 'deliverables', '[]'::jsonb)) d
  where trim(d) <> '';
  if cardinality(v_deliverables) > 30 then
    raise exception 'Use no máximo 30 entregas.' using errcode = 'P0001', hint = 'deliverables';
  end if;

  select default_validity_days into v_default_days from public.organizations where id = p_org;
  v_valid := coalesce(nullif(p_data ->> 'valid_until', '')::date, public._today() + v_default_days);
  if v_valid < public._today() then
    raise exception 'A validade precisa ser hoje ou uma data futura.' using errcode = 'P0001', hint = 'valid_until';
  end if;

  -- Cliente: existente (da mesma empresa) ou novo cadastro na hora.
  if nullif(p_data ->> 'client_id', '') is not null then
    select id into v_client from public.clients
     where id = (p_data ->> 'client_id')::uuid and organization_id = p_org;
    if v_client is null then
      raise exception 'Cliente não encontrado.' using errcode = 'P0001', hint = 'client';
    end if;
  elsif char_length(trim(coalesce(p_data #>> '{client,name}', ''))) >= 2 then
    insert into public.clients (organization_id, name, company, email, whatsapp)
    values (
      p_org,
      trim(p_data #>> '{client,name}'),
      nullif(trim(p_data #>> '{client,company}'), ''),
      nullif(lower(trim(p_data #>> '{client,email}')), ''),
      nullif(regexp_replace(coalesce(p_data #>> '{client,whatsapp}', ''), '\D', '', 'g'), '')
    )
    returning id into v_client;
  else
    raise exception 'Escolha o cliente que vai receber a proposta.' using errcode = 'P0001', hint = 'client';
  end if;

  if p_id is null then
    update public.organizations
       set next_proposal_number = next_proposal_number + 1
     where id = p_org
    returning next_proposal_number - 1 into v_number;

    insert into public.proposals (
      organization_id, client_id, number, title, summary, deliverables, timeline,
      next_step, exclusions, terms, valid_until, discount, created_by
    ) values (
      p_org, v_client, v_number, v_title,
      nullif(trim(p_data ->> 'summary'), ''),
      coalesce(v_deliverables, '{}'),
      nullif(trim(p_data ->> 'timeline'), ''),
      nullif(trim(p_data ->> 'next_step'), ''),
      nullif(trim(p_data ->> 'exclusions'), ''),
      nullif(trim(p_data ->> 'terms'), ''),
      v_valid, v_discount, auth.uid()
    )
    returning * into v_row;
    perform public._log_proposal_event(v_row.id, p_org, 'created', 'team');
  else
    v_row := public._lock_team_proposal(p_id);
    if v_row.organization_id <> p_org then
      raise exception 'Proposta não encontrada.' using errcode = 'P0001', hint = 'not_found';
    end if;
    if v_row.status in ('accepted', 'declined') then
      raise exception 'Proposta % não pode mais ser alterada. Duplique para criar uma nova versão.',
        case v_row.status when 'accepted' then 'aceita' else 'recusada' end
        using errcode = 'P0001', hint = 'locked';
    end if;

    update public.proposals set
      client_id = v_client,
      title = v_title,
      summary = nullif(trim(p_data ->> 'summary'), ''),
      deliverables = coalesce(v_deliverables, '{}'),
      timeline = nullif(trim(p_data ->> 'timeline'), ''),
      next_step = nullif(trim(p_data ->> 'next_step'), ''),
      exclusions = nullif(trim(p_data ->> 'exclusions'), ''),
      terms = nullif(trim(p_data ->> 'terms'), ''),
      valid_until = v_valid,
      discount = v_discount
    where id = p_id
    returning * into v_row;

    delete from public.proposal_items where proposal_id = p_id;
    -- Alterar o que o cliente já recebeu fica registrado na linha do tempo.
    if v_row.status <> 'draft' then
      perform public._log_proposal_event(v_row.id, p_org, 'updated', 'team');
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(v_items) loop
    if char_length(trim(coalesce(v_item ->> 'name', ''))) = 0 then
      raise exception 'O item % está sem descrição.', v_position + 1 using errcode = 'P0001', hint = 'items';
    end if;
    if coalesce((v_item ->> 'quantity')::numeric, 0) <= 0 then
      raise exception 'A quantidade do item "%" precisa ser maior que zero.', trim(v_item ->> 'name')
        using errcode = 'P0001', hint = 'items';
    end if;
    if coalesce((v_item ->> 'unit_price')::numeric, -1) < 0 then
      raise exception 'Informe o valor do item "%".', trim(v_item ->> 'name') using errcode = 'P0001', hint = 'items';
    end if;
    insert into public.proposal_items (
      organization_id, proposal_id, position, name, description, unit, quantity, unit_price, is_optional
    ) values (
      p_org, v_row.id, v_position,
      left(trim(v_item ->> 'name'), 160),
      nullif(left(trim(v_item ->> 'description'), 600), ''),
      coalesce(nullif(left(trim(v_item ->> 'unit'), 20), ''), 'un'),
      (v_item ->> 'quantity')::numeric,
      (v_item ->> 'unit_price')::numeric,
      coalesce((v_item ->> 'is_optional')::boolean, false)
    );
    v_position := v_position + 1;
  end loop;

  perform public._recalc_proposal_totals(v_row.id);
  return v_row.id;
end;
$$;

-- Marca como enviada e devolve o token do link público.
create or replace function public.send_proposal(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.proposals;
begin
  v_row := public._lock_team_proposal(p_id);
  perform public._require_subscription(v_row.organization_id);
  if v_row.status in ('accepted', 'declined') then
    raise exception 'Esta proposta já foi respondida pelo cliente.' using errcode = 'P0001', hint = 'locked';
  end if;
  if v_row.valid_until < public._today() then
    raise exception 'A validade desta proposta já passou. Atualize a data antes de enviar.'
      using errcode = 'P0001', hint = 'expired';
  end if;

  update public.proposals
     set status = case when status = 'draft' then 'sent'::public.proposal_status else status end,
         sent_at = coalesce(sent_at, now())
   where id = p_id
  returning * into v_row;

  perform public._log_proposal_event(p_id, v_row.organization_id, 'sent', 'team');
  return jsonb_build_object('share_token', v_row.share_token, 'status', v_row.status);
end;
$$;

-- Cria uma cópia em rascunho (nova numeração e validade).
create or replace function public.duplicate_proposal(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_src public.proposals;
  v_number integer;
  v_days integer;
  v_new uuid;
begin
  select * into v_src from public.proposals where id = p_id;
  if not found or not public.is_org_member(v_src.organization_id) then
    raise exception 'Proposta não encontrada.' using errcode = 'P0001', hint = 'not_found';
  end if;

  update public.organizations
     set next_proposal_number = next_proposal_number + 1
   where id = v_src.organization_id
  returning next_proposal_number - 1, default_validity_days into v_number, v_days;

  insert into public.proposals (
    organization_id, client_id, number, title, summary, deliverables, timeline,
    next_step, exclusions, terms, valid_until, discount, created_by
  ) values (
    v_src.organization_id, v_src.client_id, v_number, v_src.title, v_src.summary, v_src.deliverables,
    v_src.timeline, v_src.next_step, v_src.exclusions, v_src.terms,
    public._today() + v_days, v_src.discount, auth.uid()
  )
  returning id into v_new;

  insert into public.proposal_items (organization_id, proposal_id, position, name, description, unit, quantity, unit_price, is_optional)
  select organization_id, v_new, position, name, description, unit, quantity, unit_price, is_optional
  from public.proposal_items where proposal_id = p_id;

  perform public._recalc_proposal_totals(v_new);
  perform public._log_proposal_event(v_new, v_src.organization_id, 'duplicated', 'team', null, 'Cópia de ' || v_src.code);
  return v_new;
end;
$$;

-- Aceite combinado fora do link (WhatsApp, reunião): a equipe registra.
create or replace function public.record_manual_acceptance(p_id uuid, p_signer_name text, p_selected_items uuid[] default '{}', p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.proposals;
  v_selected uuid[];
  v_extra numeric;
  v_snapshot jsonb;
begin
  v_row := public._lock_team_proposal(p_id);
  if v_row.status in ('accepted', 'declined') then
    raise exception 'Esta proposta já foi respondida.' using errcode = 'P0001', hint = 'locked';
  end if;
  if char_length(trim(coalesce(p_signer_name, ''))) not between 3 and 120 then
    raise exception 'Informe o nome de quem aprovou.' using errcode = 'P0001', hint = 'signer_name';
  end if;

  select coalesce(array_agg(i.id), '{}'), coalesce(sum(round(i.quantity * i.unit_price, 2)), 0)
    into v_selected, v_extra
  from public.proposal_items i
  where i.proposal_id = p_id and i.is_optional and i.id = any (coalesce(p_selected_items, '{}'));

  v_snapshot := public._proposal_payload(p_id);
  insert into public.proposal_acceptances (
    proposal_id, organization_id, signer_name, signature_mode, signature_data, selected_items,
    total, snapshot, content_hash, recorded_by
  ) values (
    p_id, v_row.organization_id, trim(p_signer_name), 'manual', left(nullif(trim(p_note), ''), 1000), v_selected,
    v_row.total_amount + v_extra, v_snapshot,
    encode(sha256(convert_to(v_snapshot::text, 'UTF8')), 'hex'), auth.uid()
  );

  update public.proposals
     set status = 'accepted', accepted_at = now(), accepted_total = v_row.total_amount + v_extra,
         sent_at = coalesce(sent_at, now())
   where id = p_id;
  perform public._log_proposal_event(p_id, v_row.organization_id, 'accepted', 'team', trim(p_signer_name), p_note);
end;
$$;

create or replace function public.mark_proposal_declined(p_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.proposals;
begin
  v_row := public._lock_team_proposal(p_id);
  if v_row.status in ('accepted', 'declined') then
    raise exception 'Esta proposta já foi respondida.' using errcode = 'P0001', hint = 'locked';
  end if;
  update public.proposals
     set status = 'declined', declined_at = now(), decline_reason = left(nullif(trim(p_reason), ''), 1000)
   where id = p_id;
  perform public._log_proposal_event(p_id, v_row.organization_id, 'declined', 'team', null, p_reason);
end;
$$;

-- Recusada volta a rascunho para ser ajustada e reenviada.
create or replace function public.reopen_proposal(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.proposals;
begin
  v_row := public._lock_team_proposal(p_id);
  if v_row.status <> 'declined' then
    raise exception 'Só propostas recusadas podem ser reabertas.' using errcode = 'P0001';
  end if;
  perform public._require_subscription(v_row.organization_id);
  update public.proposals set status = 'draft', declined_at = null, decline_reason = null where id = p_id;
  perform public._log_proposal_event(p_id, v_row.organization_id, 'reopened', 'team');
end;
$$;

-- Aceitas ficam guardadas para sempre. Atendente só apaga os próprios rascunhos.
create or replace function public.delete_proposal(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.proposals;
begin
  v_row := public._lock_team_proposal(p_id);
  if v_row.status = 'accepted' then
    raise exception 'Propostas aceitas não podem ser apagadas: elas guardam o registro do aceite.'
      using errcode = 'P0001', hint = 'locked';
  end if;
  if not public.can_manage_org(v_row.organization_id)
     and not (v_row.status = 'draft' and v_row.created_by = auth.uid()) then
    raise exception 'Só o dono ou o gerente podem apagar propostas já enviadas.' using errcode = '42501';
  end if;
  delete from public.proposals where id = p_id;
end;
$$;

revoke execute on function public.save_proposal(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.send_proposal(uuid) from public, anon;
revoke execute on function public.duplicate_proposal(uuid) from public, anon;
revoke execute on function public.record_manual_acceptance(uuid, text, uuid[], text) from public, anon;
revoke execute on function public.mark_proposal_declined(uuid, text) from public, anon;
revoke execute on function public.reopen_proposal(uuid) from public, anon;
revoke execute on function public.delete_proposal(uuid) from public, anon;
grant execute on function public.save_proposal(uuid, uuid, jsonb) to authenticated;
grant execute on function public.send_proposal(uuid) to authenticated;
grant execute on function public.duplicate_proposal(uuid) to authenticated;
grant execute on function public.record_manual_acceptance(uuid, text, uuid[], text) to authenticated;
grant execute on function public.mark_proposal_declined(uuid, text) to authenticated;
grant execute on function public.reopen_proposal(uuid) to authenticated;
grant execute on function public.delete_proposal(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Cliente (link público, sem login)
-- ---------------------------------------------------------------------

-- Proposta + respostas já dadas. Rascunho não aparece (null).
create or replace function public.get_public_proposal(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row public.proposals;
begin
  select * into v_row from public.proposals where share_token = p_token;
  if not found or v_row.status = 'draft' then
    return null;
  end if;
  return public._proposal_payload(v_row.id) || jsonb_build_object(
    'decline_reason', v_row.decline_reason,
    'declined_at', v_row.declined_at,
    'acceptance', (
      select jsonb_build_object(
        'signer_name', a.signer_name, 'signature_mode', a.signature_mode,
        'signature_data', case when a.signature_mode = 'manual' then null else a.signature_data end,
        'selected_items', to_jsonb(a.selected_items), 'total', a.total,
        'accepted_at', a.accepted_at, 'content_hash', a.content_hash
      )
      from public.proposal_acceptances a where a.proposal_id = v_row.id
    ),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object('actor_name', e.actor_name, 'message', e.message, 'created_at', e.created_at) order by e.created_at)
      from public.proposal_events e
      where e.proposal_id = v_row.id and e.kind = 'change_requested'
    ), '[]'::jsonb)
  );
end;
$$;

-- Conta a abertura do link. Quem é da equipe não conta.
create or replace function public.register_proposal_view(p_token uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.proposals;
begin
  select * into v_row from public.proposals where share_token = p_token for update;
  if not found or v_row.status not in ('sent', 'viewed', 'negotiating') then
    return;
  end if;
  if auth.uid() is not null and public.is_org_member(v_row.organization_id) then
    return;
  end if;

  update public.proposals
     set view_count = view_count + 1,
         first_viewed_at = coalesce(first_viewed_at, now()),
         last_viewed_at = now(),
         status = case when status = 'sent' then 'viewed'::public.proposal_status else status end
   where id = v_row.id;

  -- Uma linha na linha do tempo a cada 30 minutos, no máximo.
  if not exists (
    select 1 from public.proposal_events
     where proposal_id = v_row.id and kind = 'viewed' and created_at > now() - interval '30 minutes'
  ) then
    perform public._log_proposal_event(v_row.id, v_row.organization_id, 'viewed', 'client');
  end if;
end;
$$;

create or replace function public._lock_open_public_proposal(p_token uuid)
returns public.proposals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.proposals;
begin
  select * into v_row from public.proposals where share_token = p_token for update;
  if not found or v_row.status = 'draft' then
    raise exception 'Proposta não encontrada.' using errcode = 'P0001', hint = 'not_found';
  end if;
  if v_row.status = 'accepted' then
    raise exception 'Esta proposta já foi aceita.' using errcode = 'P0001', hint = 'already_accepted';
  end if;
  if v_row.status = 'declined' then
    raise exception 'Esta proposta foi recusada. Fale com quem enviou para receber uma nova versão.'
      using errcode = 'P0001', hint = 'declined';
  end if;
  if v_row.valid_until < public._today() then
    raise exception 'Esta proposta venceu em %. Peça uma nova data para quem enviou.', to_char(v_row.valid_until, 'DD/MM/YYYY')
      using errcode = 'P0001', hint = 'expired';
  end if;
  return v_row;
end;
$$;

revoke execute on function public._lock_open_public_proposal(uuid) from public, anon, authenticated;

-- Cliente pede ajuste em vez de sumir: a proposta vai para "em negociação".
create or replace function public.request_proposal_changes(p_token uuid, p_name text, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.proposals;
begin
  v_row := public._lock_open_public_proposal(p_token);
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 120 then
    raise exception 'Informe seu nome.' using errcode = 'P0001', hint = 'name';
  end if;
  if char_length(trim(coalesce(p_message, ''))) not between 3 and 1000 then
    raise exception 'Escreva o que gostaria de ajustar (até 1000 letras).' using errcode = 'P0001', hint = 'message';
  end if;
  if (select count(*) from public.proposal_events
       where proposal_id = v_row.id and kind = 'change_requested' and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Você já enviou muitas mensagens hoje. Fale direto com quem enviou a proposta.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;

  update public.proposals set status = 'negotiating' where id = v_row.id;
  perform public._log_proposal_event(v_row.id, v_row.organization_id, 'change_requested', 'client', p_name, p_message);
end;
$$;

-- Aceite pelo link: confere tudo, calcula o total com os opcionais marcados
-- e guarda uma cópia congelada do conteúdo aceito.
create or replace function public.accept_public_proposal(
  p_token uuid,
  p_signer_name text,
  p_signer_email text,
  p_signature_mode text,
  p_signature_data text,
  p_selected_items uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.proposals;
  v_name text := trim(coalesce(p_signer_name, ''));
  v_email text := nullif(lower(trim(coalesce(p_signer_email, ''))), '');
  v_selected uuid[];
  v_extra numeric;
  v_total numeric;
  v_snapshot jsonb;
  v_hash text;
  v_now timestamptz := now();
begin
  v_row := public._lock_open_public_proposal(p_token);

  if char_length(v_name) not between 3 and 120 then
    raise exception 'Informe seu nome completo.' using errcode = 'P0001', hint = 'signer_name';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail inválido.' using errcode = 'P0001', hint = 'signer_email';
  end if;
  if p_signature_mode not in ('typed', 'drawn') then
    raise exception 'Escolha como assinar.' using errcode = 'P0001', hint = 'signature';
  end if;
  if p_signature_mode = 'drawn' and (
    p_signature_data is null
    or p_signature_data not like 'data:image/png;base64,%'
    or char_length(p_signature_data) > 150000
  ) then
    raise exception 'Desenhe sua assinatura novamente.' using errcode = 'P0001', hint = 'signature';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_selected_items, '{}')) s(id)
    where not exists (
      select 1 from public.proposal_items i where i.id = s.id and i.proposal_id = v_row.id and i.is_optional
    )
  ) then
    raise exception 'Algum opcional escolhido não faz parte desta proposta. Recarregue a página.'
      using errcode = 'P0001', hint = 'items';
  end if;

  select coalesce(array_agg(i.id order by i.position), '{}'), coalesce(sum(round(i.quantity * i.unit_price, 2)), 0)
    into v_selected, v_extra
  from public.proposal_items i
  where i.proposal_id = v_row.id and i.is_optional and i.id = any (coalesce(p_selected_items, '{}'));
  v_total := v_row.total_amount + v_extra;

  v_snapshot := public._proposal_payload(v_row.id);
  v_hash := encode(sha256(convert_to(v_snapshot::text, 'UTF8')), 'hex');

  insert into public.proposal_acceptances (
    proposal_id, organization_id, signer_name, signer_email, signature_mode, signature_data,
    selected_items, total, snapshot, content_hash, ip, user_agent, accepted_at
  ) values (
    v_row.id, v_row.organization_id, v_name, v_email, p_signature_mode,
    case when p_signature_mode = 'drawn' then p_signature_data else v_name end,
    v_selected, v_total, v_snapshot, v_hash,
    left(trim(split_part(coalesce(public._request_header('x-forwarded-for'), ''), ',', 1)), 100),
    left(public._request_header('user-agent'), 400),
    v_now
  );

  update public.proposals
     set status = 'accepted', accepted_at = v_now, accepted_total = v_total
   where id = v_row.id;
  perform public._log_proposal_event(v_row.id, v_row.organization_id, 'accepted', 'client', v_name);

  return jsonb_build_object('accepted_at', v_now, 'total', v_total, 'content_hash', v_hash);
end;
$$;

create or replace function public.decline_public_proposal(p_token uuid, p_name text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.proposals;
begin
  v_row := public._lock_open_public_proposal(p_token);
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 120 then
    raise exception 'Informe seu nome.' using errcode = 'P0001', hint = 'name';
  end if;
  update public.proposals
     set status = 'declined', declined_at = now(), decline_reason = left(nullif(trim(p_reason), ''), 1000)
   where id = v_row.id;
  perform public._log_proposal_event(v_row.id, v_row.organization_id, 'declined', 'client', p_name, p_reason);
end;
$$;

revoke execute on function public.get_public_proposal(uuid) from public;
revoke execute on function public.register_proposal_view(uuid) from public;
revoke execute on function public.request_proposal_changes(uuid, text, text) from public;
revoke execute on function public.accept_public_proposal(uuid, text, text, text, text, uuid[]) from public;
revoke execute on function public.decline_public_proposal(uuid, text, text) from public;
grant execute on function public.get_public_proposal(uuid) to anon, authenticated;
grant execute on function public.register_proposal_view(uuid) to anon, authenticated;
grant execute on function public.request_proposal_changes(uuid, text, text) to anon, authenticated;
grant execute on function public.accept_public_proposal(uuid, text, text, text, text, uuid[]) to anon, authenticated;
grant execute on function public.decline_public_proposal(uuid, text, text) to anon, authenticated;
