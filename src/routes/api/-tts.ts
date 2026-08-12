import { createServerFn } from '@tanstack/react-start'

/** Public Rou TTS voice. Swap this one constant after Nick auditions. */
export const ROU_TTS_VOICE_ID = 'carina'

const TTS_MAX_CHARS = 2000

type TtsRequest = {
  text: string
}

export type TtsResult =
  | { ok: true; mime: 'audio/mpeg'; audioBase64: string }
  | { ok: false }

function redactPII(text: string): string {
  return text
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ssn]')
}

function checkFairHousing(text: string): boolean {
  const lower = text.toLowerCase()
  const blocked = [
    'race',
    'racial',
    'black neighborhood',
    'white neighborhood',
    'hispanic area',
    'asian community',
    'good schools for',
    'safe for families of',
    'demographics',
    'ethnic',
    'religion',
    'church nearby for',
    'synagogue',
    'mosque',
  ]
  return !blocked.some((term) => lower.includes(term))
}

/**
 * Server-only xAI TTS. Key never leaves the server.
 * Failure is { ok: false } — callers must not fall back to the browser robot voice.
 */
export const synthesizeSpeech = createServerFn({ method: 'POST' })
  .validator((data: TtsRequest) => data)
  .handler(async ({ data }): Promise<TtsResult> => {
    const key = process.env.GROK_API_KEY
    if (!key) return { ok: false }

    const text = redactPII(data.text ?? '').trim().slice(0, TTS_MAX_CHARS)
    if (!text) return { ok: false }
    if (!checkFairHousing(text)) return { ok: false }

    try {
      const response = await fetch('https://api.x.ai/v1/tts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice_id: ROU_TTS_VOICE_ID,
          language: 'en',
          text_normalization: true,
          output_format: {
            codec: 'mp3',
            sample_rate: 24000,
            bit_rate: 128000,
          },
        }),
      })

      if (!response.ok) {
        console.error('xAI TTS error', response.status)
        return { ok: false }
      }

      const bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.byteLength < 32) return { ok: false }

      return {
        ok: true,
        mime: 'audio/mpeg',
        audioBase64: bytes.toString('base64'),
      }
    } catch {
      return { ok: false }
    }
  })
