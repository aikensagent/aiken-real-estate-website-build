import { chat, chatStream } from '../routes/api/-chat'
import type { ChatStreamChunk } from '../routes/api/-chat'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

/** Location the user is asking about — used for "how far is…" style questions. */
export type ChatOrigin = {
  lng?: number | null
  lat?: number | null
  label?: string
  listingId?: string
  price?: number | null
  beds?: number | null
  baths?: number | null
}

export type { ChatStreamChunk }

export async function sendChatMessage(
  message: string,
  history: ChatMessage[] = [],
  sessionKey?: string,
  leadId?: string,
  origin?: ChatOrigin | null
) {
  const result = await chat({
    data: {
      message,
      history,
      sessionKey,
      leadId,
      origin: origin ?? undefined,
    },
  })
  return result
}

/**
 * Streams Grok tokens through the same server prep path as `sendChatMessage`.
 * Callers must handle `done` / `error` for the final reply.
 */
export async function streamChatMessage(
  message: string,
  history: ChatMessage[] = [],
  sessionKey?: string,
  leadId?: string,
  origin?: ChatOrigin | null,
  onChunk?: (chunk: ChatStreamChunk) => void
): Promise<{ reply: string; refused?: boolean; reason?: string }> {
  const stream = await chatStream({
    data: {
      message,
      history,
      sessionKey,
      leadId,
      origin: origin ?? undefined,
    },
  })

  let reply = ''
  let refused: boolean | undefined
  let reason: string | undefined

  for await (const chunk of stream) {
    onChunk?.(chunk)
    if (chunk.type === 'delta') {
      reply += chunk.text
    } else if (chunk.type === 'done') {
      reply = chunk.reply
      refused = chunk.refused
      reason = chunk.reason
    } else if (chunk.type === 'error') {
      throw new Error(chunk.message)
    }
  }

  return { reply, refused, reason }
}
