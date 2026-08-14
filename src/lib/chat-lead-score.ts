import { isListingId } from './listing-facts'
import { supabase } from './supabase'

export type ChatLeadEventType =
  | 'chat_open'
  | 'chat_message'
  | 'human_handoff_requested'

export type ChatLeadEventData = {
  listingId?: string
  refused?: boolean
  reason?: string
}

/** Allowlisted scoring payload — never the chat transcript. */
export function sanitizeChatLeadEventData(
  data?: ChatLeadEventData | null
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const listingId =
    typeof data?.listingId === 'string' ? data.listingId.trim() : ''
  if (listingId && isListingId(listingId)) out.listingId = listingId
  if (data?.refused === true) out.refused = true
  if (
    typeof data?.reason === 'string' &&
    data.reason.trim() &&
    data.reason.length <= 40
  ) {
    out.reason = data.reason.trim()
  }
  return out
}

export async function recordChatLeadEvent(opts: {
  sessionKey: string
  eventType: ChatLeadEventType
  data?: ChatLeadEventData | null
}): Promise<number> {
  const sessionKey = opts.sessionKey.trim()
  if (sessionKey.length < 8) return 0
  try {
    const { data, error } = await supabase.rpc('record_chat_lead_event', {
      p_session_key: sessionKey,
      p_event_type: opts.eventType,
      p_event_data: sanitizeChatLeadEventData(opts.data),
    })
    if (error) {
      console.error('record_chat_lead_event error', error.message)
      return 0
    }
    return typeof data === 'number' && Number.isFinite(data) ? data : 0
  } catch {
    return 0
  }
}
