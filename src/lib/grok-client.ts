import { chat } from '../routes/api/chat'

export async function sendChatMessage(message: string) {
  const result = await chat({ data: { message } })
  return result
}
