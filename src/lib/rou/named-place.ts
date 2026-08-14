/**
 * Named-place lookup for Rou (LOCK #2).
 * Curated amenities first; Mapbox Geocoding only when the visitor names a place.
 * No web crawl. Results are biased to the Aiken coverage bbox.
 */

import {
  groceryStores,
  mentionsGrocery,
  mentionsPlayground,
  mentionsSchool,
  playgrounds,
  schools,
  type Amenity,
  type LatLng,
} from '../playgrounds'

export const AIKEN_GEOCODE_CENTER: LatLng = { lng: -81.7198, lat: 33.5604 }

/** minLng, minLat, maxLng, maxLat — Aiken County + nearby CSRA. */
export const AIKEN_GEOCODE_BBOX: [number, number, number, number] = [
  -82.12, 33.22, -81.28, 33.82,
]

export type NamedPlaceHit = {
  name: string
  lng: number
  lat: number
  source: 'curated' | 'geocode'
  placeName: string
}

type GeocodeResponse = {
  features?: Array<{
    text?: string
    place_name?: string
    place_type?: string[]
    center?: [number, number]
  }>
}

const COARSE_PLACE_TYPES = new Set([
  'place',
  'locality',
  'region',
  'country',
  'district',
  'postcode',
  'neighborhood',
])

export const FAIR_HOUSING_PLACE_BLOCK = [
  'race',
  'racial',
  'black neighborhood',
  'white neighborhood',
  'hispanic area',
  'asian community',
  'demographics',
  'ethnic',
  'religion',
  'synagogue',
  'mosque',
]

export function extractNamedPlaceQuery(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (
    mentionsPlayground(trimmed) ||
    mentionsSchool(trimmed) ||
    mentionsGrocery(trimmed)
  ) {
    return null
  }
  const lower = trimmed.toLowerCase()
  if (FAIR_HOUSING_PLACE_BLOCK.some((term) => lower.includes(term))) {
    return null
  }

  const patterns = [
    /^(?:how far(?:\s+is it)?|how long(?:\s+(?:does it take|would it take))?)\s+(?:is it\s+)?to\s+(.+)$/i,
    /^(?:what(?:'s| is) the (?:drive|walk|distance)|distance|directions|route)\s+to\s+(.+)$/i,
    /^(?:drive|walk|get)\s+to\s+(.+)$/i,
    /(?:how far|how long|distance|directions|route|drive|walk).+\bto\s+(.+)$/i,
    /^how far(?:\s+is)\s+(.+)$/i,
    /^where(?:'s| is)\s+(.+?)\s+from\s+(?:here|this\s+(?:home|house|listing))\s*$/i,
  ]

  for (const re of patterns) {
    const match = trimmed.match(re)
    if (match?.[1]) {
      const place = cleanPlaceName(match[1])
      if (place) return place
    }
  }
  return null
}

function cleanPlaceName(raw: string): string | null {
  let cleaned = raw.replace(/[?.!]+$/g, '').trim()
  const toIdx = cleaned.toLowerCase().lastIndexOf(' to ')
  if (toIdx >= 0) {
    cleaned = cleaned.slice(toIdx + 4).trim()
  }
  cleaned = cleaned
    .replace(/\s+from\s+(?:here|this\s+(?:home|house|listing))\s*$/i, '')
    .replace(/^(?:the|a|an)\s+/i, '')
    .trim()
  if (cleaned.length < 2 || cleaned.length > 80) return null
  if (/^(it|there|that|here|this|them)$/i.test(cleaned)) return null
  return cleaned
}

type LocalNamedPlace = Amenity & { aliases: string[] }

/**
 * Local named destinations that Mapbox often misses or collapses to a city.
 * Coordinates from public facility records (EPA TRI, Wikipedia/USGS).
 */
const LOCAL_NAMED_PLACES: LocalNamedPlace[] = [
  {
    id: 'bridgestone-graniteville',
    name: 'Bridgestone (Graniteville)',
    lng: -81.855,
    lat: 33.622,
    area: 'Graniteville',
    aliases: ['bridgestone', 'bridgestone plant', 'bridgestone graniteville'],
  },
  {
    id: 'aiken-regional-medical',
    name: 'Aiken Regional Medical Center',
    lng: -81.761958,
    lat: 33.571164,
    area: 'Aiken',
    aliases: [
      'hospital',
      'the hospital',
      'aiken regional',
      'aiken regional medical',
      'aiken regional medical center',
      'aiken regional medical centers',
      'medical center',
      'armc',
    ],
  },
]

export function matchCuratedNamedPlace(query: string): Amenity | null {
  const q = query.toLowerCase().trim()
  if (q.length < 3) return null
  const all: Amenity[] = [
    ...LOCAL_NAMED_PLACES,
    ...playgrounds,
    ...schools,
    ...groceryStores,
  ]
  const exact = all.find((item) => item.name.toLowerCase() === q)
  if (exact) return exact
  const alias = LOCAL_NAMED_PLACES.find((item) =>
    item.aliases.some((a) => {
      if (q === a) return true
      if (a.length >= 5 && q.includes(a)) return true
      return false
    })
  )
  if (alias) return alias
  const partial = all.filter(
    (item) =>
      item.name.toLowerCase().includes(q) || q.includes(item.name.toLowerCase())
  )
  if (partial.length === 1) return partial[0]
  return null
}

export function pointInAikenBbox(lng: number, lat: number): boolean {
  const [minLng, minLat, maxLng, maxLat] = AIKEN_GEOCODE_BBOX
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
}

export async function geocodeNamedPlace(opts: {
  query: string
  proximity?: LatLng | null
  accessToken: string
  fetchImpl?: typeof fetch
}): Promise<NamedPlaceHit | null> {
  if (!opts.accessToken || !opts.query.trim()) return null
  const proximity = opts.proximity ?? AIKEN_GEOCODE_CENTER
  const fetchImpl = opts.fetchImpl ?? fetch
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(opts.query.trim())}.json` +
    `?proximity=${proximity.lng},${proximity.lat}` +
    `&bbox=${AIKEN_GEOCODE_BBOX.join(',')}` +
    `&limit=5&types=poi,address&country=US` +
    `&access_token=${encodeURIComponent(opts.accessToken)}`

  try {
    const res = await fetchImpl(url)
    if (!res.ok) return null
    const json = (await res.json()) as GeocodeResponse
    const feature = json.features?.find((item) => {
      const types = item.place_type ?? []
      if (types.some((t) => COARSE_PLACE_TYPES.has(t))) return false
      const center = item.center
      if (!center || center.length < 2) return false
      const [lng, lat] = center
      return Number.isFinite(lng) && Number.isFinite(lat) && pointInAikenBbox(lng, lat)
    })
    const center = feature?.center
    if (!feature || !center || center.length < 2) return null
    const [lng, lat] = center
    const name = (feature.text || feature.place_name || opts.query).trim()
    return {
      name,
      lng,
      lat,
      source: 'geocode',
      placeName: feature.place_name?.trim() || name,
    }
  } catch {
    return null
  }
}

export async function resolveNamedPlace(opts: {
  query: string
  proximity?: LatLng | null
  accessToken: string
  fetchImpl?: typeof fetch
}): Promise<NamedPlaceHit | null> {
  const curated = matchCuratedNamedPlace(opts.query)
  if (curated) {
    return {
      name: curated.name,
      lng: curated.lng,
      lat: curated.lat,
      source: 'curated',
      placeName: curated.name,
    }
  }
  return geocodeNamedPlace(opts)
}

export function formatNamedPlaceBlock(hit: NamedPlaceHit): string {
  const source =
    hit.source === 'curated'
      ? 'curated local amenity list'
      : 'Mapbox geocode, biased to the Aiken coverage area'
  return [
    'NAMED PLACE LOOKUP (authoritative for this turn — do not invent a different destination):',
    `Matched: ${hit.name}. Source: ${source}.`,
    hit.placeName !== hit.name ? `Full place label: ${hit.placeName}.` : '',
    'If MAPBOX ROUTE TIMES follow, those minutes are the ones to speak.',
    'This is a specific facility or address, not the city of Aiken. Never say you matched the general Aiken area.',
    'If this might be the wrong match, say you used the closest place near Aiken and ask them to confirm a fuller name. Do not browse the web.',
  ]
    .filter(Boolean)
    .join('\n')
}
