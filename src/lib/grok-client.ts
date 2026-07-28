import { chat } from '../routes/api/-chat'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export async function sendChatMessage(
  message: string,
  privateMode = false,
  history: ChatMessage[] = []
) {
  const result = await chat({
    data: {
      message,
      privateMode,
      history,
    },
  })
  return result
}