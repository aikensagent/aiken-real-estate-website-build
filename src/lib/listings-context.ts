import { supabase } from './supabase'

export type ListingSummary = {
  id: string
  mls_id?: string | null
  address?: string | null
  price?: number | null
  beds?: number | null
  baths?: number | null
  lng?: number | null
  lat?: number | null
}

/** Raw listing rows, for callers that need coordinates rather than prose. */
export async function getListingRows(): Promise<ListingSummary[]> {
  const { data, error } = await supabase.rpc('get_listings_with_coords')

  if (error) {
    throw new Error(`get_listings_with_coords failed: ${error.message}`)
  }

  return (data as ListingSummary[] | null) ?? []
}

/** Format already-loaded rows into a short context block for Rou. */
export function formatListingsContext(
  listings: ListingSummary[],
  limit = 25
): string {
  if (listings.length === 0) {
    return 'LISTING DATA: no active listings currently loaded.'
  }

  const rows = listings.slice(0, limit)

  const lines = rows.map((l, i) => {
    const price =
      l.price != null ? `$${Number(l.price).toLocaleString()}` : 'Price on request'
    const beds = l.beds != null ? `${l.beds} bed` : 'beds n/a'
    const baths = l.baths != null ? `${l.baths} bath` : 'baths n/a'
    const addr = l.address || 'Address n/a'
    const mls = l.mls_id ? `MLS ${l.mls_id}` : 'MLS n/a'
    return `${i + 1}. ${addr} — ${price} — ${beds} / ${baths} — ${mls}`
  })

  return [
    'CURRENT LOCAL LISTINGS (from our live inventory — use only these facts; do not invent prices or addresses):',
    ...lines,
    `Total shown: ${rows.length} of ${listings.length} loaded.`,
  ].join('\n')
}