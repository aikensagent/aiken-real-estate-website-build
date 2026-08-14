export type PriceSnapshot = {
  list_price: number
  observed_at: string
}

/** Write a snapshot only for a real price, and only when it changed. */
export function shouldRecordPriceSnapshot(
  lastPrice: number | null | undefined,
  nextPrice: number | null | undefined
): nextPrice is number {
  if (nextPrice == null || !Number.isFinite(nextPrice)) return false
  if (lastPrice == null || !Number.isFinite(lastPrice)) return true
  return Number(lastPrice) !== Number(nextPrice)
}

export function parsePriceSnapshots(rows: unknown): PriceSnapshot[] {
  if (!Array.isArray(rows)) return []
  const out: PriceSnapshot[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const price = Number((row as { list_price?: unknown }).list_price)
    const observed = (row as { observed_at?: unknown }).observed_at
    if (!Number.isFinite(price) || typeof observed !== 'string' || !observed) {
      continue
    }
    out.push({ list_price: price, observed_at: observed })
  }
  return out
}

const MAX_PRICE_SEEN_ROWS = 12

/** Prompt block only — our ingest snapshots, never a full MLS change log. */
export function formatPriceSeenBlock(rows: PriceSnapshot[]): string {
  if (rows.length === 0) {
    return [
      'PRICE WE HAVE SEEN: no ask-price snapshots for this home yet.',
      'This is not a full MLS price history. Do not invent prior prices. Say we only show changes we have recorded on this site, and offer Nick if they need older history.',
    ].join('\n')
  }

  const lines = rows.slice(0, MAX_PRICE_SEEN_ROWS).map((row) => {
    const price = `$${Number(row.list_price).toLocaleString()}`
    const day = row.observed_at.slice(0, 10)
    return `- ${price} on ${day}`
  })

  return [
    'PRICE WE HAVE SEEN (our 15-minute ingest snapshots only — not a full MLS change log):',
    ...lines,
    'If they ask for older MLS history, say we do not have it and offer Nick.',
  ].join('\n')
}
