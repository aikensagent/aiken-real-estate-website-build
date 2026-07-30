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
    'KNOWN FACTS ABOUT THIS VISITOR (from prior conversations — use naturally, never invent):',
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

const EXTRACTION_NOTE_KEYS = [
  'spouse_name',
  'pet_name',
  'kids',
  'timeline',
  'budget_notes',
  'relocation_reason',
  'preferred_style',
  'prior_objection',
  'favorite_feature',
  'property_interest',
] as const

type ExtractionResult = {
  note_key: (typeof EXTRACTION_NOTE_KEYS)[number]
  excerpt: string
  confidence: number
  category: string
}

const NOTE_KEY_TO_CATEGORY: Record<string, string> = {
  spouse_name: 'family',
  pet_name: 'family',
  kids: 'family',
  timeline: 'timeline',
  budget_notes: 'budget',
  relocation_reason: 'preferences',
  preferred_style: 'preferences',
  prior_objection: 'objections',
  favorite_feature: 'preferences',
  property_interest: 'property_interest',
}

export async function extractAndSaveNotes(opts: {
  sessionKey: string
  userMessage: string
  assistantReply: string
  leadId?: string | null
}): Promise<void> {
  if (!process.env.GROK_API_KEY) return

  const extractionPrompt = `You are a precise fact extractor for a real-estate chat. 
Extract ONLY clear, explicit facts the USER stated in this conversation turn.
Return a JSON array of objects with these exact fields:
- note_key: one of [${EXTRACTION_NOTE_KEYS.join(', ')}]
- excerpt: short direct quote or paraphrase (max 200 characters)
- confidence: number between 0.6 and 0.9

Rules:
- Only extract if the user clearly stated it.
- Never invent or assume.
- Never extract anything related to race, religion, national origin, disability, or other Fair Housing protected classes.
- If nothing clear, return an empty array [].
- Output ONLY valid JSON. No markdown, no explanation.

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
          { role: 'system', content: 'You output only valid JSON arrays.' },
          { role: 'user', content: extractionPrompt },
        ],
        temperature: 0.1,
        max_tokens: 600,
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

      const confidence = Math.min(0.9, Math.max(0.6, Number(item.confidence) || 0.65))
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