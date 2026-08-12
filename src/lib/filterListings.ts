export type SearchFilters = {
  location?: string
  beds?: string
  baths?: string
  sqft?: string   // currently ignored — not in RPC
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
 * - sqft is currently ignored because the RPC does not return it
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

    // Minimum beds
    if (filters.beds && beds > 0 && beds < Number(filters.beds)) return false

    // Minimum baths
    if (filters.baths && baths > 0 && baths < Number(filters.baths)) return false

    // Minimum price
    if (filters.price && price > 0 && price < Number(filters.price)) return false

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