-- Public IDX office names for map cards and pin popups.
-- ListOfficeName only. No agent name. No owner. SECURITY DEFINER read.

create or replace function public.get_listing_office_names()
returns table (id uuid, list_office_name text)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    nullif(btrim(l.mls_data ->> 'ListOfficeName'), '') as list_office_name
  from public.listings l
  where nullif(btrim(l.mls_data ->> 'ListOfficeName'), '') is not null;
$$;

revoke all on function public.get_listing_office_names() from public;
grant execute on function public.get_listing_office_names()
  to anon, authenticated, service_role;

comment on function public.get_listing_office_names() is
  'Public listing brokerage names from MLS ListOfficeName. Never agent or owner.';
