import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildSavedSearchPayload,
  labelSavedSearch,
  parseSavedSearchPayload,
} from './saved-search'

const here = dirname(fileURLToPath(import.meta.url))

const downtown = {
  id: 'downtown',
  label: 'Downtown',
  lng: -81.7198,
  lat: 33.5604,
  spanLng: 0.028,
  spanLat: 0.022,
}

describe('saved search payload', () => {
  it('labels filters and a geographic area only', () => {
    const payload = buildSavedSearchPayload(
      { beds: '3', price: '400000' },
      downtown
    )
    expect(labelSavedSearch(payload)).toBe('3+ beds · $400k+ · Downtown')
    expect(payload.area?.label).toBe('Downtown')
  })

  it('drops out-of-area coordinates and junk fields', () => {
    expect(
      parseSavedSearchPayload({
        beds: '2',
        area: { id: 'nyc', label: 'NYC', lng: -74, lat: 40.7, spanLng: 0.02, spanLat: 0.02 },
      })?.area
    ).toBeNull()
    expect(parseSavedSearchPayload({ beds: 'abc' })?.beds).toBeUndefined()
  })
})

describe('saved search wiring', () => {
  it('saves from the map and lists on /account through SECURITY DEFINER RPCs', () => {
    const home = readFileSync(join(here, '../routes/index.tsx'), 'utf8')
    const account = readFileSync(join(here, '../routes/account.tsx'), 'utf8')
    const migration = readFileSync(
      join(here, '../../supabase/migrations/20260813_saved_buyer_searches.sql'),
      'utf8'
    )
    expect(home).toContain('Save this search')
    expect(home).toContain('saveBuyerSearch')
    expect(home).toContain('savedSearchId')
    expect(account).toContain('listBuyerSearches')
    expect(account).toContain('search={{ saved: row.id }}')
    expect(account).not.toMatch(/from ['"][^'"]*supabase['"]/)
    expect(migration).toContain('enable row level security')
    expect(migration).toContain('save_buyer_search')
    expect(migration).toContain('auth.uid()')
    expect(migration).toMatch(/revoke all on table public.saved_searches/)
  })
})
