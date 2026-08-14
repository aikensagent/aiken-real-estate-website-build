/**
 * Public Rou visitor key — chat and listing thumbs share this.
 * Map camera state stays on sessionStorage (transient-map-state).
 * After sign-in, adopt the claimed account key so thumbs follow the buyer.
 */

export const ROU_VISITOR_STORAGE_KEY = 'rou-session-key' as const

export function getRouVisitorKey(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    let key = window.localStorage.getItem(ROU_VISITOR_STORAGE_KEY)
    if (!key) {
      key =
        crypto.randomUUID?.() ??
        `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`
      window.localStorage.setItem(ROU_VISITOR_STORAGE_KEY, key)
    }
    return key
  } catch {
    return `rou_ephemeral_${Date.now()}`
  }
}

export function adoptRouVisitorKey(next: string): string {
  const key = next.trim()
  if (!key || typeof window === 'undefined') return key
  try {
    window.localStorage.setItem(ROU_VISITOR_STORAGE_KEY, key)
  } catch {
    return key
  }
  return key
}
