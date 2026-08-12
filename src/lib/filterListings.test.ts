import { describe, expect, it } from 'vitest'
import {
  filterListingsInBounds,
  listingInBounds,
  type Listing,
  type MapViewportBounds,
} from './filterListings'

const downtown: MapViewportBounds = {
  west: -81.78,
  south: 33.54,
  east: -81.70,
  north: 33.58,
}

function home(id: string, lng: number | null, lat: number | null): Listing {
  return {
    id,
    address: id,
    price: 300000,
    beds: 3,
    baths: 2,
    lng,
    lat,
    primary_photo_url: null,
  }
}

describe('filterListingsInBounds', () => {
  it('keeps listings inside the map camera, including the edges', () => {
    const inside = home('in', -81.74, 33.56)
    const westEdge = home('west', downtown.west, 33.56)
    const outside = home('out', -81.85, 33.62)
    const noCoords = home('none', null, null)

    expect(listingInBounds(inside, downtown)).toBe(true)
    expect(listingInBounds(westEdge, downtown)).toBe(true)
    expect(listingInBounds(outside, downtown)).toBe(false)
    expect(listingInBounds(noCoords, downtown)).toBe(false)

    const visible = filterListingsInBounds(
      [inside, westEdge, outside, noCoords],
      downtown
    )
    expect(visible.map((l) => l.id)).toEqual(['in', 'west'])
  })

  it('shows the full set until the map reports a camera', () => {
    const listings = [home('a', -81.74, 33.56), home('b', -81.85, 33.62)]
    expect(filterListingsInBounds(listings, null)).toEqual(listings)
  })
})
