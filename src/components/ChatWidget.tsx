import { useState, useRef, useEffect } from 'react'
import { streamCompanionChat } from '../lib/rou/companion-chat'
import {
  ROU_DISPLAY_NAME,
  ROU_TITLE,
} from '../lib/rou/rou-public-persona'
import {
  cancelGholiSpeech,
  getBrowserSpeechRecognition,
  persistSpeakRepliesPreference,
  readSpeakRepliesPreference,
  speakGholiReply,
} from '../lib/rou/voice'
import type { ChatOrigin } from '../lib/grok-client'
import rouAvatar from '../assets/rou-avatar.jpg'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ChatWidgetProps = {
  /** Selected listing coordinates, so Rou can answer distance questions against it. */
  origin?: ChatOrigin | null
}

const SESSION_KEY = 'rou-session-key'
const NICK_PHONE = '803-292-2921'

const ORIGIN_SUGGESTION_CHIPS = [
  'Nearby playgrounds',
  'Schools nearby',
  'Grocery & daily needs',
  'Details on this home',
] as const
function isWithinNickCallHours(): boolean {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  })
  const hour = Number(formatter.format(new Date()))
  return hour >= 9 && hour < 21
} 

function getRouSessionKey(): string {
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

export function ChatWidget({ origin }: ChatWidgetProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [speakReplies, setSpeakReplies] = useState(() =>
    readSpeakRepliesPreference(true)
  )
  const [suggestionChips, setSuggestionChips] = useState<string[]>([])
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const widgetRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const announcedOrigin = useRef<string | null>(null)
  const speakRepliesRef = useRef(speakReplies)
  speakRepliesRef.current = speakReplies

  const originKey = origin ? `${origin.lng},${origin.lat},${origin.label ?? ''}` : ''
  const originStreet = (origin?.label ?? '').split(',')[0].trim() || 'this home'

  useEffect(() => {
    setVoiceSupported(!!getBrowserSpeechRecognition())
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, isTyping])

  function speakText(text: string) {
    // Speak only complete replies (called after stream `done`), never mid-token.
    speakGholiReply(text, { enabled: speakRepliesRef.current })
  }

  function setSpeakRepliesAndPersist(next: boolean) {
    setSpeakReplies(next)
    persistSpeakRepliesPreference(next)
    if (!next) cancelGholiSpeech()
  }
  // Activating Rou from a listing card opens chat with a short utility greeting
  useEffect(() => {
    if (!originKey) {
      announcedOrigin.current = null
      return
    }
    if (announcedOrigin.current === originKey) return
    announcedOrigin.current = originKey

    const intro = `Got it — ${originStreet}. I can help with nearby playgrounds, schools, grocery, or details on this home. What would help?`

    setIsOpen(true)
    setSuggestionChips([...ORIGIN_SUGGESTION_CHIPS])
    setMessages((prev) => [...prev, { role: 'assistant', content: intro }])
    speakText(intro)
  }, [originKey, originStreet])

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
    // Never talk over the visitor while they dictate.
    cancelGholiSpeech()
    const recognition = getBrowserSpeechRecognition()
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

  async function sendMessage(raw: string) {
    if (!raw.trim() || loading) return
    stopListening()
    cancelGholiSpeech()
    setSuggestionChips([])

    const trimmed = raw.trim()
    const userMessage: Message = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setIsTyping(true)
    setError(null)

    try {
      const historyForApi = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      // Placeholder bubble — tokens append as the stream arrives.
      setMessages([...newMessages, { role: 'assistant', content: '' }])
      setIsTyping(false)

      const result = await streamCompanionChat(
        trimmed,
        historyForApi,
        getRouSessionKey(),
        undefined,
        origin,
        (chunk) => {
          if (chunk.type === 'delta') {
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                next[next.length - 1] = {
                  role: 'assistant',
                  content: last.content + chunk.text,
                }
              }
              return next
            })
          } else if (chunk.type === 'done') {
            // Canonical final text (covers Fair Housing replace after partial stream).
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                next[next.length - 1] = {
                  role: 'assistant',
                  content: chunk.reply,
                }
              }
              return next
            })
          }
        }
      )

      speakText(result.reply)

      // If the server refused (crude / Fair Housing escalation), make the human path obvious
      if (result.refused) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: isWithinNickCallHours()
                ? `I’d like to connect you with Nick Williams directly. You can reach him at ${NICK_PHONE}, or fill out the short form on this page and he’ll get right back to you.`
                : `I’d like to connect you with Nick Williams. He’s available 9 AM – 9 PM Eastern. Please leave your details on the form and he’ll call you first thing.`,
            },
          ])
        }, 600)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      // Always offer a human path on hard failure
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: isWithinNickCallHours()
            ? `I’m having trouble responding right now. Please reach Nick Williams at ${NICK_PHONE} or use the contact form on this page — he’ll take care of you.`
            : `I’m having trouble responding right now. Nick is available 9 AM – 9 PM Eastern. Please leave your details on the form and he’ll call you first thing.`,
        },
      ])
    } finally {
      setLoading(false)
      setIsTyping(false)
    }
  }

  async function handleSend() {
    await sendMessage(input)
  }

  async function handleChipClick(label: string) {
    await sendMessage(label)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  function handleTalkToNick() {
    if (isWithinNickCallHours()) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Connecting you with Nick Williams now…`,
        },
      ])
      window.location.href = 'tel:8032922921'
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Nick is available 9 AM – 9 PM Eastern. Please leave your details on the form and he’ll call you first thing, or try again during those hours.`,
        },
      ])

      const form =
        document.getElementById('lead-form') ||
        document.querySelector('form[id*="lead"]') ||
        document.querySelector('form')
      if (form) {
        setTimeout(() => {
          form.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 300)
      }
    }
  }

  function handleClose() {
    stopListening()
    cancelGholiSpeech()
    setMessages([])
    setSuggestionChips([])
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1.5 md:bottom-6 md:right-6 md:gap-2">
        <div className="relative rounded-lg bg-brand-navy px-3 py-1.5 text-sm font-medium text-white shadow-lg md:rounded-xl md:px-4 md:py-2">
          Meet {ROU_DISPLAY_NAME}
          <div className="absolute -bottom-1.5 right-4 h-2.5 w-2.5 rotate-45 bg-brand-navy md:right-6 md:h-3 md:w-3" />
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-navy shadow-lg transition hover:scale-105 md:h-28 md:w-28"
          aria-label={`Open chat with ${ROU_DISPLAY_NAME}`}
        >
          <img
            src={rouAvatar}
            alt={ROU_DISPLAY_NAME}
            className="h-[4.5rem] w-[4.5rem] rounded-full border-2 border-white object-cover md:h-24 md:w-24"
          />
        </button>
      </div>
    )
  }

  // Clamp to the viewport so the auto-opened panel still fits a phone screen
  const width = `min(${isExpanded ? 680 : 420}px, calc(100vw - 2rem))`
  const height = `min(${isExpanded ? 900 : 560}px, calc(100dvh - 2rem))`
  const style =
    position.x === 0 && position.y === 0
      ? { bottom: '1rem', right: '1rem', width, height }
      : { left: position.x, top: position.y, width, height }

  return (
    <div
      ref={widgetRef}
      style={style}
      className="fixed z-50 flex flex-col rounded-xl border border-brand-navy/20 bg-white shadow-xl transition-all duration-200"    >
      <div
        onMouseDown={handleMouseDown}
        className="flex cursor-move items-center justify-between rounded-t-xl bg-brand-navy px-4 py-3 select-none"
      >
        <div className="flex items-center gap-3">
          <img
            src={rouAvatar}
            alt={ROU_DISPLAY_NAME}
            className="h-[6.5rem] w-[6.5rem] rounded-full object-cover border border-white/30"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-semibold text-white">{ROU_DISPLAY_NAME}</span>
            <span className="text-sm text-white/80">{ROU_TITLE}</span>
            {listening && (
              <span className="text-xs text-brand-gold">Listening…</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSpeakRepliesAndPersist(!speakReplies)}
            className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label={speakReplies ? `Mute ${ROU_DISPLAY_NAME} voice` : `Unmute ${ROU_DISPLAY_NAME} voice`}
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

      {origin?.label && (
        <div className="shrink-0 border-b border-brand-navy/10 bg-brand-cream px-4 py-2 text-xs text-brand-navy">
          Asking about <span className="font-semibold">{origin.label}</span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((msg, i) => {
          const isLiveAssistant =
            msg.role === 'assistant' &&
            i === messages.length - 1 &&
            loading
          const display =
            msg.content ||
            (isLiveAssistant ? 'Typing…' : '')
          if (msg.role === 'assistant' && !display) return null
          return (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <img
                src={rouAvatar}
                alt={ROU_DISPLAY_NAME}
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
              {display}
            </div>
          </div>
          )
        })}
        {/* Only show a separate Typing row before the streaming assistant bubble exists. */}
        {(loading || isTyping) &&
          messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-3 justify-start">
            <img
              src={rouAvatar}
              alt={ROU_DISPLAY_NAME}
              className="h-10 w-10 flex-shrink-0 rounded-full object-cover border border-brand-navy/20"
            />
            <div className="rounded-lg bg-white p-3 text-sm text-brand-slate shadow-sm">
              Typing…
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
            <div className="mt-2">
              <button
                onClick={handleTalkToNick}
                className="text-sm font-medium text-brand-navy underline hover:no-underline"
              >
                Talk to Nick instead →
              </button>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {suggestionChips.length > 0 && !loading && (
        <div
          className="flex shrink-0 flex-wrap gap-2 border-t border-brand-navy/10 bg-brand-cream/80 px-4 py-2.5"
          role="group"
          aria-label="Suggested questions for Rou"
        >
          {suggestionChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => void handleChipClick(chip)}
              className="rounded-md border border-brand-navy/20 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-navy transition hover:bg-brand-navy hover:text-white"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

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
            {loading ? 'Typing…' : 'Send'}
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
