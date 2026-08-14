import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  filterListingsInBounds,
  isListingSort,
  listingInBounds,
  sortListings,
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

describe('sortListings', () => {
  const cheap = { ...home('cheap', -81.74, 33.56), price: 200000, beds: 2, baths: 1, address: 'Zebra Lane' }
  const mid = { ...home('mid', -81.74, 33.56), price: 400000, beds: 4, baths: 3, address: 'Apple Street' }
  const open = { ...home('open', -81.74, 33.56), price: null, beds: null, baths: null, address: null }

  it('keeps featured order and puts missing numbers last', () => {
    expect(sortListings([cheap, mid, open], 'featured').map((l) => l.id)).toEqual([
      'cheap',
      'mid',
      'open',
    ])
    expect(sortListings([cheap, mid, open], 'price_desc').map((l) => l.id)).toEqual([
      'mid',
      'cheap',
      'open',
    ])
    expect(sortListings([cheap, mid, open], 'price_asc').map((l) => l.id)).toEqual([
      'cheap',
      'mid',
      'open',
    ])
    expect(sortListings([cheap, mid, open], 'beds_desc').map((l) => l.id)).toEqual([
      'mid',
      'cheap',
      'open',
    ])
    expect(sortListings([cheap, mid, open], 'address_asc').map((l) => l.id)).toEqual([
      'mid',
      'cheap',
      'open',
    ])
    expect(isListingSort('price_desc')).toBe(true)
    expect(isListingSort('school_rating')).toBe(false)
  })

  it('does not mutate the input array', () => {
    const input = [cheap, mid]
    const before = input.map((l) => l.id)
    sortListings(input, 'price_desc')
    expect(input.map((l) => l.id)).toEqual(before)
  })
})

describe('listing sort control', () => {
  it('sits above the property stack with a labeled select', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const home = readFileSync(join(here, '../routes/index.tsx'), 'utf8')
    expect(home).toContain('id="listing-sort"')
    expect(home).toContain('htmlFor="listing-sort"')
    expect(home).toContain('sortListings')
    expect(home).toContain('aria-label="Sort homes in view"')
    expect(home).not.toContain('school_rating')
  })
})
