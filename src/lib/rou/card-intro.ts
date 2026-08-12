/**
 * One-time Rou intro when a visitor first opens a property card.
 * localStorage so dismiss sticks across sessions (not a per-tab nag).
 */

export const ROU_CARD_INTRO_STORAGE_KEY =
  'searchaikenhomes:rou:card-intro:v3' as const

export function hasSeenRouCardIntro(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(ROU_CARD_INTRO_STORAGE_KEY) === '1'
  } catch {
    return true
  }
}

export function markRouCardIntroSeen(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ROU_CARD_INTRO_STORAGE_KEY, '1')
  } catch {
    // Private mode / blocked storage — dialog may reappear; acceptable.
  }
}
