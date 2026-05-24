import React, { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { TECH_CHAT_PERSONAS, type TechChatPersonaId } from '../lib/techChatConfig'

export interface TechChatSessionConfig {
  personaId: TechChatPersonaId
  topicSeed: string
  surpriseMe: boolean
}

interface TechChatSetupProps {
  onCreateSession: (config: TechChatSessionConfig) => Promise<void>
  resolvedTheme: 'light' | 'dark'
}

const TechChatSetup: React.FC<TechChatSetupProps> = ({ onCreateSession, resolvedTheme }) => {
  const [selectedPersonaId, setSelectedPersonaId] = useState<TechChatPersonaId>(
    TECH_CHAT_PERSONAS[0].id
  )
  const [topicSeed, setTopicSeed] = useState('')
  const [submittingMode, setSubmittingMode] = useState<'topic' | 'surprise' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isDark = resolvedTheme === 'dark'

  const submit = async (surpriseMe: boolean) => {
    setError(null)
    setSubmittingMode(surpriseMe ? 'surprise' : 'topic')

    try {
      await onCreateSession({
        personaId: selectedPersonaId,
        topicSeed: topicSeed.trim(),
        surpriseMe,
      })
    } catch (err) {
      console.error('Failed to create Tech Chat session:', err)
      setError('Unable to start this chat right now. Please try again.')
    } finally {
      setSubmittingMode(null)
    }
  }

  return (
    <div
      className={`mx-auto flex h-full w-full max-w-6xl flex-col gap-5 overflow-y-auto px-2 py-1 ${
        isDark ? 'text-gray-100' : 'text-gray-950'
      }`}
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-emerald-700">
          Tech Chat
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Talk through an idea</h2>
        <p className={`mt-2 max-w-2xl text-sm leading-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Pick a colleague persona, bring a loose topic, or let them start with something they would naturally want to discuss.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {TECH_CHAT_PERSONAS.map((persona) => {
          const selected = persona.id === selectedPersonaId

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => setSelectedPersonaId(persona.id)}
              className={`flex min-h-[18rem] flex-col rounded-2xl border p-4 text-left transition-all ${
                selected
                  ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                  : isDark
                    ? 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${persona.avatarClassName}`}>
                {persona.name.charAt(0)}
              </div>
              <div className="mt-4">
                <div className="text-base font-semibold">{persona.name}</div>
                <div className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-emerald-700">
                  {persona.archetype}
                </div>
              </div>
              <p className={`mt-3 text-sm leading-5 ${isDark && !selected ? 'text-gray-300' : 'text-gray-600'}`}>
                {persona.bio}
              </p>
              <p className={`mt-auto pt-4 text-sm italic leading-5 ${selected ? 'text-emerald-900' : 'text-gray-500'}`}>
                &ldquo;{persona.sampleLine}&rdquo;
              </p>
            </button>
          )
        })}
      </div>

      <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-gray-200 bg-white'}`}>
        <label htmlFor="tech-chat-topic" className="text-sm font-semibold">
          Bring a topic
        </label>
        <textarea
          id="tech-chat-topic"
          value={topicSeed}
          onChange={(event) => setTopicSeed(event.target.value)}
          placeholder="I want to talk through microservices vs monolith tradeoffs..."
          rows={3}
          className={`mt-3 w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:border-emerald-400 ${
            isDark
              ? 'border-white/10 bg-black/20 text-white placeholder:text-gray-500'
              : 'border-gray-200 bg-white text-gray-950 placeholder:text-gray-400'
          }`}
        />
        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={submittingMode !== null}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submittingMode === 'topic' ? <Loader2 size={16} className="animate-spin" /> : null}
            Start chat
          </button>
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={submittingMode !== null}
            className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
              isDark
                ? 'border-white/15 text-gray-100 hover:bg-white/10'
                : 'border-gray-200 text-gray-800 hover:bg-gray-50'
            }`}
          >
            {submittingMode === 'surprise' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            Surprise me
          </button>
        </div>
      </div>
    </div>
  )
}

export default TechChatSetup
