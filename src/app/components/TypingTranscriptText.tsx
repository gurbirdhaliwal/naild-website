import React, { useEffect, useRef, useState } from 'react'

interface TypingTranscriptTextProps {
  text: string
  animate: boolean
  onComplete?: () => void
  onProgress?: () => void
}

const TYPING_INTERVAL_MS = 12
const CHARS_PER_TICK = 4

const TypingTranscriptText: React.FC<TypingTranscriptTextProps> = ({
  text,
  animate,
  onComplete,
  onProgress,
}) => {
  const [visibleLength, setVisibleLength] = useState(text.length)
  const onCompleteRef = useRef(onComplete)
  const onProgressRef = useRef(onProgress)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])

  useEffect(() => {
    if (!animate) {
      setVisibleLength(text.length)
      return
    }

    setVisibleLength(0)

    if (!text) {
      onCompleteRef.current?.()
      return
    }

    const intervalId = window.setInterval(() => {
      setVisibleLength((currentLength) => {
        const nextLength = Math.min(currentLength + CHARS_PER_TICK, text.length)
        onProgressRef.current?.()

        if (nextLength >= text.length) {
          window.clearInterval(intervalId)
          onCompleteRef.current?.()
        }

        return nextLength
      })
    }, TYPING_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [animate, text])

  return <>{text.slice(0, visibleLength)}</>
}

export default TypingTranscriptText
