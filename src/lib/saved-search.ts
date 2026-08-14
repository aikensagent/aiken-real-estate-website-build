import type { SearchFilters } from './filterListings'
import { pointInAikenBbox } from './rou/named-place'
import type { AikenAreaFocus } from './rou/aiken-areas'

export type SavedSearchArea = {
  id: string
  label: string
  lng: number
  lat: number
  spanLng: number
  spanLat: number
}

export type SavedSearchPayload = {
  beds?: string
  baths?: string
  price?: string
  sqft?: string
  area: SavedSearchArea | null
}

export type SavedSearchRow = {
  id: string
  label: string
  payload: SavedSearchPayload
  created_at: string
}

function optionalFilter(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 20) return undefined
  if (!/^\d+$/.test(trimmed)) return undefined
  return trimmed
}

function parseArea(value: unknown): SavedSearchArea | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id.trim().slice(0, 40) : ''
  const label = typeof row.label === 'string' ? row.label.trim().slice(0, 60) : ''
  const lng = Number(row.lng)
  const lat = Number(row.lat)
  const spanLng = Number(row.spanLng)
  const spanLat = Number(row.spanLat)
  if (!id || !label) return null
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  if (!pointInAikenBbox(lng, lat)) return null
  if (!Number.isFinite(spanLng) || !Number.isFinite(spanLat)) return null
  if (spanLng <= 0 || spanLat <= 0 || spanLng > 0.5 || spanLat > 0.5) return null
  return { id, label, lng, lat, spanLng, spanLat }
}

export function parseSavedSearchPayload(value: unknown): SavedSearchPayload | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  return {
    beds: optionalFilter(row.beds),
    baths: optionalFilter(row.baths),
    price: optionalFilter(row.price),
    sqft: optionalFilter(row.sqft),
    area: parseArea(row.area),
  }
}

export function buildSavedSearchPayload(
  filters: SearchFilters | null,
  area: AikenAreaFocus | null
): SavedSearchPayload {
  return {
    beds: optionalFilter(filters?.beds),
    baths: optionalFilter(filters?.baths),
    price: optionalFilter(filters?.price),
    sqft: optionalFilter(filters?.sqft),
    area: area
      ? parseArea(area)
      : null,
  }
}

export function labelSavedSearch(payload: SavedSearchPayload): string {
  const parts: string[] = []
  if (payload.beds) parts.push(`${payload.beds}+ beds`)
  if (payload.baths) parts.push(`${payload.baths}+ baths`)
  if (payload.price) {
    const n = Number(payload.price)
    parts.push(
      Number.isFinite(n) ? `$${Math.round(n / 1000)}k+` : 'priced'
    )
  }
  if (payload.area?.label) parts.push(payload.area.label)
  const label = parts.join(' · ') || 'Aiken homes'
  return label.slice(0, 80)
}

export function filtersFromPayload(payload: SavedSearchPayload): SearchFilters {
  return {
    beds: payload.beds,
    baths: payload.baths,
    price: payload.price,
    sqft: payload.sqft,
  }
}
