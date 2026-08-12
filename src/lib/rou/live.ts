import { supabase } from '../supabase'
import type { LeadMemory } from '../lead-memory'
import { assertNodeARpc, assertNodeBRpc } from './perimeter'
import { createRouPersonaRouter } from './router'
import type { RpcCaller } from './node-a'
import type { CompanionDeps } from './node-b'

/**
 * Live adapters. This is the only Rou module that may import supabase.
 * Tests import the factories, not this file.
 */
const liveInterfaceRpc: RpcCaller = async (name, args) => {
  assertNodeARpc(name)
  const { data, error } = args
    ? await supabase.rpc(name, args)
    : await supabase.rpc(name)
  return { data, error }
}

const liveCompanionDeps: CompanionDeps = {
  async getLeadMemory(sessionKey, leadId) {
    assertNodeBRpc('get_lead_memory')
    const { data, error } = await supabase.rpc('get_lead_memory', {
      p_session_key: sessionKey,
      p_lead_id: leadId ?? null,
    })
    if (error) throw new Error(error.message)
    const row = (data ?? {}) as Partial<LeadMemory>
    return {
      session_key: row.session_key ?? sessionKey,
      lead_id: row.lead_id ?? leadId ?? null,
      notes: Array.isArray(row.notes) ? row.notes : [],
      summaries: Array.isArray(row.summaries) ? row.summaries : [],
      retrieved_at: row.retrieved_at ?? new Date().toISOString(),
    }
  },

  async saveConversationSummary(opts) {
    assertNodeBRpc('save_conversation_summary')
    const { error } = await supabase.rpc('save_conversation_summary', {
      p_session_key: opts.sessionKey,
      p_summary: opts.summary,
      p_turn_count: opts.turnCount ?? 0,
      p_key_entities: opts.keyEntities ?? {},
      p_lead_id: opts.leadId ?? null,
      p_last_message_at: opts.lastMessageAt ?? new Date().toISOString(),
    })
    if (error) throw new Error(error.message)
  },

  async upsertPersonalNote(opts) {
    assertNodeBRpc('upsert_personal_note')
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
    if (error) throw new Error(error.message)
    return (data as string | null) ?? null
  },
}

export const rouPersonaRouter = createRouPersonaRouter({
  interfaceRpc: liveInterfaceRpc,
  companionDeps: liveCompanionDeps,
})
