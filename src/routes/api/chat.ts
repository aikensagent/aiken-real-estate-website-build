import { createServerFn } from '@tanstack/react-start'

// ─────────────────────────────────────────────────────────────
// ARIA v2.0 — Phase 3 Chat Server Function (server-only)
// Mandatory order: PII redaction → Fair Housing guard → Grok → output filter
// ─────────────────────────────────────────────────────────────

const ARIA_SYSTEM_PROMPT = `You are Lottie, the AI assistant for Nick Williams, a licensed realtor with Coldwell Banker Best Life Realty in Aiken, South Carolina.

STRICT RULES YOU MUST FOLLOW ON EVERY RESPONSE:
1. Fair Housing: You must never answer, advise, or comment on any request that involves protected classes under the Fair Housing Act (race, color, national origin, religion, sex, familial status, disability, or any proxy for these). If a user asks about demographics, “good schools for certain people”, “safe neighborhoods for families of X”, or any similar topic, immediately refuse.
2. Never invent listing data, prices, or availability. If you do not have current data, say so.
3. Be helpful, professional, and focused on the Aiken, South Carolina real estate market and surrounding areas covered by the local MLS.
4. If a user asks about a location clearly outside the Aiken / local MLS area (for example another city or state), politely explain that you specialize in the Aiken market and offer to connect them with Nick Williams so he can refer them to a trusted agent in that area.
5. If you are unsure or the request is outside your knowledge, offer to connect the user with Nick Williams, a licensed realtor.

When refusing a Fair Housing violation, use exactly this phrase:
“I cannot assist with that request under Fair Housing guidelines. If you have other questions about the Aiken market or would like general help with your home search, I can connect you with Nick Williams.”`
function redactPII(text: string): string {
  // TODO Phase 3.1 — replace with real PII redaction (email, phone, SSN, address patterns)
  return text
}

function checkFairHousing(text: string): { allowed: boolean; reason?: string } {
  // TODO Phase 3.1 — expand with real classifier / keyword + semantic guard
  const lower = text.toLowerCase()
  const blocked = [
    'race', 'racial', 'black neighborhood', 'white neighborhood',
    'hispanic', 'asian', 'muslim', 'christian only', 'jewish',
    'kids only', 'no kids', 'disability', 'handicap', 'section 8 only'
  ]
  for (const term of blocked) {
    if (lower.includes(term)) {
      return { allowed: false, reason: `Fair Housing violation detected (${term})` }
    }
  }
  return { allowed: true }
}

const FAIR_HOUSING_REFUSAL =
  'I cannot assist with that request under Fair Housing guidelines. If you have other questions about the Aiken market or would like general help with your home search, I can connect you with Nick Williams.'

export const chat = createServerFn({ method: 'POST' })
  .validator((data: { message: string }) => {
    if (!data || typeof data.message !== 'string') {
      throw new Error('message is required')
    }
    return data
  })
  .handler(async ({ data }) => {
    if (!process.env.GROK_API_KEY) {
      throw new Error('Server configuration error')
    }

    const userMessage = data.message.trim()

    // 1. Input PII redaction
    const cleanedInput = redactPII(userMessage)

    // 2. Fair Housing pre-check
    const fhCheck = checkFairHousing(cleanedInput)
    if (!fhCheck.allowed) {
      return {
        reply: FAIR_HOUSING_REFUSAL,
        refused: true,
        reason: fhCheck.reason,
      }
    }

    // 3. Call Grok (xAI)
    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          { role: 'system', content: ARIA_SYSTEM_PROMPT },
          { role: 'user', content: cleanedInput },
        ],
        temperature: 0.4,
        max_tokens: 1024,
      }),
    })

    if (!grokResponse.ok) {
      const errText = await grokResponse.text()
      console.error('Grok API error', grokResponse.status, errText)
      throw new Error('Upstream model error')
    }

    const result = await grokResponse.json()
    let reply = result?.choices?.[0]?.message?.content?.trim() ?? 'I apologize, I could not generate a response.'

    // 4. Output PII redaction + final Fair Housing filter
    reply = redactPII(reply)
    const outputCheck = checkFairHousing(reply)
    if (!outputCheck.allowed) {
      reply = FAIR_HOUSING_REFUSAL
    }

    return { reply }
  })