import React from 'react'
import { Camera, CameraOff } from 'lucide-react'
import type { AISessionState } from '../lib/voicePersonasConfig'

interface AIPresenceProfile {
  initials: string
  avatarClassName: string
  name: string
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

const AI_STATE_LABEL: Record<AISessionState, string> = {
  idle: 'AI is ready',
  listening: 'AI is listening',
  thinking: 'AI is processing',
  speaking: 'AI is ready',
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
        aria-label={AI_STATE_LABEL[aiState]}
        aria-live="polite"
      >
        <div className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          {ai.name}
        </div>
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="ai-presence-ring relative flex h-32 w-32 items-center justify-center rounded-full border border-emerald-200/70">
            <div className="ai-presence-core absolute h-24 w-24 rounded-full bg-emerald-100/65" />
            <div
              className={`ai-presence-avatar relative flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold ring-4 ${ai.avatarClassName}`}
            >
              {ai.initials}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default SessionStage
