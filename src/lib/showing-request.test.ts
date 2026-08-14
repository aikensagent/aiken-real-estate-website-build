import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))

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
    expect(api).toContain('buyerUserClient')
    expect(widget).toContain('Schedule a showing')
    expect(widget).toContain('onShowingIntent')
  })
})
