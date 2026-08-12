/**
 * Rou spoken voice.
 *
 * Playback is xAI TTS (Carina) via the server fn in `-tts.ts`.
 * Browser speechSynthesis is never used for replies — it is the robot male
 * voice Nick rejected. Mute is tab-scoped sessionStorage.
 * Mic recognition stays on the Web Speech API (listen only).
 */

export const GHOLI_VOICE_MUTE_STORAGE_KEY =
  'searchaikenhomes:gholi:voice:speak:v1' as const

let playGeneration = 0
let currentAudio: HTMLAudioElement | null = null
let currentObjectUrl: string | null = null

export function readSpeakRepliesPreference(defaultValue = true): boolean {
  if (typeof window === 'undefined') return defaultValue
  try {
    const raw = sessionStorage.getItem(GHOLI_VOICE_MUTE_STORAGE_KEY)
    if (raw === '0') return false
    if (raw === '1') return true
  } catch {
    // Private mode / blocked storage — keep default
  }
  return defaultValue
}

export function persistSpeakRepliesPreference(speak: boolean): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(GHOLI_VOICE_MUTE_STORAGE_KEY, speak ? '1' : '0')
  } catch {
    // ignore
  }
}

function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.onended = null
    currentAudio.onerror = null
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }
}

export function cancelGholiSpeech(): void {
  playGeneration += 1
  stopCurrentAudio()
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

function base64ToObjectUrl(base64: string, mime: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: mime })
  return URL.createObjectURL(blob)
}

/**
 * Speak a Rou reply through xAI TTS.
 * Returns true if playback started. On failure: captions only — never the
 * browser robot voice.
 */
export async function speakGholiReply(
  text: string,
  opts: { enabled: boolean; onEnded?: () => void } = { enabled: true }
): Promise<boolean> {
  if (!opts.enabled || !text.trim()) return false
  if (typeof window === 'undefined') return false

  stopCurrentAudio()
  const gen = ++playGeneration

  try {
    const { synthesizeSpeech } = await import('../../routes/api/-tts')
    const result = await synthesizeSpeech({ data: { text: text.trim() } })
    if (gen !== playGeneration) return false
    if (!result.ok) return false

    const url = base64ToObjectUrl(result.audioBase64, result.mime)
    currentObjectUrl = url
    const audio = new Audio(url)
    currentAudio = audio
    audio.onended = () => {
      if (gen !== playGeneration) return
      stopCurrentAudio()
      opts.onEnded?.()
    }
    audio.onerror = () => {
      if (gen !== playGeneration) return
      stopCurrentAudio()
      opts.onEnded?.()
    }
    await audio.play()
    if (gen !== playGeneration) {
      stopCurrentAudio()
      return false
    }
    return true
  } catch {
    if (gen === playGeneration) stopCurrentAudio()
    return false
  }
}

export function getBrowserSpeechRecognition(): SpeechRecognition | null {
  if (typeof window === 'undefined') return null
  const SR =
    (window as unknown as { SpeechRecognition?: typeof SpeechRecognition })
      .SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition })
      .webkitSpeechRecognition
  if (!SR) return null
  return new SR()
}
