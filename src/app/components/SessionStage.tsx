import React from 'react'
import { Brain, Camera, CameraOff, Mic, Volume2 } from 'lucide-react'
import type { AISessionState } from '../lib/voicePersonasConfig'

interface AIPresenceProfile {
  name: string
  subtitle: string
  initials: string
  avatarClassName: string
}

interface SessionStageProps {
  cameraOn: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  onToggleCamera: () => void
  ai: AIPresenceProfile
  aiState: AISessionState
  resolvedTheme: 'light' | 'dark'
  timerLabel?: string | null
}

const AI_STATE_COPY: Record<AISessionState, { label: string; icon: typeof Mic }> = {
  idle: { label: 'Ready', icon: Mic },
  listening: { label: 'Listening', icon: Mic },
  thinking: { label: 'Thinking', icon: Brain },
  speaking: { label: 'Speaking', icon: Volume2 },
}

const getStateAccentClass = (state: AISessionState) => {
  if (state === 'listening') return 'border-emerald-300 bg-emerald-50 text-emerald-800'
  if (state === 'thinking') return 'border-sky-300 bg-sky-50 text-sky-800'
  if (state === 'speaking') return 'border-teal-300 bg-teal-50 text-teal-800'
  return 'border-gray-200 bg-white text-gray-700'
}

const SessionStage: React.FC<SessionStageProps> = ({
  cameraOn,
  videoRef,
  onToggleCamera,
  ai,
  aiState,
  resolvedTheme,
  timerLabel,
}) => {
  const stateCopy = AI_STATE_COPY[aiState]
  const StateIcon = stateCopy.icon
  const isDark = resolvedTheme === 'dark'

  return (
    <div className="grid w-full max-w-6xl gap-4 px-6 pt-8 md:grid-cols-2">
      <section className="relative aspect-video overflow-hidden rounded-[24px] bg-black shadow-lg">
        {cameraOn ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ transform: 'scaleX(-1)' }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gray-200">
            <CameraOff size={56} className="text-gray-400" />
            <p className="mt-3 text-base text-gray-500">Camera is off.</p>
          </div>
        )}

        {timerLabel ? (
          <div className="absolute right-4 top-4 z-[2] rounded-lg bg-black/75 px-3 py-2 font-mono text-base font-bold text-white">
            {timerLabel}
          </div>
        ) : null}

        <div className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          You
        </div>

        <button
          type="button"
          onClick={onToggleCamera}
          className="absolute bottom-4 left-1/2 z-[1] -translate-x-1/2 rounded-full border border-gray-200 bg-white/90 p-3 shadow-md transition hover:bg-white"
          title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
        >
          {cameraOn ? (
            <CameraOff size={24} className="text-gray-700" />
          ) : (
            <Camera size={24} className="text-gray-700" />
          )}
        </button>
      </section>

      <section
        data-state={aiState}
        className={`ai-presence-card relative aspect-video overflow-hidden rounded-[24px] border shadow-lg ${
          isDark
            ? 'border-emerald-900/50 bg-[#07120e] text-white'
            : 'border-emerald-100 bg-white text-gray-950'
        }`}
        aria-live="polite"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-300" />
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="ai-presence-ring relative flex h-32 w-32 items-center justify-center rounded-full border border-emerald-200/70">
            <div className="ai-presence-core absolute h-24 w-24 rounded-full bg-emerald-100/65" />
            <div
              className={`relative flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold ring-4 ${ai.avatarClassName}`}
            >
              {ai.initials}
            </div>
          </div>

          <div className="mt-5">
            <h2 className="text-xl font-semibold">{ai.name}</h2>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>{ai.subtitle}</p>
          </div>

          <div
            className={`mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${getStateAccentClass(aiState)}`}
          >
            <StateIcon size={16} />
            {stateCopy.label}
          </div>

          <div className="ai-presence-wave mt-5 flex h-5 items-center justify-center gap-1.5">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>
    </div>
  )
}

export default SessionStage
