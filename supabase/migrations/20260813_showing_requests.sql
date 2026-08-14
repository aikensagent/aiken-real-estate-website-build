-- One showing request per home per buyer. Auth only. Consent is on the account.

create table public.showing_requests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (lead_id, listing_id)
);

create index showing_requests_lead_created_idx
  on public.showing_requests (lead_id, created_at desc);

alter table public.showing_requests enable row level security;

revoke all on table public.showing_requests from public, anon, authenticated;
grant select, insert on table public.showing_requests to service_role;

create or replace function public.recalculate_lead_score(p_lead_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_score integer := 0;
begin
  if p_lead_id is null then
    return 0;
  end if;

  select coalesce(sum(
    case event_type
      when 'form_submit' then 50
      when 'showing_requested' then 30
      when 'human_handoff_requested' then 25
      when 'polygon_draw' then 20
      when 'form_start' then 15
      when 'chat_open' then 12
      when 'listing_view' then 10
      when 'chat_message' then 8
      when 'map_interaction' then 5
      when 'search' then 4
      when 'page_view' then 1
      else 2
    end
  ), 0)::integer
  into new_score
  from public.lead_events
  where lead_id = p_lead_id
    and occurred_at > now() - interval '30 days';

  update public.leads
  set
    score = new_score,
    last_activity_at = now(),
    updated_at = now()
  where id = p_lead_id;

  return new_score;
end;
$$;

create or replace function public.request_buyer_showing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead uuid := public.buyer_lead_id();
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if v_lead is null then
    raise exception 'no account';
  end if;
  if p_listing_id is null then
    raise exception 'listing required';
  end if;

  insert into public.showing_requests (lead_id, listing_id)
  values (v_lead, p_listing_id)
  on conflict (lead_id, listing_id) do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  insert into public.lead_events (lead_id, session_id, event_type, event_data)
  values (
    v_lead,
    null,
    'showing_requested',
    jsonb_build_object('listingId', p_listing_id)
  );

  perform public.recalculate_lead_score(v_lead);
  return jsonb_build_object('ok', true, 'already', false, 'id', v_id);
end;
$$;

create or replace function public.list_buyer_showings()
returns table (id uuid, listing_id uuid, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.listing_id, s.created_at
  from public.showing_requests s
  where s.lead_id = public.buyer_lead_id()
  order by s.created_at desc;
$$;

revoke all on function public.request_buyer_showing(uuid) from public, anon;
revoke all on function public.list_buyer_showings() from public, anon;

grant execute on function public.request_buyer_showing(uuid)
  to authenticated, service_role;
grant execute on function public.list_buyer_showings()
  to authenticated, service_role;
