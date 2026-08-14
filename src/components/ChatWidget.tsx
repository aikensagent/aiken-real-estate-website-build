import { useState, useRef, useEffect } from 'react'
import { streamCompanionChat } from '../lib/rou/companion-chat'
import {
  cancelGholiSpeech,
  persistSpeakRepliesPreference,
  readSpeakRepliesPreference,
  speakGholiReply,
} from '../lib/rou/voice'
import { RouOrb } from './RouOrb'
import type { ChatOrigin } from '../lib/grok-client'
import {
  mentionsGrocery,
  mentionsPlayground,
  mentionsSchool,
} from '../lib/playgrounds'
import { extractNamedPlaceQuery } from '../lib/rou/named-place'
import { getRouVisitorKey } from '../lib/rou/rou-session'
import {
  hydrateTransientChat,
  listingThreadKey,
  persistTransientChat,
} from '../lib/rou/transient-chat-state'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ChatWidgetProps = {
  origin?: ChatOrigin | null
  areaLabel?: string | null
  onAmenityIntent?: (kind: 'playground' | 'school' | 'grocery') => void
  onNamedPlaceQuery?: (query: string) => void
  onShowingIntent?: () => void
  showingHint?: string
}

export const SHOWING_CHIP = 'Schedule a showing'

const NICK_PHONE = '803-292-2921'

const ORIGIN_SUGGESTION_CHIPS = [
  'Nearby playgrounds',
  'Schools nearby',
  'Grocery & daily needs',
  'Details on this home',
  SHOWING_CHIP,
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

export function ChatWidget({
  origin,
  areaLabel,
  onAmenityIntent,
  onNamedPlaceQuery,
  onShowingIntent,
  showingHint,
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>(
    () => hydrateTransientChat().messages
  )
  const [loading, setLoading] = useState(false)
  const [speakReplies, setSpeakReplies] = useState(() =>
    readSpeakRepliesPreference(true)
  )
  const [suggestionChips, setSuggestionChips] = useState<string[]>([])
  const [speaking, setSpeaking] = useState(false)
  const [caption, setCaption] = useState<string | null>(null)
  const [panelsOpen, setPanelsOpen] = useState(
    () => hydrateTransientChat().panelsOpen
  )
  const announcedOrigin = useRef<string | null>(
    hydrateTransientChat().announcedOrigin
  )
  const speakRepliesRef = useRef(speakReplies)
  speakRepliesRef.current = speakReplies

  const homeKey = listingThreadKey(origin)
  const originStreet = (origin?.label ?? '').split(',')[0].trim() || 'this home'

  useEffect(() => {
    persistTransientChat({
      version: 1,
      messages,
      announcedOrigin: announcedOrigin.current,
      panelsOpen,
    })
  }, [messages, panelsOpen])

  function toggleMute() {
    const next = !speakReplies
    setSpeakReplies(next)
    persistSpeakRepliesPreference(next)
    if (!next) {
      cancelGholiSpeech()
      setSpeaking(false)
    }
  }

  function speakText(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    setCaption(trimmed)
    if (!speakRepliesRef.current) {
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    void speakGholiReply(trimmed, {
      enabled: true,
      onEnded: () => setSpeaking(false),
    }).then((played) => {
      if (!played) setSpeaking(false)
    })
  }

  useEffect(() => {
    if (!homeKey) return
    if (announcedOrigin.current === homeKey) return
    announcedOrigin.current = homeKey

    const intro = `Got it — ${originStreet}. I can help with nearby playgrounds, schools, grocery, or details on this home. What would help?`
    const chips = [...ORIGIN_SUGGESTION_CHIPS]
    if (areaLabel?.trim()) {
      chips.unshift(`What should I know about ${areaLabel.trim()}?`)
    }
    setSuggestionChips(chips)
    setMessages([{ role: 'assistant', content: intro }])
    setPanelsOpen(true)
    speakText(intro)
  }, [homeKey, originStreet])

  async function sendMessage(raw: string) {
    if (!raw.trim() || loading) return
    cancelGholiSpeech()
    setSpeaking(false)
    setSuggestionChips([])

    const trimmed = raw.trim()
    if (onShowingIntent && trimmed === SHOWING_CHIP) {
      const hint =
        showingHint?.trim() ||
        'The showing form is on this page. I’ll scroll you there.'
      setMessages([
        ...messages,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: hint },
      ])
      onShowingIntent()
      return
    }
    if (mentionsPlayground(trimmed)) onAmenityIntent?.('playground')
    else if (mentionsSchool(trimmed)) onAmenityIntent?.('school')
    else if (mentionsGrocery(trimmed)) onAmenityIntent?.('grocery')
    else {
      const named = extractNamedPlaceQuery(trimmed)
      if (named) onNamedPlaceQuery?.(named)
    }

    const userMessage: Message = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setLoading(true)
    setCaption('…')

    try {
      const historyForApi = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      setMessages([...newMessages, { role: 'assistant', content: '' }])

      const result = await streamCompanionChat(
        trimmed,
        historyForApi,
        getRouVisitorKey(),
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
                setCaption(next[next.length - 1].content)
              }
              return next
            })
          } else if (chunk.type === 'done') {
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
            setCaption(chunk.reply)
          }
        }
      )

      speakText(result.reply)

      if (result.refused) {
        const handoff = isWithinNickCallHours()
          ? `I’d like to connect you with Nick Williams directly. You can reach him at ${NICK_PHONE}, or fill out the short form on this page and he’ll get right back to you.`
          : `I’d like to connect you with Nick Williams. He’s available 9 AM – 9 PM Eastern. Please leave your details on the form and he’ll call you first thing.`
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: handoff },
          ])
          setCaption(handoff)
        }, 600)
      }
    } catch {
      const fail = isWithinNickCallHours()
        ? `I’m having trouble responding right now. Please reach Nick Williams at ${NICK_PHONE} or use the contact form on this page — he’ll take care of you.`
        : `I’m having trouble responding right now. Nick is available 9 AM – 9 PM Eastern. Please leave your details on the form and he’ll call you first thing.`
      setCaption(fail)
      setMessages((prev) => [...prev, { role: 'assistant', content: fail }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <RouOrb
      speaking={speaking}
      caption={caption}
      muted={!speakReplies}
      askEnabled={Boolean(origin)}
      chips={suggestionChips}
      messages={messages}
      panelsOpen={panelsOpen}
      onClosePanels={() => setPanelsOpen(false)}
      onOpenPanels={() => setPanelsOpen(true)}
      onToggleMute={toggleMute}
      onChip={(label) => void sendMessage(label)}
      onAsk={(text) => void sendMessage(text)}
    />
  )
}
