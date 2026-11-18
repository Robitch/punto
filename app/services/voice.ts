import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { isNativePlatform } from './platform'

/**
 * Speaks score announcements. Only the text is produced by the domain
 * (`domain/score/announce.ts`); this service only says it.
 *
 * Android: native text-to-speech (@capacitor-community/text-to-speech).
 * Browser: Web Speech API.
 */
export interface VoiceService {
  readonly available: boolean
  /** Speaks `text`, interrupting any announcement still in progress. */
  speak(text: string): void
  cancel(): void
}

const LANG = 'fr-FR'
const RATE = 1.05

function createNativeVoice(): VoiceService {
  TextToSpeech.isLanguageSupported({ lang: LANG })
    .then(({ supported }) => {
      if (!supported) console.warn(`[voice] ${LANG} is not installed in the Android text-to-speech engine`)
    })
    .catch((error: unknown) => console.warn('[voice] language check failed', error))

  return {
    available: true,
    speak(text) {
      if (!text) return
      // The default queue strategy (Flush) interrupts the announcement in progress.
      TextToSpeech.speak({ text, lang: LANG, rate: RATE }).catch((error: unknown) =>
        console.warn('[voice] speak failed', error),
      )
    },
    cancel() {
      TextToSpeech.stop().catch(() => {})
    },
  }
}

function createWebSpeechVoice(): VoiceService {
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null
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
      utterance.rate = RATE
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
  if (!instance) {
    if (typeof window === 'undefined') instance = silentVoice
    else instance = isNativePlatform() ? createNativeVoice() : createWebSpeechVoice()
  }
  return instance
}
