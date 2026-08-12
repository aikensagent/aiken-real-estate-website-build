import { createServerFn } from '@tanstack/react-start'
import { formatListingsContext, getListingRows } from '../../lib/listings-context'
import type { ListingSummary } from '../../lib/listings-context'
import {
  getGroceryContext,
  getPlaygroundContext,
  getSchoolContext,
  mentionsGrocery,
  mentionsPlayground,
  mentionsSchool,
  resolveOriginFromMessage,
  findNearestGroceryStores,
  findNearestPlaygrounds,
  findNearestSchools,
} from '../../lib/playgrounds'
import {
  extractNamedPlaceQuery,
  formatNamedPlaceBlock,
  resolveNamedPlace,
} from '../../lib/rou/named-place'
import {
  buildAmenityRouteOverlay,
  formatRoutedTimesBlock,
} from '../../lib/rou/map-directions'
import {
  formatMemoryForPrompt,
  extractAndSaveNotes,
  extractAndSaveConversationSummary,
} from '../../lib/lead-memory'
import { rouPersonaRouter } from '../../lib/rou/live'
import {
  ROU_CONVERSATION_STYLE_BLOCK,
  ROU_SYSTEM_PROMPT,
} from '../../lib/rou/rou-public-persona'
// Public ChatWidget speaks as Rou (Node A interface). Gholi stays for dashboard/Node B.

const CORE_SYSTEM_PROMPT = ROU_SYSTEM_PROMPT

const FAIR_HOUSING_BLOCK = `
FAIR HOUSING (always active):
Immediately refuse any request involving protected classes (race, color, national origin, religion, sex, familial status, disability, or any proxy). Do not discuss demographics, “safe neighborhoods for certain people,” etc. Use the standard refusal when needed.`

const CONVERSATION_STYLE_BLOCK = `
${ROU_CONVERSATION_STYLE_BLOCK}`

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

export type ChatRequestData = {
  message: string
  history?: ChatMessage[]
  sessionKey?: string
  leadId?: string
  origin?: { lng?: number | null; lat?: number | null; label?: string }
}

export type ChatStreamChunk =
  | { type: 'delta'; text: string }
  | {
      type: 'done'
      reply: string
      refused?: boolean
      reason?: string
    }
  | { type: 'error'; message: string }

type GrokMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type PreparedTurn =
  | {
      kind: 'early'
      reply: string
      refused: true
      reason?: string
    }
  | {
      kind: 'model'
      cleanedInput: string
      history: ChatMessage[]
      sessionKey: string | null
      leadId: string | null
      messages: GrokMessage[]
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
  return history.filter((m) => m.role === 'user' && isCrudeMessage(m.content))
    .length
}

function buildSystemPrompt(userMessage: string): string {
  const lower = userMessage.toLowerCase()

  let prompt = CORE_SYSTEM_PROMPT

  prompt += `\n\n${FAIR_HOUSING_BLOCK}`
  prompt += `\n\n${CONVERSATION_STYLE_BLOCK}`

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

function parseOrigin(data: ChatRequestData) {
  const originLng =
    typeof data.origin?.lng === 'number' && Number.isFinite(data.origin.lng)
      ? data.origin.lng
      : null
  const originLat =
    typeof data.origin?.lat === 'number' && Number.isFinite(data.origin.lat)
      ? data.origin.lat
      : null
  if (originLng === null || originLat === null) return null
  return {
    lng: originLng,
    lat: originLat,
    label:
      typeof data.origin?.label === 'string' && data.origin.label.trim()
        ? data.origin.label.trim()
        : undefined,
  }
}

async function prepareChatTurn(data: ChatRequestData): Promise<PreparedTurn> {
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
  const origin = parseOrigin(data)

  const cleanedInput = redactPII(userMessage)
  const lower = cleanedInput.toLowerCase()

  const previousCrudeCount = countCrudeInHistory(history)
  const currentIsCrude = isCrudeMessage(cleanedInput)

  if (currentIsCrude) {
    const totalCrude = previousCrudeCount + 1
    console.warn('[CRUDE ESCALATION]', {
      sessionKey,
      leadId,
      totalCrude,
      message: cleanedInput.slice(0, 120),
    })

    if (totalCrude >= 3) {
      return {
        kind: 'early',
        reply: CRUDE_ESCALATION_REPLIES[2],
        refused: true,
        reason: 'persistent_crude',
      }
    }
    if (totalCrude === 2) {
      return {
        kind: 'early',
        reply: CRUDE_ESCALATION_REPLIES[1],
        refused: true,
        reason: 'crude_second',
      }
    }
  }

  let systemPrompt = buildSystemPrompt(cleanedInput)

  const fhCheck = checkFairHousing(cleanedInput)
  if (!fhCheck.allowed) {
    return {
      kind: 'early',
      reply: FAIR_HOUSING_REFUSAL,
      refused: true,
      reason: fhCheck.reason,
    }
  }

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

  const wantsPlaygrounds = mentionsPlayground(cleanedInput)
  const wantsSchools = mentionsSchool(cleanedInput)
  const wantsGrocery = mentionsGrocery(cleanedInput)
  const wantsAmenities = wantsPlaygrounds || wantsSchools || wantsGrocery
  const namedPlaceQuery = !wantsAmenities
    ? extractNamedPlaceQuery(cleanedInput)
    : null

  let listingRows: ListingSummary[] | null = null
  if (needsListings || wantsAmenities || namedPlaceQuery) {
    try {
      listingRows = await getListingRows()
    } catch (err) {
      console.error('listings load failed', err)
    }
  }

  if (needsListings) {
    systemPrompt = listingRows
      ? `${systemPrompt}\n\n${formatListingsContext(listingRows, 25)}`
      : `${systemPrompt}\n\nLISTING DATA UNAVAILABLE: could not load current inventory. Do not invent prices or addresses.`
  }

  if (wantsAmenities) {
    const amenityOrigin =
      origin ??
      (listingRows ? resolveOriginFromMessage(cleanedInput, listingRows) : null)
    if (wantsPlaygrounds) {
      systemPrompt = `${systemPrompt}\n\n${getPlaygroundContext(amenityOrigin)}`
    }
    if (wantsSchools) {
      systemPrompt = `${systemPrompt}\n\n${getSchoolContext(amenityOrigin)}`
    }
    if (wantsGrocery) {
      systemPrompt = `${systemPrompt}\n\n${getGroceryContext(amenityOrigin)}`
    }

    const token = process.env.VITE_MAPBOX_TOKEN
    if (
      amenityOrigin &&
      Number.isFinite(amenityOrigin.lng) &&
      Number.isFinite(amenityOrigin.lat) &&
      token
    ) {
      const from = { lng: amenityOrigin.lng, lat: amenityOrigin.lat }
      const nearest = wantsPlaygrounds
        ? findNearestPlaygrounds(from, 1)[0]
        : wantsSchools
          ? findNearestSchools(from, 1)[0]
          : findNearestGroceryStores(from, 1)[0]
      if (nearest) {
        const overlay = await buildAmenityRouteOverlay({
          from,
          to: { lng: nearest.amenity.lng, lat: nearest.amenity.lat },
          destinationLabel: nearest.amenity.name,
          accessToken: token,
          hazardNote:
            nearest.majorRoadsOnFoot.length > 0
              ? nearest.majorRoadsOnFoot.join(', ')
              : null,
        })
        if (overlay) {
          systemPrompt = `${systemPrompt}\n\n${formatRoutedTimesBlock(overlay)}`
        }
      }
    }
  }

  if (namedPlaceQuery) {
    const amenityOrigin =
      origin ??
      (listingRows ? resolveOriginFromMessage(cleanedInput, listingRows) : null)
    const token = process.env.VITE_MAPBOX_TOKEN
    const proximity =
      amenityOrigin &&
      Number.isFinite(amenityOrigin.lng) &&
      Number.isFinite(amenityOrigin.lat)
        ? { lng: amenityOrigin.lng, lat: amenityOrigin.lat }
        : null
    if (token) {
      const hit = await resolveNamedPlace({
        query: namedPlaceQuery,
        proximity,
        accessToken: token,
      })
      if (hit) {
        systemPrompt = `${systemPrompt}\n\n${formatNamedPlaceBlock(hit)}`
        if (proximity) {
          const overlay = await buildAmenityRouteOverlay({
            from: proximity,
            to: { lng: hit.lng, lat: hit.lat },
            destinationLabel: hit.name,
            accessToken: token,
          })
          if (overlay) {
            systemPrompt = `${systemPrompt}\n\n${formatRoutedTimesBlock(overlay)}`
          }
        } else {
          systemPrompt = `${systemPrompt}\n\nNo listing origin for this turn. Name the matched place but do not invent drive or walk minutes from an unknown start. Ask them to tap a home first if they want a route.`
        }
      } else {
        systemPrompt = `${systemPrompt}\n\nNAMED PLACE LOOKUP FAILED: could not match "${namedPlaceQuery}" inside the Aiken coverage area. Do not invent a location. Say you could not find that place near Aiken and offer a fuller name or Nick.`
      }
    }
  }

  // Gholi memory — SECURITY DEFINER RPCs only. A memory outage
  // must not block the rest of the turn (map + listings stay available).
  if (sessionKey) {
    const memory = await rouPersonaRouter.companion.readMemory(
      sessionKey,
      leadId
    )
    if (memory.ok) {
      const memoryBlock = formatMemoryForPrompt(memory.data)
      if (memoryBlock) {
        systemPrompt = `${systemPrompt}\n\n${memoryBlock}`
      }
    }
  }

  const messages: GrokMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: redactPII(m.content),
    })),
    { role: 'user', content: cleanedInput },
  ]

  return {
    kind: 'model',
    cleanedInput,
    history,
    sessionKey,
    leadId,
    messages,
  }
}

function finalizeReply(raw: string): {
  reply: string
  refused?: boolean
  reason?: string
} {
  let reply = redactPII(
    raw.trim() || 'I apologize, I could not generate a response.'
  )
  const outputCheck = checkFairHousing(reply)
  if (!outputCheck.allowed) {
    return {
      reply: FAIR_HOUSING_REFUSAL,
      refused: true,
      reason: outputCheck.reason ?? 'output_fair_housing',
    }
  }
  return { reply }
}

function saveMemoryAfterTurn(opts: {
  sessionKey: string | null
  leadId: string | null
  history: ChatMessage[]
  cleanedInput: string
  reply: string
}) {
  if (!opts.sessionKey) return
  void rouPersonaRouter.isolateCompanion(async () => {
    await extractAndSaveConversationSummary({
      sessionKey: opts.sessionKey!,
      history: opts.history,
      userMessage: opts.cleanedInput,
      assistantReply: opts.reply,
      leadId: opts.leadId,
    })
    await extractAndSaveNotes({
      sessionKey: opts.sessionKey!,
      userMessage: opts.cleanedInput,
      assistantReply: opts.reply,
      leadId: opts.leadId,
    })
    return true
  }, false)
}

async function* readGrokSseDeltas(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>
        }
        const delta = parsed.choices?.[0]?.delta?.content
        if (typeof delta === 'string' && delta.length > 0) {
          yield delta
        }
      } catch {
        // Skip malformed SSE frames
      }
    }
  }
}

const chatValidator = (data: ChatRequestData) => data

/** Non-streaming fallback (tools / older callers). */
export const chat = createServerFn({ method: 'POST' })
  .validator(chatValidator)
  .handler(async ({ data }) => {
    const prepared = await prepareChatTurn(data)
    if (prepared.kind === 'early') {
      return {
        reply: prepared.reply,
        refused: true as const,
        reason: prepared.reason,
      }
    }

    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4.5',
        messages: prepared.messages,
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
    const raw =
      result?.choices?.[0]?.message?.content?.trim() ??
      'I apologize, I could not generate a response.'
    const finalized = finalizeReply(raw)
    saveMemoryAfterTurn({
      sessionKey: prepared.sessionKey,
      leadId: prepared.leadId,
      history: prepared.history,
      cleanedInput: prepared.cleanedInput,
      reply: finalized.reply,
    })
    return finalized
  })

/**
 * Primary ChatWidget path — streams Grok tokens with the same prep,
 * PII redaction, Fair Housing, and Node B memory rules as `chat`.
 */
export const chatStream = createServerFn({ method: 'POST' })
  .validator(chatValidator)
  .handler(async function* ({ data }): AsyncGenerator<ChatStreamChunk> {
    try {
      const prepared = await prepareChatTurn(data)
      if (prepared.kind === 'early') {
        yield {
          type: 'done',
          reply: prepared.reply,
          refused: true,
          reason: prepared.reason,
        }
        return
      }

      const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'grok-4.5',
          messages: prepared.messages,
          temperature: 0.4,
          max_tokens: 1024,
          stream: true,
        }),
      })

      if (!grokResponse.ok || !grokResponse.body) {
        const errText = grokResponse.body
          ? await grokResponse.text()
          : 'missing body'
        console.error('Grok API stream error', grokResponse.status, errText)
        yield { type: 'error', message: 'Upstream model error' }
        return
      }

      let assembled = ''
      for await (const delta of readGrokSseDeltas(grokResponse.body)) {
        const cleaned = redactPII(delta)
        assembled += cleaned
        yield { type: 'delta', text: cleaned }
      }

      const finalized = finalizeReply(assembled)
      // If output Fair Housing fires after tokens already streamed, the client
      // replaces the bubble with the refusal from this done chunk.
      saveMemoryAfterTurn({
        sessionKey: prepared.sessionKey,
        leadId: prepared.leadId,
        history: prepared.history,
        cleanedInput: prepared.cleanedInput,
        reply: finalized.reply,
      })
      yield {
        type: 'done',
        reply: finalized.reply,
        refused: finalized.refused,
        reason: finalized.reason,
      }
    } catch (err) {
      console.error('chatStream failed', err)
      yield {
        type: 'error',
        message: err instanceof Error ? err.message : 'Chat stream failed',
      }
    }
  })
