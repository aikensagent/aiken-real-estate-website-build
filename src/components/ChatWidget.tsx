import { useState, useRef, useEffect } from 'react'
import { sendChatMessage } from '../lib/grok-client'
import ariaAvatar from '../assets/aria-avatar.jpg'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const SESSION_KEY = 'aria-session-key'

function getAriaSessionKey(): string {
  if (typeof window === 'undefined') return 'server'
  let key = localStorage.getItem(SESSION_KEY)
  if (!key) {
    key =
      crypto.randomUUID?.() ??
      `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem(SESSION_KEY, key)
  }
  return key
}

function getSpeechRecognition(): SpeechRecognition | null {
  if (typeof window === 'undefined') return null
  const SR =
    (window as unknown as { SpeechRecognition?: typeof SpeechRecognition })
      .SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition })
      .webkitSpeechRecognition
  if (!SR) return null
  return new SR()
}

export function ChatWidget() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [speakReplies, setSpeakReplies] = useState(true)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const widgetRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    setVoiceSupported(!!getSpeechRecognition())
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function speakText(text: string) {
    if (!speakReplies || typeof window === 'undefined' || !window.speechSynthesis)
      return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1
    u.pitch = 1
    u.lang = 'en-US'
    window.speechSynthesis.speak(u)
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop()
    } catch {
      // ignore
    }
    recognitionRef.current = null
    setListening(false)
  }

  function startListening() {
    if (loading || listening) return
    const recognition = getSpeechRecognition()
    if (!recognition) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge.')
      return
    }
    setError(null)
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onstart = () => setListening(true)
    recognition.onerror = () => {
      setListening(false)
      recognitionRef.current = null
    }
    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(transcript.trim())
    }
    recognitionRef.current = recognition
    recognition.start()
  }

  function toggleMic() {
    if (listening) stopListening()
    else startListening()
  }

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
    stopListening()
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()

    const trimmed = input.trim()
    const userMessage: Message = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const historyForApi = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      const result = await sendChatMessage(
        trimmed,
        historyForApi,
        getAriaSessionKey()
      )
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.reply,
      }
      setMessages([...newMessages, assistantMessage])
      speakText(result.reply)
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
    const form =
      document.getElementById('lead-form') || document.querySelector('form')
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
    stopListening()
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setMessages([])
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <div className="relative rounded-xl bg-brand-navy px-4 py-2 text-sm font-medium text-white shadow-lg">
          Meet Aria
          <div className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 bg-brand-navy" />
        </div>
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
      ? { bottom: '1.5rem', right: '1.5rem', width, height }
      : { left: position.x, top: position.y, width, height }

  return (
    <div
      ref={widgetRef}
      style={style}
      className="fixed z-50 flex flex-col rounded-xl border border-brand-navy/20 bg-brand-cream shadow-xl transition-all duration-200"
    >
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
            {listening && (
              <span className="text-xs text-brand-gold">Listening…</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSpeakReplies((v) => !v)}
            className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label={speakReplies ? 'Mute Aria voice' : 'Unmute Aria voice'}
            title={speakReplies ? 'Mute spoken replies' : 'Speak replies'}
          >
            {speakReplies ? '🔊' : '🔇'}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label={isExpanded ? 'Collapse chat' : 'Expand chat'}
          >
            {isExpanded ? '−' : '⛶'}
          </button>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Close chat"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-col gap-2 border-t border-brand-navy/10 p-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            listening
              ? 'Listening… speak now'
              : 'Ask about Aiken homes, neighborhoods, or the buying process...'
          }
          rows={3}
          className="w-full resize-none rounded-lg border border-brand-navy/20 bg-white px-3 py-2 text-sm text-brand-slate focus:outline-none focus:ring-2 focus:ring-brand-gold"
          aria-label="Chat message"
          disabled={loading}
        />
        <div className="flex gap-2">
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleMic}
              disabled={loading}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
                listening
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'border border-brand-navy/20 bg-white text-brand-navy hover:bg-brand-navy/5'
              }`}
              aria-label={listening ? 'Stop listening' : 'Start voice input'}
            >
              {listening ? 'Stop' : 'Mic'}
            </button>
          )}
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