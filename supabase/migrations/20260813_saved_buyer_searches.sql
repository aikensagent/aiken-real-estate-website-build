-- Buyer saved searches. Auth only. No anon table access.

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 80),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index saved_searches_lead_created_idx
  on public.saved_searches (lead_id, created_at desc);

alter table public.saved_searches enable row level security;

revoke all on table public.saved_searches from public, anon, authenticated;
grant select, insert, delete on table public.saved_searches to service_role;

create or replace function public.buyer_lead_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select l.id
  from public.leads l
  where l.auth_user_id = auth.uid()
    and l.erased_at is null
  limit 1;
$$;

create or replace function public.save_buyer_search(p_label text, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead uuid := public.buyer_lead_id();
  v_id uuid;
  v_count integer;
  v_label text := trim(coalesce(p_label, ''));
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if v_lead is null then
    raise exception 'no account';
  end if;
  if v_label = '' or char_length(v_label) > 80 then
    raise exception 'label required';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'payload required';
  end if;

  select count(*) into v_count
  from public.saved_searches
  where lead_id = v_lead;
  if v_count >= 20 then
    raise exception 'saved search limit';
  end if;

  insert into public.saved_searches (lead_id, label, payload)
  values (v_lead, v_label, p_payload)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.list_buyer_searches()
returns table (id uuid, label text, payload jsonb, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.label, s.payload, s.created_at
  from public.saved_searches s
  where s.lead_id = public.buyer_lead_id()
  order by s.created_at desc;
$$;

create or replace function public.delete_buyer_search(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead uuid := public.buyer_lead_id();
begin
  if auth.uid() is null or v_lead is null or p_id is null then
    return false;
  end if;
  delete from public.saved_searches
  where id = p_id
    and lead_id = v_lead;
  return found;
end;
$$;

revoke all on function public.buyer_lead_id() from public, anon;
revoke all on function public.save_buyer_search(text, jsonb) from public, anon;
revoke all on function public.list_buyer_searches() from public, anon;
revoke all on function public.delete_buyer_search(uuid) from public, anon;

grant execute on function public.buyer_lead_id() to authenticated, service_role;
grant execute on function public.save_buyer_search(text, jsonb) to authenticated, service_role;
grant execute on function public.list_buyer_searches() to authenticated, service_role;
grant execute on function public.delete_buyer_search(uuid) to authenticated, service_role;
