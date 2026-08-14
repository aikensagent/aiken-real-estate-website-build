import { createServerFn } from '@tanstack/react-start'
import { buyerUserClient, isAccessToken } from '../../lib/buyer-user-client'
import { isListingId } from '../../lib/listing-facts'
import {
  parseSavedSearchPayload,
  type SavedSearchRow,
} from '../../lib/saved-search'

function parseRows(value: unknown): SavedSearchRow[] {
  if (!Array.isArray(value)) return []
  const out: SavedSearchRow[] = []
  for (const row of value) {
    if (!row || typeof row !== 'object') continue
    const id = (row as { id?: unknown }).id
    const label = (row as { label?: unknown }).label
    const created = (row as { created_at?: unknown }).created_at
    const payload = parseSavedSearchPayload((row as { payload?: unknown }).payload)
    if (typeof id !== 'string' || !isListingId(id)) continue
    if (typeof label !== 'string' || !label.trim()) continue
    if (typeof created !== 'string' || !payload) continue
    out.push({ id, label: label.trim().slice(0, 80), payload, created_at: created })
  }
  return out
}

export const saveBuyerSearch = createServerFn({ method: 'POST' })
  .validator((data: { accessToken: string; label: string; payload: unknown }) => data)
  .handler(async ({ data }) => {
    const token = data.accessToken.trim()
    const label = data.label.trim().slice(0, 80)
    const payload = parseSavedSearchPayload(data.payload)
    if (!isAccessToken(token) || !label || !payload) return { ok: false as const }
    const client = buyerUserClient(token)
    const { data: id, error } = await client.rpc('save_buyer_search', {
      p_label: label,
      p_payload: payload,
    })
    if (error || typeof id !== 'string') return { ok: false as const }
    return { ok: true as const, id }
  })

export const listBuyerSearches = createServerFn({ method: 'GET' })
  .validator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    const token = data.accessToken.trim()
    if (!isAccessToken(token)) return []
    const client = buyerUserClient(token)
    const { data: rows, error } = await client.rpc('list_buyer_searches')
    if (error) return []
    return parseRows(rows)
  })

export const deleteBuyerSearch = createServerFn({ method: 'POST' })
  .validator((data: { accessToken: string; id: string }) => data)
  .handler(async ({ data }) => {
    const token = data.accessToken.trim()
    if (!isAccessToken(token) || !isListingId(data.id)) return { ok: false as const }
    const client = buyerUserClient(token)
    const { data: removed, error } = await client.rpc('delete_buyer_search', {
      p_id: data.id,
    })
    if (error || removed !== true) return { ok: false as const }
    return { ok: true as const }
  })
