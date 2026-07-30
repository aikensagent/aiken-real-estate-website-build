import { supabase } from './supabase'

export type LeadMemory = {
  summary: {
    id?: string
    summary?: string
    key_facts?: Record<string, unknown>
    message_count?: number
    last_message_at?: string
  } | null
  notes: {
    spouse_name?: string | null
    pet_name?: string | null
    relocation_reason?: string | null
    preferred_style?: string | null
    timeline?: string | null
    budget_notes?: string | null
    kids?: string | null
    prior_objection?: string | null
    favorite_feature?: string | null
    extra?: Record<string, unknown>
  } | null
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
    return { summary: null, notes: null }
  }
  const row = (data ?? {}) as LeadMemory
  return {
    summary: row.summary ?? null,
    notes: row.notes ?? null,
  }
}

export function formatMemoryForPrompt(memory: LeadMemory): string {
  if (!memory.summary && !memory.notes) return ''
  const parts: string[] = [
    'KNOWN FACTS ABOUT THIS VISITOR (from prior conversations — use naturally, never invent):',
  ]
  if (memory.notes) {
    const n = memory.notes
    const fields: [string, string | null | undefined][] = [
      ['Spouse', n.spouse_name],
      ['Pet', n.pet_name],
      ['Relocation reason', n.relocation_reason],
      ['Preferred style', n.preferred_style],
      ['Timeline', n.timeline],
      ['Budget notes', n.budget_notes],
      ['Kids', n.kids],
      ['Prior objection', n.prior_objection],
      ['Favorite feature', n.favorite_feature],
    ]
    for (const [label, val] of fields) {
      if (val) parts.push(`- ${label}: ${val}`)
    }
    if (n.extra && Object.keys(n.extra).length > 0) {
      parts.push(`- Extra: ${JSON.stringify(n.extra)}`)
    }
  }
  if (memory.summary?.summary) {
    parts.push(`Prior conversation summary: ${memory.summary.summary}`)
  }
  if (
    memory.summary?.key_facts &&
    Object.keys(memory.summary.key_facts).length > 0
  ) {
    parts.push(`Key facts: ${JSON.stringify(memory.summary.key_facts)}`)
  }
  return parts.length > 1 ? parts.join('\n') : ''
}

export async function saveConversationSummary(opts: {
  sessionKey: string
  summary: string
  keyFacts?: Record<string, unknown>
  messageCount?: number
  leadId?: string | null
}): Promise<void> {
  const { error } = await supabase.rpc('save_conversation_summary', {
    p_session_key: opts.sessionKey,
    p_summary: opts.summary,
    p_key_facts: opts.keyFacts ?? {},
    p_message_count: opts.messageCount ?? 0,
    p_lead_id: opts.leadId ?? null,
  })
  if (error) {
    console.error('save_conversation_summary error', error.message)
  }
}