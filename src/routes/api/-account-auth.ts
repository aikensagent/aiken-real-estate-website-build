import { createServerFn } from '@tanstack/react-start'
import { buyerUserClient, isAccessToken } from '../../lib/buyer-user-client'

export type BuyerAccount = {
  authenticated: true
  leadId: string
  sessionKey: string
  email: string
}

/**
 * Claim the visitor notebook to the signed-in buyer.
 * Uses the caller JWT so claim_buyer_account can read auth.uid().
 */
export const claimBuyerAccount = createServerFn({ method: 'POST' })
  .validator((data: { accessToken: string; visitorKey: string }) => data)
  .handler(async ({ data }): Promise<BuyerAccount | { authenticated: false }> => {
    const token = data.accessToken.trim()
    const visitorKey = data.visitorKey.trim()
    if (!isAccessToken(token) || !visitorKey) {
      return { authenticated: false }
    }

    const client = buyerUserClient(token)
    const { data: claimed, error } = await client.rpc('claim_buyer_account', {
      p_session_key: visitorKey,
    })
    if (error || !claimed || typeof claimed !== 'object') {
      return { authenticated: false }
    }

    const row = claimed as {
      lead_id?: unknown
      session_key?: unknown
      email?: unknown
    }
    const leadId = typeof row.lead_id === 'string' ? row.lead_id : ''
    const sessionKey =
      typeof row.session_key === 'string' ? row.session_key.trim() : ''
    const email = typeof row.email === 'string' ? row.email : ''
    if (!leadId || !sessionKey) return { authenticated: false }

    return {
      authenticated: true,
      leadId,
      sessionKey,
      email,
    }
  })
