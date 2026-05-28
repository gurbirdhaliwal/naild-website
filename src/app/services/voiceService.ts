import type { VoicePersona } from '../lib/voicePersonasConfig'

const VOICE_LOAD_TIMEOUT_MS = 700
const MAX_SPEECH_TIMEOUT_MS = 60000
const SPEECH_PRIME_TIMEOUT_MS = 1000
const SPEECH_RESUME_INTERVAL_MS = 4000
const MAX_UTTERANCE_LENGTH = 220

let speechPrimed = false
let speechGeneration = 0

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

const chunkSpeechText = (text: string) => {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [text]
  const chunks: string[] = []
  let currentChunk = ''

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (!trimmedSentence) continue

    if (!currentChunk) {
      currentChunk = trimmedSentence
      continue
    }

    if (`${currentChunk} ${trimmedSentence}`.length <= MAX_UTTERANCE_LENGTH) {
      currentChunk = `${currentChunk} ${trimmedSentence}`
    } else {
      chunks.push(currentChunk)
      currentChunk = trimmedSentence
    }
  }

  if (currentChunk) chunks.push(currentChunk)

  return chunks.flatMap((chunk) => {
    if (chunk.length <= MAX_UTTERANCE_LENGTH) return [chunk]

    const words = chunk.split(/\s+/)
    const wordChunks: string[] = []
    let wordChunk = ''

    for (const word of words) {
      if (!wordChunk) {
        wordChunk = word
      } else if (`${wordChunk} ${word}`.length <= MAX_UTTERANCE_LENGTH) {
        wordChunk = `${wordChunk} ${word}`
      } else {
        wordChunks.push(wordChunk)
        wordChunk = word
      }
    }

    if (wordChunk) wordChunks.push(wordChunk)
    return wordChunks
  })
}

const applyPersonaToUtterance = (
  utterance: SpeechSynthesisUtterance,
  persona: VoicePersona,
  selectedVoice: SpeechSynthesisVoice | null
) => {
  if (selectedVoice) {
    utterance.voice = selectedVoice
    utterance.lang = selectedVoice.lang
  } else {
    utterance.lang = 'en-US'
  }

  utterance.rate = persona.rate
  utterance.pitch = persona.pitch
  utterance.volume = persona.volume
}

const speakUtterance = (
  synthesis: SpeechSynthesis,
  utterance: SpeechSynthesisUtterance,
  text: string,
  generation: number
) =>
  new Promise<void>((resolve) => {
    let settled = false
    let timeoutId: number | null = null
    let resumeIntervalId: number | null = null

    const settle = () => {
      if (settled) return
      settled = true
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      if (resumeIntervalId !== null) window.clearInterval(resumeIntervalId)
      utterance.onend = null
      utterance.onerror = null
      resolve()
    }

    timeoutId = window.setTimeout(settle, getSpeechTimeoutMs(text))
    resumeIntervalId = window.setInterval(() => {
      if (generation !== speechGeneration) {
        settle()
        return
      }
      if (synthesis.paused) synthesis.resume()
    }, SPEECH_RESUME_INTERVAL_MS)

    utterance.onend = settle
    utterance.onerror = settle

    if (synthesis.paused) synthesis.resume()
    synthesis.speak(utterance)

    window.setTimeout(() => {
      if (synthesis.paused) synthesis.resume()
    }, 250)
  })

export const prepareVoicePersonaPlayback = async (): Promise<void> => {
  const synthesis = getSpeechSynthesis()
  if (!synthesis || speechPrimed) return

  await loadVoices()
  if (synthesis.paused) synthesis.resume()
  if (synthesis.speaking || synthesis.pending) {
    speechPrimed = true
    return
  }

  await new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance('.')
    let settled = false
    let timeoutId: number | null = null

    const settle = () => {
      if (settled) return
      settled = true
      speechPrimed = true
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      utterance.onend = null
      utterance.onerror = null
      resolve()
    }

    utterance.volume = 0
    utterance.rate = 1
    utterance.pitch = 1
    utterance.onend = settle
    utterance.onerror = settle
    timeoutId = window.setTimeout(settle, SPEECH_PRIME_TIMEOUT_MS)
    synthesis.speak(utterance)
  })
}

export const cancelActiveSpeech = () => {
  speechGeneration += 1
  const synthesis = getSpeechSynthesis()
  synthesis?.cancel()
}

export const speakWithVoicePersona = async (text: string, persona: VoicePersona): Promise<void> => {
  const synthesis = getSpeechSynthesis()
  const cleanText = text.replace(/\s+/g, ' ').trim()

  if (!synthesis || !cleanText) return

  if (!speechPrimed) {
    await prepareVoicePersonaPlayback()
  }

  const voices = await loadVoices()
  const selectedVoice = selectVoice(voices, persona)
  const chunks = chunkSpeechText(cleanText)
  const generation = speechGeneration + 1

  speechGeneration = generation
  synthesis.cancel()
  if (synthesis.paused) synthesis.resume()

  for (const chunk of chunks) {
    if (generation !== speechGeneration) return
    const utterance = new SpeechSynthesisUtterance(chunk)
    applyPersonaToUtterance(utterance, persona, selectedVoice)
    await speakUtterance(synthesis, utterance, chunk, generation)
  }

  speechPrimed = true
}
