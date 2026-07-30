import { chat } from '../routes/api/-chat'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[] = [],
  sessionKey?: string,
  leadId?: string
) {
  const result = await chat({
    data: {
      message,
      history,
      sessionKey,
      leadId,
    },
  })
  return result
}