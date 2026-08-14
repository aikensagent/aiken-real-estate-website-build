import { createServerFn } from '@tanstack/react-start'
import { rouPersonaRouter } from '../../lib/rou/live'
import { assertNodeARpc } from '../../lib/rou/perimeter'

/**
 * Node A public listing pipeline.
 * Bound to get_listings_with_coords plus listing office names. Memory RPCs are rejected
 * at the perimeter before any network call.
 */
export const getPublicListings = createServerFn({ method: 'GET' }).handler(
  async () => {
    assertNodeARpc('get_listings_with_coords')
    return rouPersonaRouter.interface.loadPublicListings()
  }
)
