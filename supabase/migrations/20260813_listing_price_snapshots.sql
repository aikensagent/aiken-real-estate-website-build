-- Observed asking-price history from the 15-min MLS ingest.
-- We do not import MLS change logs. History starts when this table is live.
-- RLS on. No anon/authenticated table writes. Public read via SECURITY DEFINER RPC.

create table public.listing_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  list_price numeric(12,2) not null,
  observed_at timestamptz not null default now()
);

create index listing_price_snapshots_listing_observed_idx
  on public.listing_price_snapshots (listing_id, observed_at desc);

alter table public.listing_price_snapshots enable row level security;

revoke all on table public.listing_price_snapshots from public, anon, authenticated;
grant select, insert on table public.listing_price_snapshots to service_role;

create or replace function public.get_listing_price_history(p_listing_id uuid)
returns table (list_price numeric, observed_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.list_price, s.observed_at
  from public.listing_price_snapshots s
  inner join public.listings l on l.id = s.listing_id
  where s.listing_id = p_listing_id
  order by s.observed_at asc;
$$;

revoke all on function public.get_listing_price_history(uuid) from public;
grant execute on function public.get_listing_price_history(uuid)
  to anon, authenticated, service_role;

comment on table public.listing_price_snapshots is
  'Asking prices observed by mls-ingest. One row per change (and the first seen price).';
comment on function public.get_listing_price_history(uuid) is
  'Public listing price observations. Not a full MLS history.';
