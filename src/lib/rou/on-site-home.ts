/**
 * “I’m at a home” — in-bbox GPS to a nearby listing card.
 * Lot lines are not in this module. Out-of-bbox GPS never filters inventory.
 */

import type { Listing } from '../filterListings'
import { pointInAikenBbox } from './named-place'

export const ON_SITE_MATCH_METERS = 40
export const ON_SITE_NEAR_METERS = 150
export const ON_SITE_AREA_METERS = 400
/** ~220 m half-span so the list can follow a computed bbox (hidden map lies). */
export const ON_SITE_VIEW_SPAN = 0.0022

export type LatLng = { lng: number; lat: number }

export type OnSiteMatch =
  | { kind: 'unique'; listing: Listing; distanceM: number; nearby: Listing[] }
  | { kind: 'several'; nearby: Listing[] }
  | { kind: 'area'; nearby: Listing[] }
  | { kind: 'none' }

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  const r = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function isOnSiteInCoverage(point: LatLng): boolean {
  return pointInAikenBbox(point.lng, point.lat)
}

export function listingsNearPoint(
  listings: Listing[],
  point: LatLng,
  radiusM: number
): Array<Listing & { distanceM: number }> {
  return listings
    .filter(
      (row) =>
        row.lng != null &&
        row.lat != null &&
        Number.isFinite(row.lng) &&
        Number.isFinite(row.lat)
    )
    .map((row) => ({
      ...row,
      distanceM: distanceMeters(point, { lng: row.lng as number, lat: row.lat as number }),
    }))
    .filter((row) => row.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM || a.id.localeCompare(b.id))
}

export function classifyOnSiteMatch(
  listings: Listing[],
  point: LatLng
): OnSiteMatch {
  const near = listingsNearPoint(listings, point, ON_SITE_NEAR_METERS)
  const unique = near.filter((row) => row.distanceM <= ON_SITE_MATCH_METERS)
  if (unique.length === 1) {
    return {
      kind: 'unique',
      listing: unique[0],
      distanceM: unique[0].distanceM,
      nearby: near.slice(0, 5),
    }
  }
  if (unique.length > 1 || near.length > 1) {
    return { kind: 'several', nearby: near.slice(0, 5) }
  }
  if (near.length === 1) {
    return { kind: 'several', nearby: near }
  }
  const area = listingsNearPoint(listings, point, ON_SITE_AREA_METERS)
  if (area.length > 0) return { kind: 'area', nearby: area.slice(0, 5) }
  return { kind: 'none' }
}

export function boundsAroundPoint(point: LatLng) {
  return {
    west: point.lng - ON_SITE_VIEW_SPAN,
    south: point.lat - ON_SITE_VIEW_SPAN,
    east: point.lng + ON_SITE_VIEW_SPAN,
    north: point.lat + ON_SITE_VIEW_SPAN,
  }
}

export async function readDeviceLocation(
  geo: Pick<Geolocation, 'getCurrentPosition'> | null = typeof navigator !==
  'undefined'
    ? navigator.geolocation
    : null
): Promise<
  | { ok: true; point: LatLng }
  | { ok: false; reason: 'denied' | 'unavailable' }
> {
  if (!geo) return { ok: false, reason: 'unavailable' }
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (pos) => {
        const lng = pos.coords.longitude
        const lat = pos.coords.latitude
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
          resolve({ ok: false, reason: 'unavailable' })
          return
        }
        resolve({ ok: true, point: { lng, lat } })
      },
      (err) => {
        resolve({
          ok: false,
          reason: err.code === 1 ? 'denied' : 'unavailable',
        })
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    )
  })
}

export async function cityFromCoordinates(opts: {
  point: LatLng
  accessToken: string
  fetchImpl?: typeof fetch
}): Promise<string | null> {
  if (!opts.accessToken) return null
  const fetchImpl = opts.fetchImpl ?? fetch
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${opts.point.lng},${opts.point.lat}.json` +
    `?types=place&limit=1&access_token=${encodeURIComponent(opts.accessToken)}`
  try {
    const res = await fetchImpl(url)
    if (!res.ok) return null
    const json = (await res.json()) as {
      features?: Array<{ text?: string }>
    }
    const name = json.features?.[0]?.text?.trim()
    return name ? name.slice(0, 80) : null
  } catch {
    return null
  }
}
