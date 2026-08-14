-- Chat turns write lead_events through SECURITY DEFINER only.
-- No message text. Score updates only when a lead is already attached.

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
      when 'form_start' then 15
      when 'polygon_draw' then 20
      when 'human_handoff_requested' then 25
      when 'listing_view' then 10
      when 'map_interaction' then 5
      when 'chat_open' then 12
      when 'chat_message' then 8
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

create or replace function public.record_chat_lead_event(
  p_session_key text,
  p_event_type text,
  p_event_data jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := trim(coalesce(p_session_key, ''));
  v_lead uuid;
  v_score integer := 0;
  v_hour integer := 0;
  v_data jsonb := coalesce(p_event_data, '{}'::jsonb);
begin
  if length(v_key) < 8 or length(v_key) > 80 then
    return 0;
  end if;
  if p_event_type not in ('chat_open', 'chat_message', 'human_handoff_requested') then
    raise exception 'invalid chat event';
  end if;
  if jsonb_typeof(v_data) <> 'object' then
    v_data := '{}'::jsonb;
  end if;

  select l.id into v_lead
  from public.leads l
  where l.visitor_session_key = v_key
    and l.erased_at is null
  limit 1;

  if v_lead is not null then
    update public.lead_events
    set lead_id = v_lead
    where session_id = v_key
      and lead_id is null;
  end if;

  select count(*) into v_hour
  from public.lead_events
  where session_id = v_key
    and event_type = p_event_type
    and occurred_at > now() - interval '1 hour';

  if p_event_type = 'chat_message' and v_hour >= 40 then
    if v_lead is not null then
      select score into v_score from public.leads where id = v_lead;
    end if;
    return coalesce(v_score, 0);
  end if;

  insert into public.lead_events (lead_id, session_id, event_type, event_data)
  values (v_lead, v_key, p_event_type, v_data);

  if v_lead is not null then
    v_score := public.recalculate_lead_score(v_lead);
  end if;
  return v_score;
end;
$$;

revoke all on function public.record_chat_lead_event(text, text, jsonb) from public;
grant execute on function public.record_chat_lead_event(text, text, jsonb)
  to anon, authenticated, service_role;

comment on function public.record_chat_lead_event(text, text, jsonb) is
  'Record a chat scoring event. No transcript. Links lead via visitor_session_key.';
