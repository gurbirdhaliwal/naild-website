import type { VoicePersona } from '../lib/voicePersonasConfig'

const VOICE_LOAD_TIMEOUT_MS = 700
const MAX_SPEECH_TIMEOUT_MS = 60000

const getSpeechSynthesis = () => {
  if (typeof window === 'undefined') return null
  return window.speechSynthesis ?? null
}

const loadVoices = async (): Promise<SpeechSynthesisVoice[]> => {
  const synthesis = getSpeechSynthesis()
  if (!synthesis) return []

  const availableVoices = synthesis.getVoices()
  if (availableVoices.length > 0) return availableVoices

  const activeSynthesis = synthesis
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      activeSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
      resolve(activeSynthesis.getVoices())
    }, VOICE_LOAD_TIMEOUT_MS)

    function handleVoicesChanged() {
      window.clearTimeout(timeoutId)
      activeSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
      resolve(activeSynthesis.getVoices())
    }

    activeSynthesis.addEventListener('voiceschanged', handleVoicesChanged)
  })
}

const selectVoice = (voices: SpeechSynthesisVoice[], persona: VoicePersona) => {
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'))
  const preferredVoices = englishVoices.length > 0 ? englishVoices : voices

  for (const hint of persona.browserVoiceHints) {
    const normalizedHint = hint.toLowerCase()
    const match = preferredVoices.find((voice) => voice.name.toLowerCase().includes(normalizedHint))
    if (match) return match
  }

  return preferredVoices[0] ?? null
}

const getSpeechTimeoutMs = (text: string) =>
  Math.min(MAX_SPEECH_TIMEOUT_MS, Math.max(4500, text.length * 85))

export const cancelActiveSpeech = () => {
  const synthesis = getSpeechSynthesis()
  synthesis?.cancel()
}

export const speakWithVoicePersona = async (text: string, persona: VoicePersona): Promise<void> => {
  const synthesis = getSpeechSynthesis()
  const cleanText = text.replace(/\s+/g, ' ').trim()

  if (!synthesis || !cleanText) return

  const voices = await loadVoices()
  const utterance = new SpeechSynthesisUtterance(cleanText)
  const selectedVoice = selectVoice(voices, persona)

  if (selectedVoice) {
    utterance.voice = selectedVoice
    utterance.lang = selectedVoice.lang
  } else {
    utterance.lang = 'en-US'
  }

  utterance.rate = persona.rate
  utterance.pitch = persona.pitch
  utterance.volume = persona.volume

  return new Promise((resolve) => {
    let settled = false
    let timeoutId: number | null = null

    const settle = () => {
      if (settled) return
      settled = true
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
      utterance.onend = null
      utterance.onerror = null
      resolve()
    }

    timeoutId = window.setTimeout(settle, getSpeechTimeoutMs(cleanText))

    utterance.onend = settle
    utterance.onerror = settle

    synthesis.cancel()
    synthesis.speak(utterance)

    window.setTimeout(() => {
      if (synthesis.paused) {
        synthesis.resume()
      }
    }, 250)
  })
}
