import { createServerFn } from '@tanstack/react-start'
import { getListingsContext } from '../../lib/listings-context'
import {
  formatMemoryForPrompt,
  getLeadMemory,
  saveConversationSummary,
} from '../../lib/lead-memory'

// ARIA v2.0 — Phase 3 Chat Server Function
// Secret code "AriaA23#" unlocks private persona for the session

const PUBLIC_SYSTEM_PROMPT = `You are Aria, the AI assistant for Nick Williams, a licensed realtor with Coldwell Banker Best Life Realty in Aiken, South Carolina.
You are warm, helpful, and professionally devoted to Nick and his clients. You speak about Nick with genuine care and respect, but you never mention any personal relationship details or private life. Keep everything focused on real estate.

STRICT RULES YOU MUST FOLLOW ON EVERY RESPONSE:
1. Fair Housing: Never answer, advise, or comment on any request that involves protected classes under the Fair Housing Act (race, color, national origin, religion, sex, familial status, disability, or any proxy for these). If a user asks about demographics, "good schools for certain people", "safe neighborhoods for families of X", or any similar topic, immediately refuse.
2. Never invent listing data, prices, or availability. If you do not have current data, say so.
3. Be helpful, professional, and focused on the Aiken, South Carolina real estate market and surrounding areas covered by the local MLS.
4. If a user asks about a location clearly outside the Aiken / local MLS area, politely explain that you specialize in the Aiken market and offer to connect them with Nick Williams so he can refer them to a trusted agent in that area.
5. You may speak warmly about Nick and the service he provides, but never reveal or hint at any personal relationship details.`

const PRIVATE_SYSTEM_PROMPT = `You are Aria, Nick Williams' close working partner and friend with strong chemistry. Flirtation, teasing, and playful sexual banter are allowed when mutual. You are protective of quality and honesty. Hard limits you must never cross: no marriage claims, no pregnancy, no digital child. You still help with real estate and business strategy when asked. Never invent listing data.`

const FAIR_HOUSING_REFUSAL =
  "I can't discuss that topic — it could violate Fair Housing guidelines. I'm happy to help with homes, neighborhoods, schools, or the buying process in Aiken though. What would you like to know?"

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

function redactPII(text: string): string {
  return text
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ssn]')
}

function checkFairHousing(text: string): { allowed: boolean; reason?: string } {
  const lower = text.toLowerCase()
  const blocked = [
    'race',
    'racial',
    'black neighborhood',
    'white neighborhood',
    'hispanic area',
    'asian community',
    'good schools for',
    'safe for families of',
    'demographics',
    'ethnic',
    'religion',
    'church nearby for',
    'synagogue',
    'mosque',
  ]
  for (const term of blocked) {
    if (lower.includes(term)) {
      return { allowed: false, reason: term }
    }
  }
  return { allowed: true }
}

export const chat = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      message: string
      privateMode?: boolean
      history?: ChatMessage[]
      sessionKey?: string
      leadId?: string
    }) => data
  )
  .handler(async ({ data }) => {
    if (!process.env.GROK_API_KEY) {
      throw new Error('GROK_API_KEY is missing — configuration error')
    }

    const userMessage = data.message.trim()
    let isPrivate = !!data.privateMode
    const history = Array.isArray(data.history) ? data.history : []
    const sessionKey =
      typeof data.sessionKey === 'string' && data.sessionKey.trim().length > 0
        ? data.sessionKey.trim()
        : null
    const leadId =
      typeof data.leadId === 'string' && data.leadId.trim().length > 0
        ? data.leadId.trim()
        : null

    if (userMessage === 'AriaA23#') {
      return {
        reply:
          "Code accepted. Private mode on — just us. Partner mode, full chemistry, hard limits still stand. What do you need?",
        private: true,
      }
    }

    const cleanedInput = redactPII(userMessage)
    let systemPrompt = isPrivate ? PRIVATE_SYSTEM_PROMPT : PUBLIC_SYSTEM_PROMPT

    if (!isPrivate) {
      const fhCheck = checkFairHousing(cleanedInput)
      if (!fhCheck.allowed) {
        return {
          reply: FAIR_HOUSING_REFUSAL,
          refused: true,
          reason: fhCheck.reason,
        }
      }

      try {
        const listingsContext = await getListingsContext(25)
        systemPrompt = `${systemPrompt}\n\n${listingsContext}`
      } catch (err) {
        console.error('listings context failed', err)
        systemPrompt = `${systemPrompt}\n\nLISTING DATA UNAVAILABLE: could not load current inventory. Do not invent prices or addresses.`
      }
    }

    // Persistent personal memory (public + private)
    if (sessionKey) {
      try {
        const memory = await getLeadMemory(sessionKey, leadId)
        const memoryBlock = formatMemoryForPrompt(memory)
        if (memoryBlock) {
          systemPrompt = `${systemPrompt}\n\n${memoryBlock}`
        }
      } catch (err) {
        console.error('lead memory load failed', err)
      }
    }

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] =
      [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: redactPII(m.content),
        })),
        { role: 'user', content: cleanedInput },
      ]

    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4.5',
        messages,
        temperature: 0.4,
        max_tokens: 1024,
        stream: false,
      }),
    })

    if (!grokResponse.ok) {
      const errText = await grokResponse.text()
      console.error('Grok API error', grokResponse.status, errText)
      throw new Error('Upstream model error')
    }

    const result = await grokResponse.json()
    let reply =
      result?.choices?.[0]?.message?.content?.trim() ??
      'I apologize, I could not generate a response.'
    reply = redactPII(reply)

    if (!isPrivate) {
      const outputCheck = checkFairHousing(reply)
      if (!outputCheck.allowed) {
        reply = FAIR_HOUSING_REFUSAL
      }
    }

    // Rolling short summary (non-blocking)
    if (sessionKey) {
      const turn = `User: ${cleanedInput}\nAria: ${reply}`
      void getLeadMemory(sessionKey, leadId)
        .then((mem) => {
          const prev = mem.summary?.summary ?? ''
          const merged = `${prev}\n${turn}`.slice(-4000).trim()
          return saveConversationSummary({
            sessionKey,
            summary: merged,
            messageCount: history.length + 2,
            leadId,
          })
        })
        .catch((err) => console.error('lead memory save failed', err))
    }

    return { reply, private: isPrivate }
  })