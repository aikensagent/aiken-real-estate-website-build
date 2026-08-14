export const ROU_CHAT_STORAGE_KEY =
  'searchaikenhomes:rou:transient:chat:v1' as const

export type TransientChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type TransientChatState = {
  version: 1
  messages: TransientChatMessage[]
  announcedOrigin: string | null
  panelsOpen: boolean
}

export function listingThreadKey(origin?: {
  listingId?: string
  lng?: number | null
  lat?: number | null
} | null): string {
  const id = typeof origin?.listingId === 'string' ? origin.listingId.trim() : ''
  if (id) return `listing:${id}`
  if (
    origin &&
    typeof origin.lng === 'number' &&
    Number.isFinite(origin.lng) &&
    typeof origin.lat === 'number' &&
    Number.isFinite(origin.lat)
  ) {
    return `pin:${origin.lng},${origin.lat}`
  }
  return ''
}

const MAX_MESSAGES = 40
const MAX_CONTENT = 2000

function sessionStore(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function clipMessage(row: TransientChatMessage): TransientChatMessage | null {
  if (row.role !== 'user' && row.role !== 'assistant') return null
  const content = row.content.trim().slice(0, MAX_CONTENT)
  if (!content) return null
  return { role: row.role, content }
}

export function emptyTransientChat(): TransientChatState {
  return { version: 1, messages: [], announcedOrigin: null, panelsOpen: true }
}

export function hydrateTransientChat(): TransientChatState {
  const fallback = emptyTransientChat()
  const store = sessionStore()
  if (!store) return fallback
  const raw = store.getItem(ROU_CHAT_STORAGE_KEY)
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as Partial<TransientChatState>
    if (parsed.version !== 1 || !Array.isArray(parsed.messages)) return fallback
    const messages = parsed.messages
      .map((row) =>
        row && typeof row === 'object'
          ? clipMessage(row as TransientChatMessage)
          : null
      )
      .filter((row): row is TransientChatMessage => Boolean(row))
      .slice(-MAX_MESSAGES)
    const announcedOrigin =
      typeof parsed.announcedOrigin === 'string' && parsed.announcedOrigin.trim()
        ? parsed.announcedOrigin.trim().slice(0, 240)
        : null
    return {
      version: 1,
      messages,
      announcedOrigin,
      panelsOpen: parsed.panelsOpen !== false,
    }
  } catch {
    return fallback
  }
}

export function persistTransientChat(state: TransientChatState): boolean {
  const store = sessionStore()
  if (!store) return false
  const messages = state.messages
    .map(clipMessage)
    .filter((row): row is TransientChatMessage => Boolean(row))
    .slice(-MAX_MESSAGES)
  try {
    store.setItem(
      ROU_CHAT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        messages,
        announcedOrigin: state.announcedOrigin,
        panelsOpen: state.panelsOpen !== false,
      } satisfies TransientChatState)
    )
    return true
  } catch {
    return false
  }
}
