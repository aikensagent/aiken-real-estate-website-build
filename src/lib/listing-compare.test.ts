import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { emptyListingPublicFacts } from './listing-facts'
import {
  buildCompareMatrix,
  COMPARE_MAX,
  COMPARE_STORAGE_KEY,
  moveCompareId,
  parseCompareIds,
  toggleCompareId,
} from './listing-compare'

const here = dirname(fileURLToPath(import.meta.url))
const listingA = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const listingB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const listingC = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const listingD = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const listingE = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

describe('listing compare selection', () => {
  it('keeps four UUID homes and drops junk', () => {
    expect(parseCompareIds(`${listingA},${listingB},not-an-id`)).toEqual([
      listingA,
      listingB,
    ])
    expect(COMPARE_MAX).toBe(4)
    const fifth = toggleCompareId(
      [listingA, listingB, listingC, listingD],
      listingE
    )
    expect(fifth.full).toBe(true)
    expect(fifth.ids).toHaveLength(4)
    const removed = toggleCompareId([listingA, listingB], listingA)
    expect(removed.ids).toEqual([listingB])
    expect(moveCompareId([listingA, listingB, listingC], 0, 2)).toEqual([
      listingB,
      listingC,
      listingA,
    ])
  })

  it('builds a fact matrix without Fair Housing columns', () => {
    const matrix = buildCompareMatrix([
      {
        id: listingA,
        address: '111 Greenville Street NW',
        price: 425000,
        beds: 3,
        baths: 2,
        mls_id: '123',
        photo: null,
        facts: {
          ...emptyListingPublicFacts(),
          sqft: 1842,
          year_built: 1998,
        },
      },
      {
        id: listingB,
        address: '200 Park Avenue',
        price: 510000,
        beds: 4,
        baths: 3,
        mls_id: '456',
        photo: null,
        facts: {
          ...emptyListingPublicFacts(),
          sqft: 2200,
          pool: 'Private',
        },
      },
    ])
    expect(matrix.find((row) => row.key === 'price')?.values).toEqual([
      '$425,000',
      '$510,000',
    ])
    expect(matrix.find((row) => row.key === 'sqft')?.values[0]).toContain('1,842')
    const blob = matrix.map((row) => row.label).join(' ').toLowerCase()
    expect(blob).not.toContain('school')
    expect(blob).not.toContain('crime')
    expect(blob).not.toContain('family')
    expect(blob).not.toContain('demographic')
  })
})

describe('listing compare wiring', () => {
  it('puts compare on the map cards and listing page without Node A or ChatWidget imports', () => {
    const home = readFileSync(join(here, '../routes/index.tsx'), 'utf8')
    const page = readFileSync(
      join(here, '../routes/listing.$listingId.tsx'),
      'utf8'
    )
    const tray = readFileSync(
      join(here, '../components/ListingCompareTray.tsx'),
      'utf8'
    )
    const api = readFileSync(
      join(here, '../routes/api/-listing-compare.ts'),
      'utf8'
    )
    const ingest = readFileSync(
      join(here, '../../supabase/functions/mls-ingest/index.ts'),
      'utf8'
    )
    expect(home).toContain('ListingCompareTray')
    expect(home).toContain('handleToggleCompare')
    expect(home).toContain('hydrateCompareIds')
    expect(page).toContain('Add to compare')
    expect(page).toContain('ListingCompareTray')
    expect(page).toContain('formatListingFactRows')
    expect(tray).toContain('Compare homes')
    expect(tray).toContain('not a ranking of')
    expect(tray).toContain('Add another home to compare')
    expect(tray).not.toMatch(/from ['"][^'"]*ChatWidget['"]/)
    expect(tray).not.toMatch(/from ['"][^'"]*rou\/node-a['"]/)
    expect(tray).not.toMatch(/#[0-9A-Fa-f]{3,8}/)
    expect(api).toContain('loadListingCompare')
    expect(api).toContain('parseCompareIds')
    expect(api).not.toMatch(/from ['"][^'"]*rou\/node-a['"]/)
    expect(ingest).toContain('PoolFeatures')
    expect(ingest).toContain('FireplaceYN')
    expect(ingest).toContain('OnMarketDate')
    expect(ingest).not.toContain('ListAgentFullName')
    expect(COMPARE_STORAGE_KEY).toContain('compare')
  })
})
