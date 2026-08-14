import { createServerFn } from '@tanstack/react-start'
import { loadListingDetail } from '../../lib/listings-context'

type ListingDetailRequest = {
  listingId: string
}

/**
 * Public listing detail. Spark token stays on the server.
 * Does not call memory RPCs.
 */
export const getListingDetail = createServerFn({ method: 'GET' })
  .validator((data: ListingDetailRequest) => data)
  .handler(async ({ data }) => {
    return loadListingDetail(data.listingId)
  })
