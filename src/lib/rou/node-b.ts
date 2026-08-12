import type {
  LeadMemory,
} from '../lead-memory'
import { assertNodeBRpc } from './perimeter'

export type CompanionResult<T> =
  | { ok: true; degraded: false; data: T }
  | { ok: false; degraded: true; reason: string; data: T }

export type CompanionRou = {
  id: 'gholi'
  state: 'stateful'
  available: boolean
  readMemory: (
    sessionKey: string,
    leadId?: string | null
  ) => Promise<CompanionResult<LeadMemory>>
  writeSummary: (opts: {
    sessionKey: string
    summary: string
    turnCount?: number
    keyEntities?: Record<string, unknown>
    leadId?: string | null
    lastMessageAt?: string
  }) => Promise<CompanionResult<null>>
  writeNote: (opts: {
    sessionKey: string
    category: string
    noteKey: string
    excerpt: string
    confidence?: number
    source?: string
    leadId?: string | null
    updatedBy?: string | null
  }) => Promise<CompanionResult<string | null>>
}

export type CompanionDeps = {
  getLeadMemory: (
    sessionKey: string,
    leadId?: string | null
  ) => Promise<LeadMemory>
  saveConversationSummary: (opts: {
    sessionKey: string
    summary: string
    turnCount?: number
    keyEntities?: Record<string, unknown>
    leadId?: string | null
    lastMessageAt?: string
  }) => Promise<void>
  upsertPersonalNote: (opts: {
    sessionKey: string
    category: string
    noteKey: string
    excerpt: string
    confidence?: number
    source?: string
    leadId?: string | null
    updatedBy?: string | null
  }) => Promise<string | null>
}

function emptyMemory(sessionKey: string, leadId?: string | null): LeadMemory {
  return {
    session_key: sessionKey,
    lead_id: leadId ?? null,
    notes: [],
    summaries: [],
    retrieved_at: new Date().toISOString(),
  }
}

function reasonOf(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return 'companion_unavailable'
}

/**
 * Node B — Gholi (companion). Memory reads/writes go only through SECURITY DEFINER RPCs.
 * Connection or mutation failures degrade this node and never throw.
 */
export function createCompanionRou(deps: CompanionDeps): CompanionRou {
  const node: CompanionRou = {
    id: 'gholi',
    state: 'stateful',
    available: true,

    async readMemory(sessionKey, leadId) {
      assertNodeBRpc('get_lead_memory')
      try {
        const data = await deps.getLeadMemory(sessionKey, leadId)
        node.available = true
        return { ok: true, degraded: false, data }
      } catch (err) {
        node.available = false
        return {
          ok: false,
          degraded: true,
          reason: reasonOf(err),
          data: emptyMemory(sessionKey, leadId),
        }
      }
    },

    async writeSummary(opts) {
      assertNodeBRpc('save_conversation_summary')
      try {
        await deps.saveConversationSummary(opts)
        node.available = true
        return { ok: true, degraded: false, data: null }
      } catch (err) {
        node.available = false
        return {
          ok: false,
          degraded: true,
          reason: reasonOf(err),
          data: null,
        }
      }
    },

    async writeNote(opts) {
      assertNodeBRpc('upsert_personal_note')
      try {
        const id = await deps.upsertPersonalNote(opts)
        node.available = true
        return { ok: true, degraded: false, data: id }
      } catch (err) {
        node.available = false
        return {
          ok: false,
          degraded: true,
          reason: reasonOf(err),
          data: null,
        }
      }
    },
  }

  return node
}
