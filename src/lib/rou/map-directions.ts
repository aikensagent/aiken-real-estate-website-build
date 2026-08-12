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

export type RouteLineGeometry = {
  type: 'LineString'
  coordinates: [number, number][]
}

export type AmenityRouteOverlay = {
  /** Default draw path: driving if present, otherwise walking. */
  geometry: RouteLineGeometry
  driveGeometry: RouteLineGeometry | null
  walkGeometry: RouteLineGeometry | null
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

/** Walk path, walk icon, and spoken walk time are omitted above this. */
export const WALK_DISPLAY_MAX_MINUTES = 60

export function isWalkDisplayable(walkMinutes: number | null): boolean {
  return walkMinutes != null && walkMinutes <= WALK_DISPLAY_MAX_MINUTES
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
    driveGeometry: driving?.geometry ?? null,
    walkGeometry: walking?.geometry ?? null,
    origin: [opts.from.lng, opts.from.lat],
    destination: [opts.to.lng, opts.to.lat],
    destinationLabel: opts.destinationLabel,
    driveMinutes: driving ? minutesFromSeconds(driving.durationSeconds) : null,
    walkMinutes: walking ? minutesFromSeconds(walking.durationSeconds) : null,
    hazardNote: opts.hazardNote?.trim() || null,
  }
}

export function geometryForMode(
  overlay: AmenityRouteOverlay,
  mode: RouteProfile
): RouteLineGeometry {
  if (mode === 'walking') {
    return overlay.walkGeometry ?? overlay.geometry
  }
  return overlay.driveGeometry ?? overlay.geometry
}

/** Point at `fraction` (0–1) along a LineString, by coordinate-length. */
export function pointAlongLine(
  coordinates: [number, number][],
  fraction: number
): [number, number] | null {
  if (coordinates.length === 0) return null
  if (coordinates.length === 1) return coordinates[0]
  const t = Math.min(1, Math.max(0, fraction))
  const lengths: number[] = []
  let total = 0
  for (let i = 1; i < coordinates.length; i += 1) {
    const [lng0, lat0] = coordinates[i - 1]
    const [lng1, lat1] = coordinates[i]
    const d = Math.hypot(lng1 - lng0, lat1 - lat0)
    lengths.push(d)
    total += d
  }
  if (total === 0) return coordinates[0]
  let remaining = total * t
  for (let i = 1; i < coordinates.length; i += 1) {
    const seg = lengths[i - 1]
    if (remaining <= seg) {
      const r = seg === 0 ? 0 : remaining / seg
      const [lng0, lat0] = coordinates[i - 1]
      const [lng1, lat1] = coordinates[i]
      return [lng0 + (lng1 - lng0) * r, lat0 + (lat1 - lat0) * r]
    }
    remaining -= seg
  }
  return coordinates[coordinates.length - 1]
}

export function formatRoutedTimesBlock(overlay: {
  destinationLabel: string
  driveMinutes: number | null
  walkMinutes: number | null
  hazardNote: string | null
}): string {
  const drive =
    overlay.driveMinutes != null
      ? `~${overlay.driveMinutes} min drive`
      : 'drive time unavailable'
  const walk =
    isWalkDisplayable(overlay.walkMinutes)
      ? `~${overlay.walkMinutes} min walk`
      : 'Do not mention a walk time. Walking is over 60 minutes or unavailable — speak drive only.'
  const hazard = overlay.hazardNote
    ? ` Obvious road on the way: ${overlay.hazardNote}. Mention it only if it is an interstate or a major multi-lane road.`
    : ''
  return [
    'MAPBOX ROUTE TIMES (authoritative for this turn — prefer these over straight-line estimates):',
    `Closest amenity: ${overlay.destinationLabel}. ${drive}. ${walk}.${hazard}`,
    'Say "about" / "roughly". Do not quote the straight-line minutes when these Mapbox times are present.',
  ].join('\n')
}
