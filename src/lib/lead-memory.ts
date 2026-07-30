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

  // Active personal notes (highest confidence first)
  if (memory.notes && memory.notes.length > 0) {
    const sorted = [...memory.notes].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    for (const note of sorted) {
      const label = note.note_key.replace(/_/g, ' ')
      parts.push(`- ${label}: ${note.excerpt}`)
    }
  }

  // Most recent conversation summary
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