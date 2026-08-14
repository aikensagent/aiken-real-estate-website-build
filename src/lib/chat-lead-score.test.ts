import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { sanitizeChatLeadEventData } from './chat-lead-score'

const here = dirname(fileURLToPath(import.meta.url))
const listingId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('chat lead score payload', () => {
  it('keeps allowlisted scoring fields and drops junk', () => {
    expect(
      sanitizeChatLeadEventData({
        listingId,
        refused: true,
        reason: 'fair_housing',
      })
    ).toEqual({
      listingId,
      refused: true,
      reason: 'fair_housing',
    })
    expect(
      sanitizeChatLeadEventData({
        listingId: 'not-a-uuid',
        refused: false,
        reason: 'x'.repeat(80),
      })
    ).toEqual({})
    expect(JSON.stringify(sanitizeChatLeadEventData({ listingId }))).not.toContain(
      'OwnerName'
    )
  })

  it('hooks chat and map sessions through the scoring RPC', () => {
    const chat = readFileSync(join(here, '../routes/api/-chat.ts'), 'utf8')
    const tracking = readFileSync(join(here, 'leadTracking.ts'), 'utf8')
    const widget = readFileSync(
      join(here, '../components/ChatWidget.tsx'),
      'utf8'
    )
    const migration = readFileSync(
      join(here, '../../supabase/migrations/20260813_chat_lead_score_hook.sql'),
      'utf8'
    )
    expect(chat).toContain('recordChatLeadEvent')
    expect(chat).toContain('chat_open')
    expect(chat).toContain('chat_message')
    expect(chat).toContain('human_handoff_requested')
    expect(chat).not.toContain('p_message')
    expect(tracking).toContain('getRouVisitorKey')
    expect(tracking).not.toContain('aria_session_id')
    expect(widget).toContain('hydrateTransientChat')
    expect(widget).not.toMatch(/from ['"][^'"]*chat-lead-score['"]/)
    expect(widget).not.toMatch(/from ['"][^'"]*leadTracking['"]/)
    expect(widget).not.toMatch(/from ['"][^'"]*supabase['"]/)
    expect(migration).toContain('record_chat_lead_event')
    expect(migration).toContain('security definer')
    expect(migration).toContain('visitor_session_key')
    expect(migration).toContain('human_handoff_requested')
    expect(migration).toMatch(/revoke all on function public.record_chat_lead_event/)
    expect(migration).not.toContain('p_message')
  })
})
