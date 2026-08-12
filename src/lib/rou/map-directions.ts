/**
 * Mapbox Directions helper for Rou public map overlays.
 * Client-side only — uses VITE_MAPBOX_TOKEN (same as Map.tsx).
 */

export type LatLng = { lng: number; lat: number }

export type RouteProfile = 'driving' | 'walking'

export type MapboxRouteResult = {
  profile: RouteProfile
  distanceMeters: number
  durationSeconds: number
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
}

export type AmenityRouteOverlay = {
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  origin: [number, number]
  destination: [number, number]
  destinationLabel: string
  driveMinutes: number | null
  walkMinutes: number | null
  /** Obvious hazard note only (interstate / multi-lane), if known from curated data. */
  hazardNote: string | null
}

type DirectionsApiResponse = {
  code?: string
  message?: string
  routes?: Array<{
    distance: number
    duration: number
    geometry?: {
      type: 'LineString'
      coordinates: [number, number][]
    }
  }>
}

export function minutesFromSeconds(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60))
}

/**
 * Fetch a single Mapbox Directions profile between two points.
 * Returns null on network/API failure — callers keep text distances as fallback.
 */
export async function fetchMapboxRoute(
  from: LatLng,
  to: LatLng,
  profile: RouteProfile,
  accessToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<MapboxRouteResult | null> {
  if (!accessToken) return null

  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}` +
    `?geometries=geojson&overview=full&access_token=${encodeURIComponent(accessToken)}`

  try {
    const res = await fetchImpl(url)
    if (!res.ok) return null
    const json = (await res.json()) as DirectionsApiResponse
    const route = json.routes?.[0]
    if (!route?.geometry?.coordinates?.length) return null
    return {
      profile,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      geometry: {
        type: 'LineString',
        coordinates: route.geometry.coordinates,
      },
    }
  } catch {
    return null
  }
}

/**
 * Prefer drawing the driving geometry (usually the practical route).
 * Still collect walking minutes when Mapbox returns them.
 */
export async function buildAmenityRouteOverlay(opts: {
  from: LatLng
  to: LatLng
  destinationLabel: string
  accessToken: string
  hazardNote?: string | null
  fetchImpl?: typeof fetch
}): Promise<AmenityRouteOverlay | null> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const [driving, walking] = await Promise.all([
    fetchMapboxRoute(opts.from, opts.to, 'driving', opts.accessToken, fetchImpl),
    fetchMapboxRoute(opts.from, opts.to, 'walking', opts.accessToken, fetchImpl),
  ])

  const geometry = driving?.geometry ?? walking?.geometry
  if (!geometry) return null

  return {
    geometry,
    origin: [opts.from.lng, opts.from.lat],
    destination: [opts.to.lng, opts.to.lat],
    destinationLabel: opts.destinationLabel,
    driveMinutes: driving ? minutesFromSeconds(driving.durationSeconds) : null,
    walkMinutes: walking ? minutesFromSeconds(walking.durationSeconds) : null,
    hazardNote: opts.hazardNote?.trim() || null,
  }
}
