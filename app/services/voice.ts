/**
 * Speaks score announcements. Only the text is produced by the domain
 * (`domain/score/announce.ts`); this service only says it.
 *
 * Browser: Web Speech API. Android: @capacitor-community/text-to-speech (later step).
 */
export interface VoiceService {
  readonly available: boolean
  /** Speaks `text`, interrupting any announcement still in progress. */
  speak(text: string): void
  cancel(): void
}

const LANG = 'fr-FR'

function createWebSpeechVoice(): VoiceService {
  const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
  let frenchVoice: SpeechSynthesisVoice | null = null

  function pickVoice(): void {
    if (!synth) return
    const voices = synth.getVoices()
    frenchVoice =
      voices.find((v) => v.lang === LANG && v.localService) ??
      voices.find((v) => v.lang === LANG) ??
      voices.find((v) => v.lang.toLowerCase().startsWith('fr')) ??
      null
  }

  if (synth) {
    pickVoice()
    synth.addEventListener('voiceschanged', pickVoice)
  }

  return {
    available: synth !== null,
    speak(text) {
      if (!synth || !text) return
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = LANG
      if (frenchVoice) utterance.voice = frenchVoice
      utterance.rate = 1.05
      synth.speak(utterance)
    },
    cancel() {
      synth?.cancel()
    },
  }
}

const silentVoice: VoiceService = {
  available: false,
  speak() {},
  cancel() {},
}

let instance: VoiceService | null = null

/** The voice implementation is chosen here, once. */
export function getVoice(): VoiceService {
  instance ??= typeof window === 'undefined' ? silentVoice : createWebSpeechVoice()
  return instance
}
