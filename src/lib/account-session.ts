import { claimBuyerAccount } from '../routes/api/-account-auth'
import { readAccessToken, signOutBuyer } from './auth-browser'
import { adoptRouVisitorKey, getRouVisitorKey } from './rou/rou-session'

export async function resolveBuyerAccount() {
  const accessToken = await readAccessToken()
  if (!accessToken) return { authenticated: false as const }

  const claimed = await claimBuyerAccount({
    data: {
      accessToken,
      visitorKey: getRouVisitorKey(),
    },
  })
  if (!claimed.authenticated) return { authenticated: false as const }

  adoptRouVisitorKey(claimed.sessionKey)
  return claimed
}

export async function signOutAccount() {
  await signOutBuyer()
}
