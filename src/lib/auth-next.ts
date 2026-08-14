import { isListingId } from './listing-facts'

export type AuthNext =
  | { kind: 'account' }
  | { kind: 'home' }
  | { kind: 'listing'; listingId: string }
  | { kind: 'saved'; savedId: string }

export const AUTH_NEXT_STORAGE_KEY = 'searchaikenhomes:buyer:auth-next:v1'

function sessionStore(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/** Allowlisted post-login destinations only. Never an open redirect. */
export function parseAuthNext(value: unknown): AuthNext {
  if (typeof value !== 'string') return { kind: 'account' }
  const raw = value.trim()
  if (raw === 'home' || raw === '/') return { kind: 'home' }
  if (raw === 'account' || raw === '/account') return { kind: 'account' }
  const listing = raw.match(/^(?:listing:|\/listing\/)([0-9a-f-]{36})$/i)
  if (listing && isListingId(listing[1])) {
    return { kind: 'listing', listingId: listing[1] }
  }
  const saved = raw.match(/^saved:([0-9a-f-]{36})$/i)
  if (saved && isListingId(saved[1])) {
    return { kind: 'saved', savedId: saved[1] }
  }
  return { kind: 'account' }
}

export function serializeAuthNext(next: AuthNext): string {
  switch (next.kind) {
    case 'home':
      return 'home'
    case 'listing':
      return `listing:${next.listingId}`
    case 'saved':
      return `saved:${next.savedId}`
    default:
      return 'account'
  }
}

export function authNextTarget(value: unknown): {
  to: '/' | '/account' | '/listing/$listingId'
  search?: { saved: string }
  params?: { listingId: string }
} {
  const next = parseAuthNext(value)
  if (next.kind === 'home') return { to: '/' }
  if (next.kind === 'saved') return { to: '/', search: { saved: next.savedId } }
  if (next.kind === 'listing') {
    return { to: '/listing/$listingId', params: { listingId: next.listingId } }
  }
  return { to: '/account' }
}

export function rememberAuthNext(value: unknown) {
  const token = serializeAuthNext(parseAuthNext(value))
  sessionStore()?.setItem(AUTH_NEXT_STORAGE_KEY, token)
}

export function peekAuthNext(): AuthNext | null {
  const raw = sessionStore()?.getItem(AUTH_NEXT_STORAGE_KEY)
  if (!raw) return null
  return parseAuthNext(raw)
}

export function clearAuthNext() {
  sessionStore()?.removeItem(AUTH_NEXT_STORAGE_KEY)
}

export function resolveCallbackNext(urlNext: unknown): AuthNext {
  if (typeof urlNext === 'string' && urlNext.trim()) {
    return parseAuthNext(urlNext)
  }
  return peekAuthNext() ?? { kind: 'account' }
}
