/**
 * Mobile “Where in Aiken?” — chips + geocode inside the coverage bbox.
 * Flies a computed bbox so the list can stay on List (hidden-map bounds lie).
 * v2 (not this module): Use my location — in-bbox flies here; out-of-bbox
 * is a relocating-from lead signal, never a listing filter.
 */

import type { MapViewportBounds } from '../filterListings'
import {
  AIKEN_GEOCODE_BBOX,
  FAIR_HOUSING_PLACE_BLOCK,
  pointInAikenBbox,
} from './named-place'

export type AikenAreaFocus = {
  id: string
  label: string
  lng: number
  lat: number
  spanLng: number
  spanLat: number
}

/** Curated areas only — coordinates from existing parks / amenity records. */
export const AIKEN_AREA_CHIPS: AikenAreaFocus[] = [
  {
    id: 'downtown',
    label: 'Downtown',
    lng: -81.7198,
    lat: 33.5604,
    spanLng: 0.028,
    spanLat: 0.022,
  },
  {
    id: 'city-of-aiken',
    label: 'City of Aiken',
    lng: -81.7198,
    lat: 33.5604,
    spanLng: 0.07,
    spanLat: 0.055,
  },
  {
    id: 'hitchcock',
    label: 'Hitchcock Woods',
    lng: -81.7523,
    lat: 33.5444,
    spanLng: 0.03,
    spanLat: 0.024,
  },
  {
    id: 'north-augusta',
    label: 'North Augusta',
    lng: -81.97382,
    lat: 33.49505,
    spanLng: 0.055,
    spanLat: 0.045,
  },
  {
    id: 'graniteville',
    label: 'Graniteville',
    lng: -81.7973,
    lat: 33.577,
    spanLng: 0.045,
    spanLat: 0.035,
  },
]

const CHIP_ALIASES: Record<string, string[]> = {
  downtown: ['downtown', 'downtown aiken'],
  'city-of-aiken': ['city of aiken', 'aiken'],
  hitchcock: ['hitchcock', 'hitchcock woods'],
  'north-augusta': ['north augusta'],
  graniteville: ['graniteville', 'horse creek', 'horse creek valley'],
}

export function boundsFromAreaFocus(
  focus: AikenAreaFocus
): MapViewportBounds {
  return {
    west: focus.lng - focus.spanLng,
    south: focus.lat - focus.spanLat,
    east: focus.lng + focus.spanLng,
    north: focus.lat + focus.spanLat,
  }
}

export function zoomForAreaFocus(focus: AikenAreaFocus): number {
  if (focus.spanLat >= 0.05) return 11
  if (focus.spanLat >= 0.03) return 12
  return 13
}

export function matchAikenAreaChip(query: string): AikenAreaFocus | null {
  const q = query.toLowerCase().trim()
  if (q.length < 2) return null
  const exact = AIKEN_AREA_CHIPS.find((chip) => chip.label.toLowerCase() === q)
  if (exact) return exact
  return (
    AIKEN_AREA_CHIPS.find((chip) =>
      (CHIP_ALIASES[chip.id] ?? []).some((alias) => alias === q)
    ) ?? null
  )
}

function refusesFairHousingArea(query: string): boolean {
  const lower = query.toLowerCase()
  return FAIR_HOUSING_PLACE_BLOCK.some((term) => lower.includes(term))
}

type GeocodeResponse = {
  features?: Array<{
    text?: string
    place_name?: string
    center?: [number, number]
  }>
}

export async function geocodeAikenArea(opts: {
  query: string
  accessToken: string
  fetchImpl?: typeof fetch
}): Promise<AikenAreaFocus | null> {
  const query = opts.query.trim()
  if (!opts.accessToken || query.length < 2) return null
  if (refusesFairHousingArea(query)) return null

  const fetchImpl = opts.fetchImpl ?? fetch
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?proximity=-81.7198,33.5604` +
    `&bbox=${AIKEN_GEOCODE_BBOX.join(',')}` +
    `&limit=5&types=place,locality,neighborhood,address&country=US` +
    `&access_token=${encodeURIComponent(opts.accessToken)}`

  try {
    const res = await fetchImpl(url)
    if (!res.ok) return null
    const json = (await res.json()) as GeocodeResponse
    const feature = json.features?.find((item) => {
      const center = item.center
      if (!center || center.length < 2) return false
      const [lng, lat] = center
      return Number.isFinite(lng) && Number.isFinite(lat) && pointInAikenBbox(lng, lat)
    })
    const center = feature?.center
    if (!feature || !center || center.length < 2) return null
    const [lng, lat] = center
    const label = (feature.text || feature.place_name || query).trim().slice(0, 80)
    return {
      id: 'geocode',
      label,
      lng,
      lat,
      spanLng: 0.035,
      spanLat: 0.028,
    }
  } catch {
    return null
  }
}

export async function resolveAikenArea(opts: {
  query: string
  accessToken: string
  fetchImpl?: typeof fetch
}): Promise<AikenAreaFocus | null> {
  const query = opts.query.trim()
  if (query.length < 2) return null
  if (refusesFairHousingArea(query)) return null
  const chip = matchAikenAreaChip(query)
  if (chip) return chip
  return geocodeAikenArea(opts)
}
