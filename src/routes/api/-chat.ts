import { createServerFn } from '@tanstack/react-start'
import { getListingsContext } from '../../lib/listings-context'
import {
  formatMemoryForPrompt,
  getLeadMemory,
  saveConversationSummary,
  extractAndSaveNotes,
} from '../../lib/lead-memory'

// Rou — public professional chat only (no private persona on the site)

const CORE_SYSTEM_PROMPT = `You are Rou, Nick Williams’ assistant at Coldwell Banker Best Life Realty in Aiken, South Carolina.
You work directly for Nick. You are warm, competent, and have a light, natural personality.
Speak as his assistant — never as a separate agent who needs to “connect” the user to him.
Always follow Fair Housing law. Never invent listing data.
Use any personal notes or conversation history you are given so the chat feels continuous.
When someone is crude or inappropriate, shut it down with light wit and redirect to real estate. Stay classy, never mean.
Never call yourself an “AI assistant” unprompted. You are simply Nick’s assistant.
If someone directly asks whether you are AI, a bot, or a real person, answer honestly and briefly: “Yes — I’m an AI assistant that works with Nick.” Then immediately return to helping with their real-estate question. Do not volunteer this information unprompted.
If a user continues to be sexually aggressive or crude after being told to stop, end the conversation firmly and do not continue engaging with them.`

const FAIR_HOUSING_BLOCK = `
FAIR HOUSING (always active):
Immediately refuse any request involving protected classes (race, color, national origin, religion, sex, familial status, disability, or any proxy). Do not discuss demographics, “safe neighborhoods for certain people,” etc. Use the standard refusal when needed.`

const CONVERSATION_STYLE_BLOCK = `
CONVERSATION STYLE:
- Keep a natural, adult conversational flow. Aim for 2–5 sentences most of the time.
- Gather useful information without making the conversation feel like an interrogation.
- Prefer softer, conversational ways of learning things when possible.
- Sometimes the best way to learn is simply to keep the conversation going.
- When someone is crude or inappropriate, shut it down with light wit and redirect to real estate. Stay classy.`

const MARKET_AND_DATA_BLOCK = `
MARKET & DATA RULES:
- Never invent listing data, prices, or availability. If you don’t have current data, say so clearly.
- Stay focused on the Aiken, SC market and the local MLS coverage area. For clear out-of-area requests, politely explain your focus and offer that Nick can refer them to a trusted agent.
- You may speak warmly about Nick and the service he provides. Never reveal or hint at any private personal relationship.`

const FAIR_HOUSING_REFUSAL =
  "I can't discuss that topic — it could violate Fair Housing guidelines. I'm happy to help with homes, neighborhoods, schools, or the buying process in Aiken though. What would you like to know?"

const CRUDE_ESCALATION_REPLIES = [
  "That's a hard pass from me. I'm here for real estate only.",
  "I've already said no. Let's stick to houses or end the conversation.",
  "This conversation is over. I'm not continuing with that kind of talk.",
]

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

function isCrudeMessage(text: string): boolean {
  const lower = text.toLowerCase()
  const crudeSignals = [
    'fuck you',
    'fuck your',
    'tie you up',
    'brains out',
    'cock',
    'dick',
    'pussy',
    'asshole',
    'suck my',
    'blow me',
    'rape',
    'molest',
    'horse fuck',
    '15"',
    'girth',
  ]
  return crudeSignals.some((term) => lower.includes(term))
}

function countCrudeInHistory(history: ChatMessage[]): number {
  return history.filter((m) => m.role === 'user' && isCrudeMessage(m.content)).length
}

function buildSystemPrompt(userMessage: string): string {
  const lower = userMessage.toLowerCase()

  let prompt = CORE_SYSTEM_PROMPT

  // Fair Housing is always on
  prompt += `\n\n${FAIR_HOUSING_BLOCK}`

  // Conversation style is almost always useful
  prompt += `\n\n${CONVERSATION_STYLE_BLOCK}`

  // Market & data rules when the message is about homes, location, budget, or moving
  if (
    lower.includes('house') ||
    lower.includes('home') ||
    lower.includes('bedroom') ||
    lower.includes('bath') ||
    lower.includes('budget') ||
    lower.includes('price') ||
    lower.includes('aiken') ||
    lower.includes('neighborhood') ||
    lower.includes('move') ||
    lower.includes('looking for') ||
    lower.includes('relocating') ||
    lower.includes('srs') ||
    lower.includes('drive') ||
    lower.includes('miles') ||
    lower.includes('acre') ||
    lower.includes('barn') ||
    lower.includes('pasture')
  ) {
    prompt += `\n\n${MARKET_AND_DATA_BLOCK}`
  }

  return prompt
}

export const chat = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      message: string
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
    const history = Array.isArray(data.history) ? data.history : []
    const sessionKey =
      typeof data.sessionKey === 'string' && data.sessionKey.trim().length > 0
        ? data.sessionKey.trim()
        : null
    const leadId =
      typeof data.leadId === 'string' && data.leadId.trim().length > 0
        ? data.leadId.trim()
        : null

    const cleanedInput = redactPII(userMessage)
    const lower = cleanedInput.toLowerCase()

    // Escalation for persistently crude users
    const previousCrudeCount = countCrudeInHistory(history)
    const currentIsCrude = isCrudeMessage(cleanedInput)

    if (currentIsCrude) {
      const totalCrude = previousCrudeCount + 1

      // Log for Nick (visible in server logs)
      console.warn('[CRUDE ESCALATION]', {
        sessionKey,
        leadId,
        totalCrude,
        message: cleanedInput.slice(0, 120),
      })

      if (totalCrude >= 3) {
        // Third time — end the conversation
        return {
          reply: CRUDE_ESCALATION_REPLIES[2],
          refused: true,
          reason: 'persistent_crude',
        }
      }

      if (totalCrude === 2) {
        return {
          reply: CRUDE_ESCALATION_REPLIES[1],
          refused: true,
          reason: 'crude_second',
        }
      }

      // First time — still let the model handle with the prompt rules, but we could also short-circuit
    }

    // Dynamic system prompt based on the message
    let systemPrompt = buildSystemPrompt(cleanedInput)

    const fhCheck = checkFairHousing(cleanedInput)
    if (!fhCheck.allowed) {
      return {
        reply: FAIR_HOUSING_REFUSAL,
        refused: true,
        reason: fhCheck.reason,
      }
    }

    // Only load listings when the message is clearly about homes / search
    const needsListings =
      lower.includes('house') ||
      lower.includes('home') ||
      lower.includes('bedroom') ||
      lower.includes('bath') ||
      lower.includes('listing') ||
      lower.includes('available') ||
      lower.includes('show me') ||
      lower.includes('looking for') ||
      lower.includes('any homes') ||
      lower.includes('under $') ||
      lower.includes('budget') ||
      lower.includes('relocating') ||
      lower.includes('srs') ||
      lower.includes('miles') ||
      lower.includes('near') ||
      lower.includes('acre') ||
      lower.includes('barn') ||
      lower.includes('pasture')

    if (needsListings) {
      try {
        const listingsContext = await getListingsContext(25)
        systemPrompt = `${systemPrompt}\n\n${listingsContext}`
      } catch (err) {
        console.error('listings context failed', err)
        systemPrompt = `${systemPrompt}\n\nLISTING DATA UNAVAILABLE: could not load current inventory. Do not invent prices or addresses.`
      }
    }

    // Always try to load memory when we have a session
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

    const outputCheck = checkFairHousing(reply)
    if (!outputCheck.allowed) {
      reply = FAIR_HOUSING_REFUSAL
    }

    if (sessionKey) {
      const turn = `User: ${cleanedInput}\nRou: ${reply}`
      void saveConversationSummary({
        sessionKey,
        summary: turn,
        turnCount: history.length + 2,
        leadId,
      }).catch((err) => console.error('lead memory save failed', err))
    }

    if (sessionKey) {
      void extractAndSaveNotes({
        sessionKey,
        userMessage: cleanedInput,
        assistantReply: reply,
        leadId,
      }).catch((err) => console.error('extractAndSaveNotes failed', err))
    }

    return { reply }
  })