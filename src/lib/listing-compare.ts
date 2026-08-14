import {
  formatListingFactRows,
  isListingId,
  type ListingFactRow,
  type ListingPublicFacts,
} from './listing-facts'

export const COMPARE_MAX = 4
export const COMPARE_STORAGE_KEY = 'searchaikenhomes:rou:transient:compare:v1'

export type CompareHome = {
  id: string
  address: string | null
  price: number | null
  beds: number | null
  baths: number | null
  mls_id: string | null
  photo: string | null
  facts: ListingPublicFacts
}

export type CompareMatrixRow = {
  key: string
  label: string
  values: (string | null)[]
}

function sessionStore(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function parseCompareIds(raw: unknown): string[] {
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/[,\s]+/)
      : []
  const ids: string[] = []
  const seen = new Set<string>()
  for (const item of values) {
    if (typeof item !== 'string') continue
    const id = item.trim()
    if (!isListingId(id) || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
    if (ids.length >= COMPARE_MAX) break
  }
  return ids
}

export function toggleCompareId(
  ids: string[],
  listingId: string
): { ids: string[]; full: boolean } {
  const current = parseCompareIds(ids)
  if (!isListingId(listingId)) return { ids: current, full: false }
  if (current.includes(listingId)) {
    return { ids: current.filter((id) => id !== listingId), full: false }
  }
  if (current.length >= COMPARE_MAX) {
    return { ids: current, full: true }
  }
  return { ids: [...current, listingId], full: false }
}

export function moveCompareId(
  ids: string[],
  fromIndex: number,
  toIndex: number
): string[] {
  const current = parseCompareIds(ids)
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= current.length ||
    toIndex >= current.length ||
    fromIndex === toIndex
  ) {
    return current
  }
  const next = [...current]
  const [moved] = next.splice(fromIndex, 1)
  if (!moved) return current
  next.splice(toIndex, 0, moved)
  return next
}

export function hydrateCompareIds(): string[] {
  const store = sessionStore()
  if (!store) return []
  try {
    return parseCompareIds(store.getItem(COMPARE_STORAGE_KEY))
  } catch {
    return []
  }
}

export function persistCompareIds(ids: string[]): string[] {
  const next = parseCompareIds(ids)
  const store = sessionStore()
  if (!store) return next
  try {
    if (next.length === 0) store.removeItem(COMPARE_STORAGE_KEY)
    else store.setItem(COMPARE_STORAGE_KEY, next.join(','))
  } catch {
    return next
  }
  return next
}

export function buildCompareMatrix(homes: CompareHome[]): CompareMatrixRow[] {
  const columns = homes.map((home) =>
    formatListingFactRows(home.facts, {
      mls_id: home.mls_id,
      price: home.price,
      beds: home.beds,
      baths: home.baths,
    })
  )
  const order: ListingFactRow[] = []
  const seen = new Set<string>()
  for (const rows of columns) {
    for (const row of rows) {
      if (seen.has(row.key)) continue
      seen.add(row.key)
      order.push(row)
    }
  }
  return order.map((row) => ({
    key: row.key,
    label: row.label,
    values: columns.map((rows) => rows.find((item) => item.key === row.key)?.value ?? null),
  }))
}
