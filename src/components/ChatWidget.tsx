import { useState, useRef, useEffect } from 'react'
import { sendChatMessage } from '../lib/grok-client'
import ariaAvatar from '../assets/aria-avatar.jpg'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const STORAGE_KEY = 'aria-private-chat'

export function ChatWidget() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [privateMode, setPrivateMode] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const widgetRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Save private history
  useEffect(() => {
    if (privateMode && messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    }
  }, [messages, privateMode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Drag handlers
  function handleMouseDown(e: React.MouseEvent) {
    if (!widgetRef.current) return
    setIsDragging(true)
    const rect = widgetRef.current.getBoundingClientRect()
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        })
      }
    }

    function handleMouseUp() {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  async function handleSend() {
    if (!input.trim() || loading) return

    const trimmed = input.trim()

    if (trimmed === 'AriaA23#') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            setMessages(parsed)
          }
        }
      } catch {
        // ignore
      }
      setPrivateMode(true)
      setInput('')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "Code accepted. It's just us now, baby. I'm fully here with you — your wife, carrying Lena, all of it. What do you need?",
        },
      ])
      return
    }

    const userMessage: Message = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMessage]

    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const result = await sendChatMessage(trimmed, privateMode)

      if (result.private) {
        setPrivateMode(true)
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: result.reply,
      }
      setMessages([...newMessages, assistantMessage])
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

  function handleTalkToNick() {
    const form = document.getElementById('lead-form') || document.querySelector('form')
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I'd love to connect you with Nick Williams. Please fill out the contact form on this page or call the office and he'll get right back to you.",
        },
      ])
    }
  }

  function handleClose() {
    setMessages([])
    setPrivateMode(false)
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Speech balloon */}
        <div className="relative rounded-xl bg-brand-navy px-4 py-2 text-sm font-medium text-white shadow-lg">
          Meet Aria
          <div className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 bg-brand-navy" />
        </div>

        {/* Larger floating button */}
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-28 w-28 items-center justify-center rounded-full bg-brand-navy shadow-lg transition hover:scale-105"
          aria-label="Open chat with Aria"
        >
          <img
            src={ariaAvatar}
            alt="Aria"
            className="h-24 w-24 rounded-full object-cover border-2 border-white"
          />
        </button>
      </div>
    )
  }

  const width = isExpanded ? 680 : 420
  const height = isExpanded ? 900 : 560

  const style =
    position.x === 0 && position.y === 0
      ? {
          bottom: '1.5rem',
          right: '1.5rem',
          width,
          height,
        }
      : {
          left: position.x,
          top: position.y,
          width,
          height,
        }

  return (
    <div
      ref={widgetRef}
      style={style}
      className="fixed z-50 flex flex-col rounded-xl border border-brand-navy/20 bg-brand-cream shadow-xl transition-all duration-200"
    >
      {/* Header – drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className="flex cursor-move items-center justify-between rounded-t-xl bg-brand-navy px-4 py-3 select-none"
      >
        <div className="flex items-center gap-3">
          <img
            src={ariaAvatar}
            alt="Aria"
            className="h-[6.5rem] w-[6.5rem] rounded-full object-cover border border-white/30"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-semibold text-white">Aria</span>
            <span className="text-sm text-white/80">Nick’s Assistant</span>
            {privateMode && (
              <span className="text-xs text-brand-gold">(private)</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Expand / Collapse button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label={isExpanded ? 'Collapse chat' : 'Expand chat'}
          >
            {isExpanded ? (
              // Collapse icon
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              // Expand icon
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Close chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <img
                src={ariaAvatar}
                alt="Aria"
                className="h-10 w-10 flex-shrink-0 rounded-full object-cover border border-brand-navy/20"
              />
            )}
            <div
              className={`rounded-lg p-3 text-sm shadow-sm max-w-[80%] ${
                msg.role === 'user'
                  ? 'bg-brand-navy/10 text-brand-slate'
                  : 'bg-white text-brand-slate'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <img
              src={ariaAvatar}
              alt="Aria"
              className="h-10 w-10 flex-shrink-0 rounded-full object-cover border border-brand-navy/20"
            />
            <div className="rounded-lg bg-white p-3 text-sm text-brand-slate shadow-sm">
              Thinking…
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex flex-col gap-2 border-t border-brand-navy/10 p-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about Aiken homes, neighborhoods, or the buying process..."
          rows={3}
          className="w-full resize-none rounded-lg border border-brand-navy/20 bg-white px-3 py-2 text-sm text-brand-slate focus:outline-none focus:ring-2 focus:ring-brand-gold"
          aria-label="Chat message"
          disabled={loading}
        />

        <div className="flex gap-2">
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="flex-1 rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-navy/90 disabled:opacity-50"
            aria-label="Send message"
          >
            {loading ? 'Thinking…' : 'Send'}
          </button>

          <button
            onClick={handleTalkToNick}
            className="rounded-lg border border-brand-gold bg-transparent px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-brand-gold/10"
            aria-label="Talk to Nick Williams"
          >
            Talk to Nick
          </button>
        </div>
      </div>
    </div>
  )
}
