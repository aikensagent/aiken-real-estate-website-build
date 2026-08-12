/**
 * Browser voice foundation for Gholi (ChatWidget).
 *
 * Scope: Web Speech API only (mic + speechSynthesis).
 * Twilio / server TTS is a later Phase 3 slice — do not import here.
 * Mute preference is tab-scoped sessionStorage (not localStorage, not DB).
 */

export const GHOLI_VOICE_MUTE_STORAGE_KEY =
  'searchaikenhomes:gholi:voice:speak:v1' as const

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

export function cancelGholiSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
}

export function speakGholiReply(
  text: string,
  opts: { enabled: boolean; lang?: string } = { enabled: true }
): void {
  if (!opts.enabled || !text.trim()) return
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text.trim())
  utterance.rate = 1
  utterance.pitch = 1
  utterance.lang = opts.lang ?? 'en-US'
  window.speechSynthesis.speak(utterance)
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
