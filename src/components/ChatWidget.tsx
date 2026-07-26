import { useState } from 'react'
import { sendChatMessage } from '../lib/grok-client'

export function ChatWidget() {
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    if (!message.trim() || loading) return

    setLoading(true)
    setError(null)
    setReply(null)

    try {
      const result = await sendChatMessage(message.trim())
      setReply(result.reply)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-xl border border-brand-navy/20 bg-brand-cream shadow-xl">
      <div className="rounded-t-xl bg-brand-navy px-4 py-3 text-sm font-medium text-white">
        Lottie — Nick's AI Assistant
      </div>

      <div className="flex flex-col gap-3 p-4">
        {reply && (
          <div className="rounded-lg bg-white p-3 text-sm text-brand-slate shadow-sm">
            {reply}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about Aiken homes, neighborhoods, or the buying process..."
          rows={3}
          className="w-full resize-none rounded-lg border border-brand-navy/20 bg-white px-3 py-2 text-sm text-brand-slate focus:outline-none focus:ring-2 focus:ring-brand-gold"
          aria-label="Chat message"
          disabled={loading}
        />

        <button
          onClick={handleSend}
          disabled={loading || !message.trim()}
          className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-navy/90 disabled:opacity-50"
          aria-label="Send message"
        >
          {loading ? 'Thinking…' : 'Send'}
        </button>
      </div>
    </div>
  )
}