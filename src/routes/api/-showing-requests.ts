import { createServerFn } from '@tanstack/react-start'
import { buyerUserClient, isAccessToken } from '../../lib/buyer-user-client'
import { isListingId } from '../../lib/listing-facts'

export const requestBuyerShowing = createServerFn({ method: 'POST' })
  .validator((data: { accessToken: string; listingId: string }) => data)
  .handler(async ({ data }) => {
    const token = data.accessToken.trim()
    if (!isAccessToken(token) || !isListingId(data.listingId)) {
      return { ok: false as const }
    }
    const client = buyerUserClient(token)
    const { data: row, error } = await client.rpc('request_buyer_showing', {
      p_listing_id: data.listingId,
    })
    if (error || !row || typeof row !== 'object') return { ok: false as const }
    const already = (row as { already?: unknown }).already === true
    return { ok: true as const, already }
  })
