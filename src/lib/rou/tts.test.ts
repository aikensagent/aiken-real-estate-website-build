import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const tts = readFileSync(join(here, '../../routes/api/-tts.ts'), 'utf8')

describe('xAI TTS server path', () => {
  it('uses the existing Grok key, Carina, and fails closed', () => {
    expect(tts).toContain("createServerFn({ method: 'POST' })")
    expect(tts).toContain('https://api.x.ai/v1/tts')
    expect(tts).toContain('GROK_API_KEY')
    expect(tts).toContain("ROU_TTS_VOICE_ID = 'carina'")
    expect(tts).toContain('redactPII')
    expect(tts).toContain('checkFairHousing')
    expect(tts).toContain('text_normalization: true')
    expect(tts).not.toMatch(/speechSynthesis/)
  })
})
