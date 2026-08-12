import { sendChatMessage } from '../grok-client'
import type { ChatOrigin } from '../grok-client'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type CompanionChatResult = {
  reply: string
  refused?: boolean
  reason?: string
}

const COMPANION_FALLBACK_REPLY =
  'I lost the connection for a moment. The map is still available if you want to keep looking — try sending that again.'

/**
 * ChatWidget's only outbound data path.
 *
 * The Grok turn runs on the server (`src/routes/api/-chat.ts`), which:
 * - redacts PII on input, history, and output
 * - enforces Fair Housing
 * - reads/writes memory exclusively through Node B SECURITY DEFINER RPCs
 * - speaks as Gholi (see gholi-persona.ts)
 *
 * This module must never import Node A, supabase, or listing RPCs.
 */
export async function sendCompanionChat(
  message: string,
  history: ChatMessage[] = [],
  sessionKey?: string,
  leadId?: string,
  origin?: ChatOrigin | null
): Promise<CompanionChatResult> {
  try {
    return await sendChatMessage(message, history, sessionKey, leadId, origin)
  } catch {
    return { reply: COMPANION_FALLBACK_REPLY, refused: false }
  }
}
