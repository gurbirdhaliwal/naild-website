import React, { useEffect, useRef, useState } from 'react'
import {
  Camera,
  CameraOff,
  ChevronDown,
  ChevronUp,
  Loader2,
  Volume2,
  X,
} from 'lucide-react'
import CustomMicRecorder from './CustomMicRecorder'
import { AI_BASE } from '../services/api'
import { getAuthHeaders } from '../services/authToken'
import { interviewService } from '../services/interviewService'
import { Interview, Message, TechChatRecap } from '../types/Interview'
import {
  TECH_CHAT_SOFT_TURN_LIMIT,
  getTechChatPersona,
} from '../lib/techChatConfig'

interface TechChatSessionProps {
  interview: Interview
  onUpdateInterview: (interview: Interview) => void
  onStartAnother: () => void
  resolvedTheme: 'light' | 'dark'
}

const MAX_TRANSCRIPT_PREVIEW_LENGTH = 220
const MAX_RECORDING_DURATION = 120
const SESSION_STAGE_BACKGROUND_STYLES: Record<'light' | 'dark', React.CSSProperties> = {
  light: {
    backgroundImage:
      'radial-gradient(circle at top, rgba(209,250,229,0.95), rgba(255,255,255,0.98) 52%, rgba(236,253,245,0.9) 100%)',
  },
  dark: {
    backgroundImage:
      'radial-gradient(circle at top, rgba(16,185,129,0.14), rgba(7,18,14,0.98) 54%, rgba(8,27,21,0.94) 100%)',
  },
}

const normalizeStringArray = (value: unknown, limit: number) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, limit)
    : []

const normalizeRecap = (value: unknown): TechChatRecap => {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  return {
    highlights: normalizeStringArray(raw.highlights, 3),
    fuzzySpots: normalizeStringArray(raw.fuzzySpots, 2),
    topicsCovered: normalizeStringArray(raw.topicsCovered, 10),
    takeawayLine:
      typeof raw.takeawayLine === 'string' && raw.takeawayLine.trim()
        ? raw.takeawayLine.trim()
        : 'You had a useful thread here; next time, make the concrete stakes visible a little earlier.',
  }
}

const getTranscriptPreview = (transcription: string) => {
  if (transcription.length <= MAX_TRANSCRIPT_PREVIEW_LENGTH) return transcription

  const preview = transcription.slice(0, MAX_TRANSCRIPT_PREVIEW_LENGTH)
  const lastSpaceIndex = preview.lastIndexOf(' ')
  const safePreview = lastSpaceIndex > 0 ? preview.slice(0, lastSpaceIndex) : preview

  return `${safePreview.trim()}...`
}

const TechChatSession: React.FC<TechChatSessionProps> = ({
  interview,
  onUpdateInterview,
  onStartAnother,
  resolvedTheme,
}) => {
  const persona = getTechChatPersona(interview.audience)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const endRequestedRef = useRef(false)
  const [showTranscription, setShowTranscription] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [timer, setTimer] = useState(MAX_RECORDING_DURATION)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [ending, setEnding] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [expandedTranscriptIds, setExpandedTranscriptIds] = useState<string[]>([])
  const visibleMessages = interview.messages.filter((message) => !message.isThinking)
  const exchangeCount = visibleMessages.filter((message) => message.role === 'candidate').length
  const isCompleted = interview.status === 'completed'
  const recap = isCompleted ? normalizeRecap(interview.gradingResult) : null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [interview.messages])

  useEffect(() => {
    setExpandedTranscriptIds([])
    setRecordingError(null)
    setTimer(MAX_RECORDING_DURATION)
    setIsTimerRunning(false)
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [interview.id])

  useEffect(() => {
    if (!isTimerRunning || timer <= 0) {
      if (timer === 0) setIsTimerRunning(false)
      return
    }

    timerRef.current = setTimeout(() => {
      setTimer((prev) => prev - 1)
    }, 1000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isTimerRunning, timer])

  useEffect(() => {
    let activeStream: MediaStream | null = null
    const videoNode = videoRef.current

    if (!cameraOn || recap) {
      if (videoNode) videoNode.srcObject = null
      return () => undefined
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((mediaStream) => {
        activeStream = mediaStream
        if (videoNode) videoNode.srcObject = mediaStream
      })
      .catch(() => {
        if (videoNode) videoNode.srcObject = null
      })

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
      if (videoNode) videoNode.srcObject = null
    }
  }, [cameraOn, recap])

  const startTimer = () => {
    setTimer(MAX_RECORDING_DURATION)
    setIsTimerRunning(true)
  }

  const stopTimer = () => {
    setIsTimerRunning(false)
    setTimer(MAX_RECORDING_DURATION)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const updateSession = (
    messages: Message[],
    status = interview.status,
    gradingResult = interview.gradingResult
  ) => {
    onUpdateInterview({
      ...interview,
      messages,
      status,
      gradingResult,
      currentQuestionIndex: messages.filter((message) => message.role === 'candidate').length,
    })
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')

    const response = await fetch(`${AI_BASE}/transcription`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) throw new Error('Failed to process voice input.')

    const result = await response.json()
    if (result.error) throw new Error(result.error)

    return result.user_input as string
  }

  const completeSession = async (messages: Message[]) => {
    if (ending || isCompleted) return

    setEnding(true)
    setRecordingError(null)
    try {
      const response = await fetch(`${AI_BASE}/tech_chat/recap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          persona_id: persona.id,
          messages: messages
            .filter((message) => !message.isThinking)
            .map((message) => ({
              role: message.role,
              content: message.content,
            })),
          session_id: Number(interview.id),
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate Tech Chat recap (${response.status})`)
      }

      const data = normalizeRecap(await response.json())
      await interviewService.updateInterviewMessages(Number(interview.id), { messages }).catch(() => undefined)
      const saved = await interviewService.updateGradingResult(Number(interview.id), {
        gradingResult: data as unknown as Record<string, unknown>,
      })
      const converted = interviewService.convertToInterview(saved)
      converted.messages = messages
      converted.gradingResult = data as never
      converted.status = 'completed'
      onUpdateInterview(converted)
    } catch (err) {
      console.error('Failed to end Tech Chat session:', err)
      setRecordingError('Unable to wrap up this chat right now. Please try again.')
    } finally {
      setEnding(false)
    }
  }

  const handleAudioRecorded = async (audioBlob: Blob) => {
    stopTimer()
    setIsProcessing(true)
    setRecordingError(null)

    try {
      const transcript = await transcribeAudio(audioBlob)
      const userMessage: Message = {
        id: `${Date.now()}-candidate`,
        role: 'candidate',
        content: transcript,
        timestamp: new Date(),
        transcription: `[You]: ${transcript}`,
        isThinking: false,
      }
      const thinkingMessage: Message = {
        id: `${Date.now()}-thinking`,
        role: 'interviewer',
        content: `${persona.name} is thinking...`,
        timestamp: new Date(),
        transcription: `${persona.name} is thinking...`,
        isThinking: true,
      }
      const currentMessages = [...interview.messages, userMessage, thinkingMessage]
      updateSession(currentMessages)

      const response = await fetch(`${AI_BASE}/tech_chat/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          persona_id: persona.id,
          topic_seed: interview.topic || '',
          turn_count: exchangeCount + 1,
          soft_turn_limit: TECH_CHAT_SOFT_TURN_LIMIT,
          messages: [...interview.messages, userMessage].map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to continue Tech Chat (${response.status})`)
      }

      const data = await response.json()
      const aiText =
        typeof data?.response === 'string' && data.response.trim()
          ? data.response.trim()
          : 'That is interesting. Say a little more about the part that feels most important to you.'
      const shouldEnd = Boolean(data?.should_end) || exchangeCount + 1 >= TECH_CHAT_SOFT_TURN_LIMIT
      const aiMessage: Message = {
        id: `${Date.now()}-ai`,
        role: 'interviewer',
        content: aiText,
        timestamp: new Date(),
        transcription: `[${persona.name}]: ${aiText}`,
        isThinking: false,
      }
      const nextMessages = currentMessages
        .filter((message) => message.id !== thinkingMessage.id)
        .concat(aiMessage)

      updateSession(nextMessages)
      await interviewService.updateInterviewMessages(Number(interview.id), { messages: nextMessages }).catch(() => undefined)

      if (shouldEnd || endRequestedRef.current) {
        endRequestedRef.current = false
        await completeSession(nextMessages)
      }
    } catch (err) {
      console.error('Failed to process Tech Chat voice input:', err)
      setRecordingError('Unable to process that voice input right now.')
      updateSession(interview.messages)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualEnd = async () => {
    if (isProcessing) {
      endRequestedRef.current = true
      return
    }
    await completeSession(interview.messages)
  }

  const toggleTranscriptExpand = (messageId: string) => {
    setExpandedTranscriptIds((prev) =>
      prev.includes(messageId) ? prev.filter((item) => item !== messageId) : [...prev, messageId]
    )
  }

  if (recap) {
    return (
      <div className="flex h-full bg-white">
        <div className={`flex flex-1 flex-col overflow-y-auto ${showTranscription ? 'pr-80' : ''}`}>
          <div className="w-full border-b border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-600">
                  Tech Chat
                </div>
                <h1 className="mt-3 text-2xl font-light text-gray-900">Session wrap-up</h1>
                <div className="mt-2 text-sm text-gray-500">{persona.name} • {persona.archetype}</div>
              </div>
              <button
                onClick={() => setShowTranscription((prev) => !prev)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm transition-colors hover:bg-gray-200"
              >
                {showTranscription ? 'Hide' : 'Show'} Transcript
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-8" style={SESSION_STAGE_BACKGROUND_STYLES[resolvedTheme]}>
            <div className="mx-auto max-w-4xl">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  {persona.name}&apos;s takeaway
                </div>
                <p className="mt-4 text-lg leading-8 text-gray-900">&ldquo;{recap.takeawayLine}&rdquo;</p>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <section className="rounded-2xl bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Highlight moments</h2>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
                    {recap.highlights.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </section>
                <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-900">Fuzzy spots</h2>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-amber-950">
                    {recap.fuzzySpots.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Topics covered</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {recap.topicsCovered.map((topic) => (
                    <span key={topic} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-900">
                      {topic}
                    </span>
                  ))}
                </div>
              </section>

              <button
                type="button"
                onClick={onStartAnother}
                className="mt-6 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Start another session
              </button>
            </div>
          </div>
        </div>
        {showTranscription ? (
          <TranscriptPanel
            messages={interview.messages}
            personaName={persona.name}
            expandedTranscriptIds={expandedTranscriptIds}
            onToggleTranscript={toggleTranscriptExpand}
            messagesEndRef={messagesEndRef}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex h-full bg-white">
      <div className={`flex flex-1 flex-col items-center justify-start overflow-y-auto ${showTranscription ? 'pr-80' : ''}`}>
        <div className="w-full border-b border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-600">
                Tech Chat
              </div>
              <h1 className="mt-3 text-2xl font-light text-gray-900">{persona.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span>{persona.archetype}</span>
                {interview.topic ? (
                  <>
                    <span>•</span>
                    <span>{interview.topic}</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTranscription((prev) => !prev)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm transition-colors hover:bg-gray-200"
              >
                {showTranscription ? 'Hide' : 'Show'} Transcript
              </button>
              <button
                type="button"
                onClick={handleManualEnd}
                disabled={ending}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm transition-colors hover:bg-gray-200 disabled:opacity-60"
              >
                {ending ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                End
              </button>
              <div className="flex items-center gap-2 text-green-500">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-sm">Live</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="relative flex w-full flex-1 flex-col items-center"
          style={SESSION_STAGE_BACKGROUND_STYLES[resolvedTheme]}
        >
          <div className="relative flex w-full max-w-4xl items-center justify-center px-6 pt-8">
            {cameraOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ transform: 'scaleX(-1)' }}
                className="aspect-video w-full rounded-[24px] bg-black object-cover shadow-lg"
              />
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center rounded-[24px] bg-gray-200 shadow-lg">
                <CameraOff size={64} className="text-gray-400" />
                <p className="mt-4 text-lg text-gray-500">Camera is off.</p>
              </div>
            )}

            {isTimerRunning ? (
              <div className="absolute right-10 top-12 z-[2] rounded-lg bg-black/75 px-3 py-2 font-mono text-lg font-bold text-white">
                {formatTime(timer)}
              </div>
            ) : null}

            <button
              onClick={() => setCameraOn((prev) => !prev)}
              className="absolute -bottom-6 left-1/2 z-[1] -translate-x-1/2 rounded-full border border-gray-200 bg-white/90 p-3 shadow-md transition hover:bg-white"
              title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
            >
              {cameraOn ? <CameraOff size={28} className="text-gray-700" /> : <Camera size={28} className="text-gray-700" />}
            </button>
          </div>

          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
            {recordingError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {recordingError}
              </div>
            ) : null}

            {ending ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl bg-white p-8 shadow-sm">
                <Loader2 className="mb-4 animate-spin text-emerald-500" size={40} />
                <div className="text-lg font-medium text-emerald-700">Wrapping up...</div>
              </div>
            ) : (
              <div className="flex min-h-[180px] flex-col items-center justify-center px-4 py-6">
                <div className="mb-4 max-w-xl text-center text-sm text-gray-600">
                  Speak naturally. {persona.name} will respond like a colleague, not an interviewer.
                </div>
                <CustomMicRecorder
                  onAudioRecorded={handleAudioRecorded}
                  onRecordingStart={startTimer}
                  onRecordingStop={stopTimer}
                  onRecordingError={setRecordingError}
                  maxDuration={MAX_RECORDING_DURATION}
                  idleText="Click the microphone to continue the conversation."
                  recordingText={`Recording... (max ${MAX_RECORDING_DURATION} seconds)`}
                  processingText={isProcessing ? `${persona.name} is listening...` : 'Processing...'}
                  wrapperClassName="flex flex-col items-center gap-3"
                  statusClassName="text-center text-sm text-gray-600"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {showTranscription ? (
        <TranscriptPanel
          messages={interview.messages}
          personaName={persona.name}
          expandedTranscriptIds={expandedTranscriptIds}
          onToggleTranscript={toggleTranscriptExpand}
          messagesEndRef={messagesEndRef}
        />
      ) : null}
    </div>
  )
}

interface TranscriptPanelProps {
  messages: Message[]
  personaName: string
  expandedTranscriptIds: string[]
  onToggleTranscript: (messageId: string) => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}

const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  messages,
  personaName,
  expandedTranscriptIds,
  onToggleTranscript,
  messagesEndRef,
}) => (
  <div className="fixed right-0 top-0 flex h-full w-80 flex-col border-l border-gray-200 bg-white">
    <div className="border-b border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Session Transcript</h3>
        <Volume2 size={16} className="text-gray-400" />
      </div>
    </div>

    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((message) => (
        <div key={message.id} className="text-sm">
          <div className="mb-1 text-xs text-gray-400">{message.timestamp.toLocaleString()}</div>
          <div
            className={`rounded-lg p-3 text-xs ${
              message.role === 'candidate'
                ? 'bg-gray-100 text-gray-800'
                : 'border border-green-200 bg-green-50 text-green-800'
            }`}
          >
            {message.isThinking ? (
              <span>
                {personaName} is thinking
                <span className="thinking-dots-bouncing">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </span>
            ) : message.role === 'candidate' &&
              message.transcription.length > MAX_TRANSCRIPT_PREVIEW_LENGTH ? (
              <div className="space-y-2">
                <div className="break-words leading-5">
                  {expandedTranscriptIds.includes(message.id)
                    ? message.transcription
                    : getTranscriptPreview(message.transcription)}
                </div>
                <button
                  type="button"
                  onClick={() => onToggleTranscript(message.id)}
                  aria-expanded={expandedTranscriptIds.includes(message.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 transition-colors hover:text-gray-700"
                >
                  {expandedTranscriptIds.includes(message.id) ? (
                    <>
                      Show less
                      <ChevronUp size={14} />
                    </>
                  ) : (
                    <>
                      View full answer
                      <ChevronDown size={14} />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="break-words leading-5">{message.transcription}</div>
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  </div>
)

export default TechChatSession
