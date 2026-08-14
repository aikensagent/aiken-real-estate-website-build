import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  formatShowingRequestedAt,
  parseBuyerShowingRows,
} from './showing-requests'

const here = dirname(fileURLToPath(import.meta.url))
const listingId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const requestId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

describe('buyer showing requests', () => {
  it('stores one row per home and does not re-ask consent', () => {
    const migration = readFileSync(
      join(here, '../../supabase/migrations/20260813_showing_requests.sql'),
      'utf8'
    )
    const api = readFileSync(
      join(here, '../routes/api/-showing-requests.ts'),
      'utf8'
    )
    const account = readFileSync(join(here, '../routes/account.tsx'), 'utf8')
    const home = readFileSync(join(here, '../routes/index.tsx'), 'utf8')
    const widget = readFileSync(
      join(here, '../components/ChatWidget.tsx'),
      'utf8'
    )
    expect(migration).toContain('showing_requests')
    expect(migration).toContain('unique (lead_id, listing_id)')
    expect(migration).toContain('request_buyer_showing')
    expect(migration).toContain('list_buyer_showings')
    expect(migration).toContain('security definer')
    expect(migration).toContain('buyer_lead_id')
    expect(migration).toMatch(/revoke all on function public.request_buyer_showing/)
    expect(migration).not.toContain('consent')
    expect(api).toContain('request_buyer_showing')
    expect(api).toContain('list_buyer_showings')
    expect(api).toContain('listBuyerShowings')
    expect(api).toContain('buyerUserClient')
    expect(account).toContain('listBuyerShowings')
    expect(account).toContain('Showing requests')
    expect(account).not.toMatch(/from ['"][^'"]*supabase['"]/)
    expect(account).not.toMatch(/from ['"][^'"]*rou\/node-a['"]/)
    expect(home).toContain('onShowingIntent')
    expect(home).toContain('requestBuyerShowing')
    expect(home).toContain('Request a showing')
    expect(home).toContain('handleShowingIntent')
    expect(home).toContain('Nick will submit this showing request.')
    expect(home).not.toContain('Want Nick to follow up')
    expect(widget).toContain('Schedule a showing')
    expect(widget).toContain('onShowingIntent')
  })

  it('keeps RPC rows allowlisted and drops junk', () => {
    const rows = parseBuyerShowingRows([
      {
        id: requestId,
        listing_id: listingId,
        created_at: '2026-08-13T16:00:00.000Z',
      },
      { id: 'nope', listing_id: listingId, created_at: '2026-08-13T16:00:00.000Z' },
      null,
    ])
    expect(rows).toEqual([
      {
        id: requestId,
        listingId,
        createdAt: '2026-08-13T16:00:00.000Z',
      },
    ])
    expect(parseBuyerShowingRows(null)).toEqual([])
    expect(formatShowingRequestedAt('2026-08-13T16:00:00.000Z')).toMatch(/2026/)
  })
})
