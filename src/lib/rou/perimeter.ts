import { contextMatrix } from '../context-matrix'

/** Public map / Interface Rou — PostGIS only. Never memory. */
export const NODE_A_ALLOWED_RPCS = [
  'get_listings_with_coords',
  'get_nearby_listings',
  'get_listing_office_names',
  'get_listing_living_areas',
] as const

/** Companion Rou — audited SECURITY DEFINER memory paths only. */
export const NODE_B_ALLOWED_RPCS = [
  'get_lead_memory',
  'save_conversation_summary',
  'upsert_personal_note',
] as const

export type NodeARpc = (typeof NODE_A_ALLOWED_RPCS)[number]
export type NodeBRpc = (typeof NODE_B_ALLOWED_RPCS)[number]

const NODE_A_SET = new Set<string>(NODE_A_ALLOWED_RPCS)
const NODE_B_SET = new Set<string>(NODE_B_ALLOWED_RPCS)

export const NODE_A_FORBIDDEN_TABLES =
  contextMatrix.compliance.rls.isolated_from_anonymous

type Overlap = NodeARpc & NodeBRpc
type _AegisNoOverlap = [Overlap] extends [never] ? true : never
const _aegisNoOverlap: _AegisNoOverlap = true
void _aegisNoOverlap

function stripSchema(name: string): string {
  return name.startsWith('public.') ? name.slice('public.'.length) : name
}

export function assertNodeARpc(name: string): asserts name is NodeARpc {
  const rpc = stripSchema(name)
  if (NODE_B_SET.has(rpc)) {
    throw new Error(
      `Aegis: Node A (Interface Rou) is blocked from memory RPC "${rpc}"`
    )
  }
  if (!NODE_A_SET.has(rpc)) {
    throw new Error(
      `Aegis: Node A (Interface Rou) cannot call "${rpc}". Allowed: ${NODE_A_ALLOWED_RPCS.join(', ')}`
    )
  }
}

export function assertNodeBRpc(name: string): asserts name is NodeBRpc {
  const rpc = stripSchema(name)
  if (NODE_A_SET.has(rpc)) {
    throw new Error(
      `Aegis: Node B (Companion Rou) cannot call Interface Rou RPC "${rpc}"`
    )
  }
  if (!NODE_B_SET.has(rpc)) {
    throw new Error(
      `Aegis: Node B (Companion Rou) cannot call "${rpc}". Memory writes must use SECURITY DEFINER RPCs: ${NODE_B_ALLOWED_RPCS.join(', ')}`
    )
  }
}

export function assertNodeATableAccess(table: string): void {
  if (NODE_A_FORBIDDEN_TABLES.includes(table)) {
    throw new Error(
      `Aegis: Node A is blocked from table "${table}" (anonymous isolation)`
    )
  }
}
