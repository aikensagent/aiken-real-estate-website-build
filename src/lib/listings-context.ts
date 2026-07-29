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

/** Fetch current listings and format a short context block for Aria (server-safe). */
export async function getListingsContext(limit = 25): Promise<string> {
  const { data, error } = await supabase.rpc('get_listings_with_coords')

  if (error) {
    console.error('listings-context RPC error:', error.message)
    return 'LISTING DATA UNAVAILABLE: could not load current inventory.'
  }

  if (!data || data.length === 0) {
    return 'LISTING DATA: no active listings currently loaded.'
  }

  const rows = (data as ListingSummary[]).slice(0, limit)

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
    `Total shown: ${rows.length} of ${data.length} loaded.`,
  ].join('\n')
}
