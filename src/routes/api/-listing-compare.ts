import { createServerFn } from '@tanstack/react-start'
import { parseCompareIds } from '../../lib/listing-compare'
import { loadListingCompare } from '../../lib/listings-context'

type ListingCompareRequest = {
  listingIds: string[]
}

/**
 * Public side-by-side facts for up to four homes.
 * Spark token stays on the server. Does not call memory RPCs.
 */
export const getListingCompare = createServerFn({ method: 'POST' })
  .validator((data: ListingCompareRequest) => ({
    listingIds: parseCompareIds(data?.listingIds),
  }))
  .handler(async ({ data }) => {
    return loadListingCompare(data.listingIds)
  })
