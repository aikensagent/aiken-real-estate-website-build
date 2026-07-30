import { chat } from '../routes/api/-chat'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export async function sendChatMessage(
  message: string,
  privateMode = false,
  history: ChatMessage[] = [],
  sessionKey?: string,
  leadId?: string
) {
  const result = await chat({
    data: {
      message,
      privateMode,
      history,
      sessionKey,
      leadId,
    },
  })
  return result
}