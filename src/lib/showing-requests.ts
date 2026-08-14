import { isListingId } from './listing-facts'

export type BuyerShowingRow = {
  id: string
  listingId: string
  createdAt: string
}

/** Auth RPC rows only. Drop junk. Cap the dashboard list. */
export function parseBuyerShowingRows(rows: unknown): BuyerShowingRow[] {
  if (!Array.isArray(rows)) return []
  const out: BuyerShowingRow[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const rec = row as Record<string, unknown>
    const id = typeof rec.id === 'string' ? rec.id.trim() : ''
    const listingId =
      typeof rec.listing_id === 'string' ? rec.listing_id.trim() : ''
    const createdAt =
      typeof rec.created_at === 'string' ? rec.created_at.trim() : ''
    if (!isListingId(id) || !isListingId(listingId)) continue
    out.push({ id, listingId, createdAt })
    if (out.length >= 40) break
  }
  return out
}

export function formatShowingRequestedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
