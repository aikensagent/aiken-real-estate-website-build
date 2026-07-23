-- Enable PostGIS if not already enabled
create extension if not exists postgis;

-- Core listings table
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  mls_id text unique,
  status text not null default 'active'
    check (status in ('active', 'pending', 'sold', 'withdrawn')),
  list_price numeric(12,2),
  address_line1 text not null,
  address_line2 text,
  city text not null default 'Aiken',
  state text not null default 'SC',
  zip text,
  beds smallint,
  baths numeric(3,1),
  sqft integer,
  lot_size_acres numeric(8,3),
  year_built smallint,
  property_type text,
  description text,
  coordinates geometry(Point, 4326),
  photos jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Spatial GIST index (required for the existing get_nearby_listings function)
create index listings_coordinates_gist_idx
  on public.listings using gist (coordinates);

-- Supporting indexes
create index listings_status_idx on public.listings (status);
create index listings_list_price_idx on public.listings (list_price);

-- Operating Law 1: RLS enabled in the same migration
alter table public.listings enable row level security;

-- Policies
create policy "Public can view active listings"
  on public.listings
  for select
  using (status = 'active');

create policy "Authenticated users can view all listings"
  on public.listings
  for select
  to authenticated
  using (true);

comment on table public.listings is 'Core property listings with PostGIS coordinates';
comment on column public.listings.coordinates is 'WGS84 Point geometry for spatial queries (SRID 4326)';
