import { describe, expect, it } from 'vitest'
import {
  formatSelectedListingBlock,
  parseSelectedListing,
  preferServerListing,
  type ListingSummary,
} from './listings-context'
import { formatPriceSeenBlock } from './price-history'

const tapped: ListingSummary = {
  id: 'abc',
  address: '111 Greenville Street NW, Aiken, SC',
  price: 425000,
  beds: 3,
  baths: 2,
}

describe('selected listing context', () => {
  it('keeps public facts and drops empty origins', () => {
    expect(parseSelectedListing(null)).toBeNull()
    expect(parseSelectedListing({})).toBeNull()
    expect(
      parseSelectedListing({
        listingId: 'abc',
        label: '111 Greenville Street NW, Aiken, SC',
        price: 425000,
        beds: 3,
        baths: 2,
      })
    ).toEqual(tapped)
  })

  it('prefers the live inventory row when ids match', () => {
    const server: ListingSummary = {
      ...tapped,
      price: 419000,
      mls_id: '123456',
    }
    expect(preferServerListing(tapped, [server]).price).toBe(419000)
    expect(preferServerListing(tapped, [{ id: 'other' }])).toEqual(tapped)
  })

  it('formats a selected-home block without inventing extra fields', () => {
    const block = formatSelectedListingBlock(tapped)
    expect(block).toContain('SELECTED HOME')
    expect(block).toContain('111 Greenville Street NW')
    expect(block).toContain('$425,000')
    expect(block).toContain('3 bed')
    expect(block).toContain('2 bath')
    expect(block).not.toContain('sqft')
    expect(block).not.toContain('primary_photo')
  })

  it('includes sqft and year when those facts are present', () => {
    const block = formatSelectedListingBlock({
      ...tapped,
      sqft: 1842,
      year_built: 1998,
      lot_size_acres: 0.42,
    })
    expect(block).toContain('1,842 sqft')
    expect(block).toContain('built 1998')
    expect(block).toContain('0.42 acres')
    expect(block).toContain('COUNTY RECORDS')
  })

  it('includes remarks and garage when those facts are present', () => {
    const block = formatSelectedListingBlock({
      ...tapped,
      remarks: 'Hardwood floors and a screened porch.',
      garage_spaces: 2,
      subdivision: 'Downtown Aiken',
    })
    expect(block).toContain('Hardwood floors')
    expect(block).toContain('2 garage')
    expect(block).toContain('Downtown Aiken')
  })

  it('credits the listing office when present and does not invent Nick', () => {
    const block = formatSelectedListingBlock({
      ...tapped,
      list_office_name: 'Example Realty Group',
    })
    expect(block).toContain('listed by Example Realty Group')
    expect(block).not.toContain('listing office')
    expect(block).not.toContain('Nick Williams')
  })

  it('names missing facts so the model cannot invent them', () => {
    const block = formatSelectedListingBlock(tapped)
    expect(block).toContain('Missing from this packet (do not invent):')
    expect(block).toContain('living area')
    expect(block).toContain('HOA')
    expect(block).toContain('listing office')
    expect(block).not.toContain('OwnerName')
    expect(block).not.toContain('primary_photo')
  })

  it('formats price-we-have-seen without inventing a full MLS log', () => {
    const empty = formatPriceSeenBlock([])
    expect(empty).toContain('PRICE WE HAVE SEEN')
    expect(empty).toContain('no ask-price snapshots')
    expect(empty).toContain('not a full MLS')

    const seen = formatPriceSeenBlock([
      { list_price: 425000, observed_at: '2026-08-13T16:00:00.000Z' },
      { list_price: 419000, observed_at: '2026-08-01T12:00:00.000Z' },
    ])
    expect(seen).toContain('$425,000 on 2026-08-13')
    expect(seen).toContain('$419,000 on 2026-08-01')
    expect(seen).toContain('15-minute ingest')
    expect(seen).not.toContain('OwnerName')
  })
})
