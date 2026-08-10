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
  /**
   * Soft client-side filter.
   * - beds / baths = minimum
   * - price = maximum (most common user expectation)
   * - location = substring match on address
   * - sqft is currently ignored because the RPC does not return it
   * - Never returns an empty array if the original data had items
   */
  export function filterListings(
    listings: Listing[],
    filters?: SearchFilters | null
  ): Listing[] {
    if (!filters || !Object.values(filters).some(Boolean)) {
      return listings
    }
  
    const filtered = listings.filter((listing) => {
      const beds = Number(listing.beds ?? 0)
      const baths = Number(listing.baths ?? 0)
      const price = Number(listing.price ?? 0)
  
      // Minimum beds
      if (filters.beds && beds > 0 && beds < Number(filters.beds)) return false
  
      // Minimum baths
      if (filters.baths && baths > 0 && baths < Number(filters.baths)) return false
  
      // Maximum price (change the comparison if you want minimum instead)
      if (filters.price && price > 0 && price > Number(filters.price)) return false
  
      // Location against address only
      if (filters.location) {
        const loc = filters.location.toLowerCase().trim()
        const hay = (listing.address || '').toLowerCase()
        if (hay && !hay.includes(loc)) return false
      }
  
      return true
    })
  
    // Soft fallback — never show zero when we have inventory
    if (filtered.length === 0 && listings.length > 0) {
      console.warn('Filter returned 0 — falling back to all listings')
      return listings
    }
  
    return filtered
  }