import { describe, expect, it, beforeEach } from 'vitest'
import {
  ROU_CHAT_STORAGE_KEY,
  hydrateTransientChat,
  listingThreadKey,
  persistTransientChat,
} from './transient-chat-state'

function installSessionStorage() {
  const store = new Map<string, string>()
  const sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: () => null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: sessionStorage,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'window', {
    value: { sessionStorage },
    configurable: true,
  })
  return sessionStorage
}

describe('transient chat history', () => {
  beforeEach(() => {
    installSessionStorage()
  })

  it('round-trips messages in sessionStorage and drops empty rows', () => {
    persistTransientChat({
      version: 1,
      messages: [
        { role: 'user', content: 'How old is this home?' },
        { role: 'assistant', content: '  ' },
        { role: 'assistant', content: 'Year built is 1998.' },
      ],
      announcedOrigin: 'listing:abc',
      panelsOpen: false,
    })
    const next = hydrateTransientChat()
    expect(next.messages).toEqual([
      { role: 'user', content: 'How old is this home?' },
      { role: 'assistant', content: 'Year built is 1998.' },
    ])
    expect(next.announcedOrigin).toBe('listing:abc')
    expect(next.panelsOpen).toBe(false)
    expect(globalThis.sessionStorage.getItem(ROU_CHAT_STORAGE_KEY)).toContain(
      'How old is this home?'
    )
  })

  it('falls back when the payload is malformed', () => {
    globalThis.sessionStorage.setItem(ROU_CHAT_STORAGE_KEY, '{nope')
    expect(hydrateTransientChat()).toEqual({
      version: 1,
      messages: [],
      announcedOrigin: null,
      panelsOpen: true,
    })
  })

  it('keys a home by listing id and treats a new id as a different thread', () => {
    expect(
      listingThreadKey({ listingId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    ).toBe('listing:a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    expect(
      listingThreadKey({ listingId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    ).not.toBe(listingThreadKey({ listingId: 'b1b2c3d4-e5f6-7890-abcd-ef1234567890' }))
    expect(listingThreadKey(null)).toBe('')
  })
})
