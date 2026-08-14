-- Public living area for map filters. BuildingAreaTotal only. No owner. SECURITY DEFINER.

create or replace function public.get_listing_living_areas()
returns table (id uuid, sqft integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    case
      when (l.mls_data ->> 'BuildingAreaTotal') ~ '^[0-9]+(\.[0-9]+)?$'
        and (l.mls_data ->> 'BuildingAreaTotal')::numeric >= 100
        and (l.mls_data ->> 'BuildingAreaTotal')::numeric <= 100000
      then round((l.mls_data ->> 'BuildingAreaTotal')::numeric)::integer
      else null
    end as sqft
  from public.listings l
  where nullif(btrim(l.mls_data ->> 'BuildingAreaTotal'), '') is not null;
$$;

revoke all on function public.get_listing_living_areas() from public;
grant execute on function public.get_listing_living_areas()
  to anon, authenticated, service_role;

comment on function public.get_listing_living_areas() is
  'Public living area from MLS BuildingAreaTotal for map filters. Never owner or agent.';
