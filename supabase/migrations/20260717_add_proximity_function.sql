-- Proximity helper function
create or replace function public.get_nearby_listings(
  lat double precision,
  lng double precision,
  radius_meters integer default 10000
)
returns setof public.listings as $$
begin
  return query
  select *
  from public.listings
  where ST_DWithin(coordinates, ST_MakePoint(lng, lat), radius_meters)
  order by coordinates <-> ST_MakePoint(lng, lat)
  limit 50;
end;
$$ language plpgsql security definer;

-- Grant usage
grant execute on function public.get_nearby_listings(double precision, double precision, integer) to authenticated, anon;

comment on function public.get_nearby_listings is 'Returns listings within radius of a point using GIST index';