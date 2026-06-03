let audioContext: AudioContext | null = null

const getAudioContext = () => {
  if (typeof window === 'undefined') return null

  const AudioContextConstructor =
    window.AudioContext ||
    (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextConstructor) return null

  audioContext ||= new AudioContextConstructor()
  return audioContext
}

export const playAiMessageSound = () => {
  const context = getAudioContext()
  if (!context) return

  const play = () => {
    const now = context.currentTime
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.018)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)
    gain.connect(context.destination)

    const firstTone = context.createOscillator()
    firstTone.type = 'sine'
    firstTone.frequency.setValueAtTime(660, now)
    firstTone.connect(gain)
    firstTone.start(now)
    firstTone.stop(now + 0.18)

    const secondTone = context.createOscillator()
    secondTone.type = 'sine'
    secondTone.frequency.setValueAtTime(880, now + 0.11)
    secondTone.connect(gain)
    secondTone.start(now + 0.11)
    secondTone.stop(now + 0.32)
  }

  if (context.state === 'suspended') {
    void context.resume().then(play).catch(() => undefined)
    return
  }

  play()
}
