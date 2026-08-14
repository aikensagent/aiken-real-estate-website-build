import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  parsePriceSnapshots,
  shouldRecordPriceSnapshot,
} from './price-history'

const here = dirname(fileURLToPath(import.meta.url))

describe('price snapshot rules', () => {
  it('records the first real price and later changes only', () => {
    expect(shouldRecordPriceSnapshot(null, 425000)).toBe(true)
    expect(shouldRecordPriceSnapshot(425000, 425000)).toBe(false)
    expect(shouldRecordPriceSnapshot(425000, 419000)).toBe(true)
    expect(shouldRecordPriceSnapshot(425000, null)).toBe(false)
  })

  it('drops malformed snapshot rows', () => {
    expect(
      parsePriceSnapshots([
        { list_price: 425000, observed_at: '2026-08-13T16:00:00.000Z' },
        { list_price: 'nope', observed_at: '2026-08-13T16:00:00.000Z' },
        { list_price: 419000 },
      ])
    ).toEqual([
      { list_price: 425000, observed_at: '2026-08-13T16:00:00.000Z' },
    ])
  })
})

describe('ingest and listing page wiring', () => {
  it('snapshots from mls-ingest and reads through the public RPC', () => {
    const ingest = readFileSync(
      join(here, '../../supabase/functions/mls-ingest/index.ts'),
      'utf8'
    )
    const migration = readFileSync(
      join(
        here,
        '../../supabase/migrations/20260813_listing_price_snapshots.sql'
      ),
      'utf8'
    )
    const context = readFileSync(join(here, 'listings-context.ts'), 'utf8')
    expect(ingest).toContain('listing_price_snapshots')
    expect(ingest).toContain('shouldRecordPriceSnapshot')
    expect(migration).toContain('enable row level security')
    expect(migration).toContain('get_listing_price_history')
    expect(migration).toContain('security definer')
    expect(migration).toMatch(/revoke all on table public.listing_price_snapshots/)
    expect(context).toContain('get_listing_price_history')
    expect(context).toContain('priceHistory')
    expect(context).toContain('loadListingPriceHistory')
    expect(context).toContain('formatPriceSeenBlock')
  })
})
