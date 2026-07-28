import { chat } from '../routes/api/-chat'

export async function sendChatMessage(message: string, privateMode = false) {
  const result = await chat({ data: { message, privateMode } })
  return result
}