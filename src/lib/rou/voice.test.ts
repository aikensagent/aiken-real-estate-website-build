import { describe, expect, it, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  GHOLI_VOICE_MUTE_STORAGE_KEY,
  persistSpeakRepliesPreference,
  readSpeakRepliesPreference,
} from './voice'

const here = dirname(fileURLToPath(import.meta.url))

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

describe('Rou spoken voice', () => {
  beforeEach(() => {
    installSessionStorage()
  })

  it('persists mute preference in sessionStorage only', () => {
    expect(readSpeakRepliesPreference()).toBe(true)
    persistSpeakRepliesPreference(false)
    expect(sessionStorage.getItem(GHOLI_VOICE_MUTE_STORAGE_KEY)).toBe('0')
    expect(readSpeakRepliesPreference()).toBe(false)
    persistSpeakRepliesPreference(true)
    expect(readSpeakRepliesPreference()).toBe(true)
  })

  it('plays xAI TTS and never speaks through browser speechSynthesis', () => {
    const widget = readFileSync(
      join(here, '../../components/ChatWidget.tsx'),
      'utf8'
    )
    const voice = readFileSync(join(here, 'voice.ts'), 'utf8')
    expect(widget).toMatch(/from ['"][^'"]*rou\/voice['"]/)
    expect(widget).toMatch(/speakGholiReply/)
    expect(widget).toMatch(/cancelGholiSpeech/)
    expect(widget).toMatch(/persistSpeakRepliesPreference/)
    expect(widget).toMatch(/onToggleMute/)
    expect(widget).toMatch(/toggleMute/)
    expect(voice).toMatch(/synthesizeSpeech/)
    expect(voice).toMatch(/routes\/api\/-tts/)
    expect(voice).not.toMatch(/speechSynthesis\.speak/)
    expect(voice).not.toMatch(/SpeechSynthesisUtterance/)
    expect(voice).not.toMatch(/from ['"][^'"]*twilio/i)
    expect(voice).toMatch(/sessionStorage/)
    expect(voice).not.toMatch(/localStorage\.(get|set)Item/)
    expect(voice).not.toMatch(/from ['"][^'"]*supabase/)
  })
})
