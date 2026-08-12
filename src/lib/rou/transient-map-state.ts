import { z } from 'zod'
import { contextMatrix } from '../context-matrix'

export type TransientMapState = {
  version: 1
  center: [number, number]
  zoom: number
  bearing?: number
  pitch?: number
  filters: {
    minPrice: number | null
    maxPrice: number | null
    beds: number | null
    baths: number | null
    propertyType: string | null
    status: 'Active' | 'Pending' | null
  }
  drawnPolygon: {
    type: 'Polygon'
    coordinates: [number, number][][]
  } | null
  searchQuery: string
  lastUpdated: number
}

const transientSchema: z.ZodType<TransientMapState> = z.object({
  version: z.literal(1),
  center: z.tuple([z.number().finite(), z.number().finite()]),
  zoom: z.number().finite(),
  bearing: z.number().finite().optional(),
  pitch: z.number().finite().optional(),
  filters: z.object({
    minPrice: z.number().finite().nullable(),
    maxPrice: z.number().finite().nullable(),
    beds: z.number().finite().nullable(),
    baths: z.number().finite().nullable(),
    propertyType: z.string().nullable(),
    status: z.enum(['Active', 'Pending']).nullable(),
  }),
  drawnPolygon: z
    .object({
      type: z.literal('Polygon'),
      coordinates: z.array(z.array(z.tuple([z.number().finite(), z.number().finite()]))),
    })
    .nullable(),
  searchQuery: z.string(),
  lastUpdated: z.number().finite(),
})

const locked = contextMatrix.spatial.transient_map_state

export const TRANSIENT_MAP_STORAGE_KEY = locked.storage_key
export const TRANSIENT_MAP_STORAGE_SCOPE = locked.storage_scope

export function safeDefaultTransientMapState(
  now = Date.now()
): TransientMapState {
  const d = locked.safe_default
  return {
    version: 1,
    center: [d.center[0], d.center[1]],
    zoom: d.zoom,
    bearing: d.bearing,
    pitch: d.pitch,
    filters: { ...d.filters },
    drawnPolygon: null,
    searchQuery: d.searchQuery,
    lastUpdated: now,
  }
}

function sessionStore(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/**
 * Hydrate Interface Rou map state. Malformed payloads fall back to the
 * locked safe default and never throw into the public map.
 */
export function hydrateTransientMapState(): TransientMapState {
  const fallback = safeDefaultTransientMapState()
  const store = sessionStore()
  if (!store) return fallback

  try {
    const raw = store.getItem(TRANSIENT_MAP_STORAGE_KEY)
    if (!raw) return fallback
    const parsed = transientSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : fallback
  } catch {
    return fallback
  }
}

/**
 * Persist Interface Rou map state to sessionStorage only.
 * localStorage / KV / database writes are rejected by the locked contract.
 */
export function persistTransientMapState(state: TransientMapState): boolean {
  const store = sessionStore()
  if (!store) return false

  const parsed = transientSchema.safeParse({
    ...state,
    lastUpdated: Date.now(),
  })
  if (!parsed.success) return false

  try {
    store.setItem(TRANSIENT_MAP_STORAGE_KEY, JSON.stringify(parsed.data))
    return true
  } catch {
    return false
  }
}

export function clearTransientMapState(): void {
  try {
    sessionStore()?.removeItem(TRANSIENT_MAP_STORAGE_KEY)
  } catch {
    // Isolation: a storage failure must not reach the map UI.
  }
}

export type TransientFilterInput = {
  searchQuery?: string | null
  beds?: number | null
  baths?: number | null
  minPrice?: number | null
  propertyType?: string | null
  status?: 'Active' | 'Pending' | null
}

export type TransientViewport = {
  center: [number, number]
  zoom: number
  bearing?: number
  pitch?: number
}

/** Merge inbound search controls into the tab-scoped map state. */
export function applyTransientFilters(
  current: TransientMapState,
  input: TransientFilterInput
): TransientMapState {
  return {
    ...current,
    searchQuery: input.searchQuery?.trim() || current.searchQuery,
    filters: {
      minPrice:
        input.minPrice !== undefined ? input.minPrice : current.filters.minPrice,
      maxPrice: current.filters.maxPrice,
      beds: input.beds !== undefined ? input.beds : current.filters.beds,
      baths: input.baths !== undefined ? input.baths : current.filters.baths,
      propertyType:
        input.propertyType !== undefined
          ? input.propertyType
          : current.filters.propertyType,
      status: input.status !== undefined ? input.status : current.filters.status,
    },
  }
}

/** Persist camera after a pan/zoom without touching listing RPCs. */
export function applyTransientViewport(
  current: TransientMapState,
  viewport: TransientViewport
): TransientMapState {
  return {
    ...current,
    center: viewport.center,
    zoom: viewport.zoom,
    bearing: viewport.bearing ?? current.bearing,
    pitch: viewport.pitch ?? current.pitch,
  }
}
