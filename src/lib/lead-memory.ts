import { supabase } from './supabase'

export type PersonalNote = {
  id: string
  session_key: string
  lead_id: string | null
  category: string
  note_key: string
  excerpt: string
  confidence: number
  is_active: boolean
  source: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type ConversationSummary = {
  id: string
  session_key: string
  lead_id: string | null
  summary: string
  turn_count: number
  key_entities: Record<string, unknown>
  created_at: string
  last_message_at: string | null
}

export type LeadMemory = {
  session_key: string
  lead_id: string | null
  notes: PersonalNote[]
  summaries: ConversationSummary[]
  retrieved_at: string
}

export async function getLeadMemory(
  sessionKey: string,
  leadId?: string | null
): Promise<LeadMemory> {
  const { data, error } = await supabase.rpc('get_lead_memory', {
    p_session_key: sessionKey,
    p_lead_id: leadId ?? null,
  })

  if (error) {
    console.error('get_lead_memory error', error.message)
    return {
      session_key: sessionKey,
      lead_id: leadId ?? null,
      notes: [],
      summaries: [],
      retrieved_at: new Date().toISOString(),
    }
  }

  const row = (data ?? {}) as LeadMemory
  return {
    session_key: row.session_key ?? sessionKey,
    lead_id: row.lead_id ?? leadId ?? null,
    notes: Array.isArray(row.notes) ? row.notes : [],
    summaries: Array.isArray(row.summaries) ? row.summaries : [],
    retrieved_at: row.retrieved_at ?? new Date().toISOString(),
  }
}

export function formatMemoryForPrompt(memory: LeadMemory): string {
  if ((!memory.notes || memory.notes.length === 0) && (!memory.summaries || memory.summaries.length === 0)) {
    return ''
  }

  const parts: string[] = [
    'KNOWN FACTS ABOUT THIS VISITOR (Gholi memory — use naturally, never invent):',
  ]

  if (memory.notes && memory.notes.length > 0) {
    const sorted = [...memory.notes].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    for (const note of sorted) {
      const label = note.note_key.replace(/_/g, ' ')
      parts.push(`- ${label}: ${note.excerpt}`)
    }
  }

  if (memory.summaries && memory.summaries.length > 0) {
    const latest = memory.summaries[0]
    if (latest.summary) {
      parts.push(`Prior conversation summary: ${latest.summary}`)
    }
  }

  return parts.length > 1 ? parts.join('\n') : ''
}

export async function saveConversationSummary(opts: {
  sessionKey: string
  summary: string
  turnCount?: number
  keyEntities?: Record<string, unknown>
  leadId?: string | null
  lastMessageAt?: string
}): Promise<void> {
  const { error } = await supabase.rpc('save_conversation_summary', {
    p_session_key: opts.sessionKey,
    p_summary: opts.summary,
    p_turn_count: opts.turnCount ?? 0,
    p_key_entities: opts.keyEntities ?? {},
    p_lead_id: opts.leadId ?? null,
    p_last_message_at: opts.lastMessageAt ?? new Date().toISOString(),
  })

  if (error) {
    console.error('save_conversation_summary error', error.message)
  }
}

export async function upsertPersonalNote(opts: {
  sessionKey: string
  category: string
  noteKey: string
  excerpt: string
  confidence?: number
  source?: string
  leadId?: string | null
  updatedBy?: string | null
}): Promise<string | null> {
  const { data, error } = await supabase.rpc('upsert_personal_note', {
    p_session_key: opts.sessionKey,
    p_category: opts.category,
    p_note_key: opts.noteKey,
    p_excerpt: opts.excerpt,
    p_confidence: opts.confidence ?? 0.65,
    p_source: opts.source ?? 'extractor',
    p_lead_id: opts.leadId ?? null,
    p_updated_by: opts.updatedBy ?? null,
  })

  if (error) {
    console.error('upsert_personal_note error', error.message)
    return null
  }

  return data as string
}

// ------------------------------------------------------------
// Note extraction (tightened 2026-08-01)
// ------------------------------------------------------------

const EXTRACTION_NOTE_KEYS = [
  'spouse_or_partner',
  'kids',
  'pets',
  'timeline',
  'budget',
  'financing',
  'move_reason',
  'current_location',
  'preferred_area',
  'property_type',
  'must_haves',
  'property_interest',
] as const

type ExtractionResult = {
  note_key: (typeof EXTRACTION_NOTE_KEYS)[number]
  excerpt: string
  confidence: number
}

const NOTE_KEY_TO_CATEGORY: Record<string, string> = {
  spouse_or_partner: 'family',
  kids: 'family',
  pets: 'family',
  timeline: 'timeline',
  budget: 'budget',
  financing: 'budget',
  move_reason: 'preferences',
  current_location: 'location',
  preferred_area: 'preferences',
  property_type: 'preferences',
  must_haves: 'preferences',
  property_interest: 'property_interest',
}

export async function extractAndSaveNotes(opts: {
  sessionKey: string
  userMessage: string
  assistantReply: string
  leadId?: string | null
}): Promise<void> {
  if (!process.env.GROK_API_KEY) return

  const extractionPrompt = `You are a precise fact extractor for Gholi, the Best Life Realty personal advisor (Node B companion memory).
Extract ONLY clear, explicit facts the USER stated in this turn. Never invent or assume.

Return a JSON array of objects. Each object must have:
- note_key: exactly one of [${EXTRACTION_NOTE_KEYS.join(', ')}]
- excerpt: short factual paraphrase or direct quote (max 180 characters)
- confidence: number from 0.70 to 0.95 (use ≥ 0.80 only when the fact is unambiguous)

Key definitions:
- spouse_or_partner: name or clear presence of spouse/partner (“my wife and I”, “my partner”, “John and I”)
- kids: children or family size with kids
- pets: any mention of pets (“two dogs”, “a cat named Luna”, “we have pets”)
- timeline: when they want to buy or move
- budget: price range or budget constraints
- financing: pre-approved, cash, need to sell first, loan type, etc.
- move_reason: why they are moving or looking
- current_location: where they currently live or are relocating from
- preferred_area: specific neighborhoods, cities, or areas they want
- property_type: ranch, townhouse, single-level, with acreage, pool, etc.
- must_haves: explicit must-haves or deal-breakers
- property_interest: interest in a specific listing or address

Rules:
- Only extract what the USER clearly stated.
- Prefer the most specific key.
- Never extract race, religion, national origin, disability, family status inferences, or any Fair Housing protected class.
- If nothing clear and high-confidence, return [].
- Output ONLY valid JSON. No markdown, no commentary.

Examples of good extractions:
User: “My wife and I are looking in Houndslake for a single-level home under $450k. We have two dogs.”
→ [
  {"note_key":"spouse_or_partner","excerpt":"My wife and I","confidence":0.92},
  {"note_key":"preferred_area","excerpt":"looking in Houndslake","confidence":0.90},
  {"note_key":"property_type","excerpt":"single-level home","confidence":0.88},
  {"note_key":"budget","excerpt":"under $450k","confidence":0.90},
  {"note_key":"pets","excerpt":"We have two dogs","confidence":0.93}
]

User: “We’re relocating from Charlotte next spring because of a job.”
→ [
  {"note_key":"current_location","excerpt":"relocating from Charlotte","confidence":0.91},
  {"note_key":"timeline","excerpt":"next spring","confidence":0.87},
  {"note_key":"move_reason","excerpt":"because of a job","confidence":0.88}
]

User message: ${opts.userMessage}
Assistant reply: ${opts.assistantReply}`

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4.5',
        messages: [
          { role: 'system', content: 'You output only valid JSON arrays. No other text.' },
          { role: 'user', content: extractionPrompt },
        ],
        temperature: 0.1,
        max_tokens: 700,
      }),
    })

    if (!res.ok) return

    const json = await res.json()
    const raw = json?.choices?.[0]?.message?.content?.trim() ?? '[]'
    let parsed: ExtractionResult[] = []

    try {
      const cleaned = raw.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return
    }

    if (!Array.isArray(parsed)) return

    for (const item of parsed) {
      if (
        !item.note_key ||
        !EXTRACTION_NOTE_KEYS.includes(item.note_key as any) ||
        !item.excerpt ||
        typeof item.excerpt !== 'string'
      ) {
        continue
      }

      const excerpt = item.excerpt.slice(0, 280).trim()
      if (excerpt.length < 2) continue

      const confidence = Math.min(0.95, Math.max(0.70, Number(item.confidence) || 0.75))
      const category = NOTE_KEY_TO_CATEGORY[item.note_key] ?? 'other'

      await upsertPersonalNote({
        sessionKey: opts.sessionKey,
        category,
        noteKey: item.note_key,
        excerpt,
        confidence,
        source: 'extractor',
        leadId: opts.leadId,
      })
    }
  } catch (err) {
    console.error('extractAndSaveNotes failed', err)
  }
}
// ------------------------------------------------------------
// Conversation summary extraction (quality pass 2026-08-02)
// ------------------------------------------------------------

export async function extractAndSaveConversationSummary(opts: {
  sessionKey: string
  history: { role: 'user' | 'assistant'; content: string }[]
  userMessage: string
  assistantReply: string
  leadId?: string | null
}): Promise<void> {
  if (!process.env.GROK_API_KEY) return

  // Only summarize when there is enough signal
  const turnCount = opts.history.length + 2
  if (turnCount < 4) return

  const recentTurns = [
    ...opts.history.slice(-6),
    { role: 'user' as const, content: opts.userMessage },
    { role: 'assistant' as const, content: opts.assistantReply },
  ]
    .map((m) => `${m.role === 'user' ? 'User' : 'Gholi'}: ${m.content}`)
    .join('\n')

  const summaryPrompt = `You are a precise conversation summarizer for Gholi, the Best Life Realty personal advisor working with Nick Williams in Aiken, SC.

Write a short, high-signal summary of the conversation so far (2–4 sentences max, under 400 characters).

Focus only on:
- What the visitor is looking for (goals, property type, area, budget, timeline)
- Key facts they have already stated
- Current stage of the conversation (just starting, narrowing options, ready for next step, etc.)
- Any clear open questions or next actions

Rules:
- Only use facts the USER clearly stated. Never invent.
- Stay Fair Housing safe — never mention or infer protected classes.
- Do not quote the full chat. Compress into useful memory.
- Output ONLY the summary text. No labels, no markdown, no commentary.

Conversation:
${recentTurns}`

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4.5',
        messages: [
          {
            role: 'system',
            content: 'You output only a short plain-text conversation summary. No other text.',
          },
          { role: 'user', content: summaryPrompt },
        ],
        temperature: 0.2,
        max_tokens: 220,
      }),
    })

    if (!res.ok) return

    const json = await res.json()
    const summary = (json?.choices?.[0]?.message?.content ?? '').trim()
    if (!summary || summary.length < 20) return

    await saveConversationSummary({
      sessionKey: opts.sessionKey,
      summary: summary.slice(0, 600),
      turnCount,
      leadId: opts.leadId,
    })
  } catch (err) {
    console.error('extractAndSaveConversationSummary failed', err)
  }
}