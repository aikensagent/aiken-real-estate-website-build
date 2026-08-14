import type { ListingSummary } from '../listings-context'
import {
  mergeListingLivingAreas,
  mergeListingOfficeNames,
  parseListingLivingAreaRows,
  parseListingOfficeRows,
} from '../listing-facts'
import { contextMatrix } from '../context-matrix'
import { assertNodeARpc } from './perimeter'
import {
  clearTransientMapState,
  hydrateTransientMapState,
  persistTransientMapState,
  safeDefaultTransientMapState,
} from './transient-map-state'
import type { TransientMapState } from './transient-map-state'

export type InterfaceRou = {
  id: 'rou_interface'
  state: 'stateless_session'
  hydrateMapState: () => TransientMapState
  persistMapState: (state: TransientMapState) => boolean
  resetMapState: () => TransientMapState
  loadPublicListings: () => Promise<ListingSummary[]>
  loadNearbyListings: (
    lat: number,
    lng: number,
    radiusMeters?: number
  ) => Promise<ListingSummary[]>
}

export type RpcCaller = (
  name: string,
  args?: Record<string, unknown>
) => Promise<{ data: unknown; error: { message: string } | null }>

function asListings(data: unknown): ListingSummary[] {
  return Array.isArray(data) ? (data as ListingSummary[]) : []
}

/**
 * Node A — Futuristic Interface Rou.
 * Session-scoped map state plus the public PostGIS listing pipeline.
 * This module has no import path to supabase or memory RPCs.
 */
export function createInterfaceRou(rpc: RpcCaller): InterfaceRou {
  const defaultRadius = contextMatrix.spatial.lookups.default_radius_meters

  return {
    id: 'rou_interface',
    state: 'stateless_session',

    hydrateMapState: hydrateTransientMapState,
    persistMapState: persistTransientMapState,
    resetMapState() {
      clearTransientMapState()
      return safeDefaultTransientMapState()
    },

    async loadPublicListings() {
      assertNodeARpc('get_listings_with_coords')
      try {
        const { data, error } = await rpc('get_listings_with_coords')
        if (error) return []
        const listings = asListings(data)
        assertNodeARpc('get_listing_office_names')
        try {
          const offices = await rpc('get_listing_office_names')
          const withOffices =
            offices.error || !offices.data
              ? listings
              : mergeListingOfficeNames(
                  listings,
                  parseListingOfficeRows(offices.data)
                )
          assertNodeARpc('get_listing_living_areas')
          try {
            const areas = await rpc('get_listing_living_areas')
            if (areas.error || !areas.data) return withOffices
            return mergeListingLivingAreas(
              withOffices,
              parseListingLivingAreaRows(areas.data)
            )
          } catch {
            return withOffices
          }
        } catch {
          return listings
        }
      } catch {
        return []
      }
    },

    async loadNearbyListings(lat, lng, radiusMeters = defaultRadius) {
      assertNodeARpc('get_nearby_listings')
      try {
        const { data, error } = await rpc('get_nearby_listings', {
          lat,
          lng,
          radius_meters: Math.round(radiusMeters),
        })
        if (error) return []
        return asListings(data)
      } catch {
        return []
      }
    },
  }
}
