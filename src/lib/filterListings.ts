export type SearchFilters = {
  location?: string
  beds?: string
  baths?: string
  sqft?: string
  price?: string
}

export type Listing = {
  id: string
  address: string | null
  price: number | null
  beds: number | null
  baths: number | null
  lng: number | null
  lat: number | null
  primary_photo_url: string | null
  property_type?: string | null
  list_office_name?: string | null
  sqft?: number | null
}

/** Camera bbox from Mapbox `map.getBounds()` — west/south/east/north in WGS84. */
export type MapViewportBounds = {
  west: number
  south: number
  east: number
  north: number
}

/**
 * Client-side filter.
 * - beds / baths / price / sqft = minimums
 * - location = substring match on address (kept for future use)
 * - unknown sqft stays visible (do not drop homes we cannot measure yet)
 * - Returns the filtered set as-is (empty is allowed — do not silently fall back)
 */
export function filterListings(
  listings: Listing[],
  filters?: SearchFilters | null
): Listing[] {
  if (!filters || !Object.values(filters).some(Boolean)) {
    return listings
  }

  return listings.filter((listing) => {
    const beds = Number(listing.beds ?? 0)
    const baths = Number(listing.baths ?? 0)
    const price = Number(listing.price ?? 0)
    const sqft = Number(listing.sqft ?? 0)

    // Minimum beds
    if (filters.beds && beds > 0 && beds < Number(filters.beds)) return false

    // Minimum baths
    if (filters.baths && baths > 0 && baths < Number(filters.baths)) return false

    // Minimum price
    if (filters.price && price > 0 && price < Number(filters.price)) return false

    // Minimum living area — skip the check when sqft is unknown
    if (filters.sqft && sqft > 0 && sqft < Number(filters.sqft)) return false

    // Location against address only (kept for future use)
    if (filters.location) {
      const loc = filters.location.toLowerCase().trim()
      const hay = (listing.address || '').toLowerCase()
      if (hay && !hay.includes(loc)) return false
    }

    return true
  })
}

export function listingInBounds(
  listing: Listing,
  bounds: MapViewportBounds
): boolean {
  if (listing.lng == null || listing.lat == null) return false
  if (!Number.isFinite(listing.lng) || !Number.isFinite(listing.lat)) return false
  return (
    listing.lng >= bounds.west &&
    listing.lng <= bounds.east &&
    listing.lat >= bounds.south &&
    listing.lat <= bounds.north
  )
}

/** Cards follow the map: no bounds yet means show the full filtered set. */
export function filterListingsInBounds(
  listings: Listing[],
  bounds: MapViewportBounds | null
): Listing[] {
  if (!bounds) return listings
  return listings.filter((listing) => listingInBounds(listing, bounds))
}

export const LISTING_SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'beds_desc', label: 'Beds: most first' },
  { value: 'baths_desc', label: 'Baths: most first' },
  { value: 'address_asc', label: 'Address A–Z' },
] as const

export type ListingSort = (typeof LISTING_SORT_OPTIONS)[number]['value']

export function isListingSort(value: string): value is ListingSort {
  return LISTING_SORT_OPTIONS.some((option) => option.value === value)
}

function missingLast(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: 'asc' | 'desc'
): number {
  const aMissing = a == null || !Number.isFinite(a)
  const bMissing = b == null || !Number.isFinite(b)
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1
  return direction === 'asc' ? a - b : b - a
}

/** Display order only — does not mutate the input or re-query the map RPC. */
export function sortListings(
  listings: Listing[],
  sort: ListingSort
): Listing[] {
  if (sort === 'featured') return listings

  return [...listings].sort((a, b) => {
    let cmp = 0
    if (sort === 'price_asc') cmp = missingLast(a.price, b.price, 'asc')
    else if (sort === 'price_desc') cmp = missingLast(a.price, b.price, 'desc')
    else if (sort === 'beds_desc') cmp = missingLast(a.beds, b.beds, 'desc')
    else if (sort === 'baths_desc') cmp = missingLast(a.baths, b.baths, 'desc')
    else if (sort === 'address_asc') {
      const aAddr = (a.address || '').trim()
      const bAddr = (b.address || '').trim()
      if (!aAddr && !bAddr) cmp = 0
      else if (!aAddr) cmp = 1
      else if (!bAddr) cmp = -1
      else cmp = aAddr.localeCompare(bAddr, 'en', { sensitivity: 'base' })
    }
    if (cmp !== 0) return cmp
    return a.id.localeCompare(b.id)
  })
}