import { describe, expect, it } from 'vitest'
import {
  AIKEN_COUNTY_PROPERTY_SEARCH_URL,
  emptyListingPublicFacts,
  extractListingPhotos,
  extractPublicListingFacts,
  formatListingCourtesy,
  isListingId,
  PUBLIC_RESO_SELECT,
  formatCountyRecordsBlock,
  isAikenCountyAddress,
} from './listing-facts'

describe('extractPublicListingFacts', () => {
  it('does not ask Spark for fields this MLS rejects', () => {
    expect(PUBLIC_RESO_SELECT).not.toContain('LivingArea')
    expect(PUBLIC_RESO_SELECT).not.toContain('StoriesTotal')
    expect(PUBLIC_RESO_SELECT).not.toContain('PoolPrivateYN')
    expect(PUBLIC_RESO_SELECT).toContain('BuildingAreaTotal')
    expect(PUBLIC_RESO_SELECT).toContain('YearBuilt')
    expect(PUBLIC_RESO_SELECT).toContain('ListOfficeName')
    expect(PUBLIC_RESO_SELECT).not.toContain('ListAgent')
    expect(PUBLIC_RESO_SELECT).not.toContain('OwnerName')
  })

  it('reads BuildingAreaTotal from a nested StandardFields payload', () => {
    const facts = extractPublicListingFacts({
      StandardFields: {
        BuildingAreaTotal: 1854,
        YearBuilt: 2023,
        LotSizeAcres: 0.15,
        PropertySubType: 'Single Family Residence',
        ListOfficeName: 'Example Realty Group',
      },
    })
    expect(facts.sqft).toBe(1854)
    expect(facts.year_built).toBe(2023)
    expect(facts.lot_size_acres).toBe(0.15)
    expect(facts.list_office_name).toBe('Example Realty Group')
  })

  it('reads allowlisted RESO keys and ignores junk', () => {
    const facts = extractPublicListingFacts({
      LivingArea: 1842,
      YearBuilt: 1998,
      LotSizeAcres: 0.42,
      PropertySubType: 'Single Family Residence',
      OwnerName: 'MUST NOT APPEAR',
      Media: [{ MediaURL: 'https://example.com/x.jpg' }],
    })
    expect(facts.sqft).toBe(1842)
    expect(facts.year_built).toBe(1998)
    expect(facts.lot_size_acres).toBe(0.42)
    expect(facts.property_subtype).toBe('Single Family Residence')
    expect(JSON.stringify(facts)).not.toContain('MUST NOT APPEAR')
    expect(JSON.stringify(facts)).not.toContain('example.com')
    expect(facts.list_office_name).toBeNull()
  })

  it('drops out-of-range and missing values', () => {
    expect(extractPublicListingFacts(null)).toEqual(emptyListingPublicFacts())
    expect(
      extractPublicListingFacts({ LivingArea: 12, YearBuilt: 1492 })
    ).toEqual(emptyListingPublicFacts())
  })
})

describe('listing photos and ids', () => {
  it('accepts UUIDs only', () => {
    expect(isListingId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true)
    expect(isListingId('not-a-uuid')).toBe(false)
    expect(isListingId('')).toBe(false)
  })

  it('orders https MediaURL and prepends a missing fallback', () => {
    const photos = extractListingPhotos(
      {
        Media: [
          { MediaURL: 'https://cdn.example.com/b.jpg', Order: 2 },
          { MediaURL: 'http://insecure.example.com/x.jpg', Order: 1 },
          { MediaURL: 'https://cdn.example.com/a.jpg', Order: 1 },
          { MediaURL: 'javascript:alert(1)', Order: 0 },
        ],
      },
      'https://cdn.example.com/cover.jpg'
    )
    expect(photos[0]).toBe('https://cdn.example.com/cover.jpg')
    expect(photos).toContain('https://cdn.example.com/a.jpg')
    expect(photos).toContain('https://cdn.example.com/b.jpg')
    expect(photos.join(' ')).not.toContain('insecure')
    expect(photos.join(' ')).not.toContain('javascript')
  })

  it('returns only the fallback when Media is missing', () => {
    expect(extractListingPhotos(null, 'https://cdn.example.com/only.jpg')).toEqual(
      ['https://cdn.example.com/only.jpg']
    )
    expect(extractListingPhotos({}, 'http://bad.example.com/x.jpg')).toEqual([])
  })
})

describe('Aiken County records link-out', () => {
  it('offers the official search for Aiken addresses only', () => {
    expect(isAikenCountyAddress('111 Greenville Street NW, Aiken, SC')).toBe(
      true
    )
    expect(isAikenCountyAddress('716 Augusta Road, Edgefield, SC')).toBe(false)

    const aiken = formatCountyRecordsBlock({
      address: '111 Greenville Street NW',
      inAikenCounty: true,
    })
    expect(aiken).toContain(AIKEN_COUNTY_PROPERTY_SEARCH_URL)
    expect(aiken).toContain('do not scrape')
    expect(aiken).toContain('111 Greenville Street NW')

    const other = formatCountyRecordsBlock({
      address: '716 Augusta Road',
      inAikenCounty: false,
    })
    expect(other).toContain('outside the Aiken County lookup')
    expect(other).not.toContain(AIKEN_COUNTY_PROPERTY_SEARCH_URL)
  })
})

describe('listing office courtesy', () => {
  it('credits the MLS office name and never defaults to Nick', () => {
    expect(formatListingCourtesy('Coldwell Banker Caine')).toBe(
      'Listing courtesy of Coldwell Banker Caine.'
    )
    expect(formatListingCourtesy('  ')).toBeNull()
    expect(formatListingCourtesy(null)).toBeNull()
    expect(formatListingCourtesy(undefined)).toBeNull()
    expect(formatListingCourtesy('Example Realty Group')).not.toContain(
      'Nick Williams'
    )
    expect(formatListingCourtesy('Example Realty Group')).not.toContain(
      'Best Life'
    )
  })

  it('ignores agent and owner names in the MLS blob', () => {
    const facts = extractPublicListingFacts({
      ListOfficeName: 'Aiken Homes LLC',
      ListAgentFullName: 'MUST NOT APPEAR',
      OwnerName: 'MUST NOT APPEAR',
    })
    expect(facts.list_office_name).toBe('Aiken Homes LLC')
    expect(JSON.stringify(facts)).not.toContain('MUST NOT APPEAR')
  })
})
