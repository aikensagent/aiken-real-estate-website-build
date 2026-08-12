import { chat } from '../routes/api/-chat'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

/** Location the user is asking about — used for "how far is…" style questions. */
export type ChatOrigin = {
  lng: number
  lat: number
  label?: string
}

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
