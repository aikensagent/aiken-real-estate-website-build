import { beforeEach, describe, expect, it } from 'vitest'
import {
  ROU_CARD_INTRO_STORAGE_KEY,
  hasSeenRouCardIntro,
  markRouCardIntroSeen,
} from './card-intro'

function installLocalStorage() {
  const store = new Map<string, string>()
  const localStorage = {
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
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorage,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage },
    configurable: true,
  })
  return localStorage
}

describe('rou card intro preference', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  it('is unseen until marked', () => {
    expect(hasSeenRouCardIntro()).toBe(false)
    markRouCardIntroSeen()
    expect(hasSeenRouCardIntro()).toBe(true)
    expect(localStorage.getItem(ROU_CARD_INTRO_STORAGE_KEY)).toBe('1')
  })
})
