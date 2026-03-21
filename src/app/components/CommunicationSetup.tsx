import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Check, Sparkles } from 'lucide-react'
import { AI_BASE } from '../services/api'
import { CommunicationSessionConfig } from '../types/Interview'
import { AUREON_NAME } from '../lib/modelConfig'
import {
  AUDIENCE_OPTIONS,
  COMMUNICATION_FIELDS,
  COMMUNICATION_PRACTICE_MODES,
  EXPERIENCE_LEVELS,
  getAudienceLabel,
  getPracticeModeLabel,
} from '../lib/practiceConfig'
import SessionCreationLoadingScreen from './SessionCreationLoadingScreen'

interface CommunicationSetupProps {
  onCreateSession: (config: CommunicationSessionConfig) => Promise<void>
  resolvedTheme: 'light' | 'dark'
}

const CommunicationSetup: React.FC<CommunicationSetupProps> = ({
  onCreateSession,
  resolvedTheme,
}) => {
  const [config, setConfig] = useState<CommunicationSessionConfig>({
    role: '',
    practiceMode: 'explain-concept',
    audience: 'peer-engineer',
    topic: '',
    promptContext: '',
    difficulty: 'mid',
  })
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const summaryRows = useMemo(
    () => [
      { label: 'Field', value: config.role || 'Not selected yet' },
      { label: 'Mode', value: getPracticeModeLabel(config.practiceMode) },
      { label: 'Audience', value: getAudienceLabel(config.audience) },
      {
        label: 'Topic',
        value: config.topic.trim() || 'Let Naild pick a realistic topic from your field',
      },
      {
        label: 'Context',
        value:
          config.promptContext.trim() ||
          'No extra context added. Naild will infer the scenario from your selections.',
      },
      {
        label: 'Experience',
        value:
          EXPERIENCE_LEVELS.find((level) => level.value === config.difficulty)?.description ??
          config.difficulty,
      },
    ],
    [config]
  )

  const steps = [
    { title: 'Field', description: 'Choose the type of developer you want the drill tailored to.' },
    { title: 'Mode', description: 'Pick how you want to practice explaining the idea.' },
    { title: 'Audience', description: 'Choose who you need to make the idea click for.' },
    { title: 'Context', description: 'Add a topic or let Naild generate one for you.' },
    { title: 'Confirm', description: 'Review the drill setup before it is generated.' },
  ]

  const goBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1)
  }

  const handleSubmit = async () => {
    if (!config.role || loading) return

    setSubmitError(null)
    setLoading(true)
    setLoadingMsg(`Warming up ${AUREON_NAME}...`)
    let createdSuccessfully = false

    try {
      const res = await fetch(`${AI_BASE}/warmup`)
      if (!res.ok) {
        throw new Error(`Warmup failed: ${res.status}`)
      }

      const data = await res.json()

      if (data.status === 'ready') {
        setLoadingMsg('Generating your drill...')
        await new Promise((resolve) => window.setTimeout(resolve, 450))
        await onCreateSession(config)
        createdSuccessfully = true
        return
      }

      setSubmitError(`${AUREON_NAME} is not ready yet. Please try again.`)
    } catch (error) {
      console.error('Failed to prepare communication session:', error)
      setSubmitError(`Unable to connect to ${AUREON_NAME}. Please try again.`)
    } finally {
      if (!createdSuccessfully) {
        setLoading(false)
      }
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div
            key="field"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.24 }}
            className="space-y-5"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {COMMUNICATION_FIELDS.map((field, index) => (
                <motion.button
                  key={field}
                  type="button"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => {
                    setConfig((prev) => ({ ...prev, role: field }))
                    setSubmitError(null)
                    window.setTimeout(() => setCurrentStep(1), 220)
                  }}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm"
                >
                  <div className="text-sm font-semibold text-gray-900">{field}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )

      case 1:
        return (
          <motion.div
            key="mode"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.24 }}
            className="space-y-5"
          >
            <div className="grid gap-3">
              {COMMUNICATION_PRACTICE_MODES.map((mode, index) => {
                const isSelected = config.practiceMode === mode.value
                return (
                  <motion.button
                    key={mode.value}
                    type="button"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      setConfig((prev) => ({ ...prev, practiceMode: mode.value }))
                      setSubmitError(null)
                      window.setTimeout(() => setCurrentStep(2), 220)
                    }}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{mode.label}</div>
                        <div className="mt-1 text-xs leading-5 text-gray-500">{mode.description}</div>
                      </div>
                      {isSelected ? (
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-600">
                          <Check size={16} />
                        </div>
                      ) : null}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )

      case 2:
        return (
          <motion.div
            key="audience"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.24 }}
            className="space-y-5"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {AUDIENCE_OPTIONS.map((audience, index) => {
                const isSelected = config.audience === audience.value
                return (
                  <motion.button
                    key={audience.value}
                    type="button"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => {
                      setConfig((prev) => ({ ...prev, audience: audience.value }))
                      setSubmitError(null)
                      window.setTimeout(() => setCurrentStep(3), 220)
                    }}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-900">{audience.label}</div>
                    <div className="mt-1 text-xs leading-5 text-gray-500">{audience.description}</div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )

      case 3:
        return (
          <motion.div
            key="context"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.24 }}
            className="space-y-5"
          >
            <div className="space-y-4 rounded-[24px] border border-gray-200 bg-white p-5">
              <div>
                <label className="text-sm font-medium text-gray-800">Topic</label>
                <input
                  type="text"
                  value={config.topic}
                  onChange={(event) => setConfig((prev) => ({ ...prev, topic: event.target.value }))}
                  onFocus={() => setSubmitError(null)}
                  placeholder="Optional: caching strategy, precision vs recall, rate limiting..."
                  className="mt-2 h-12 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition-colors focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-800">Extra context</label>
                <textarea
                  value={config.promptContext}
                  onChange={(event) =>
                    setConfig((prev) => ({ ...prev, promptContext: event.target.value }))
                  }
                  onFocus={() => setSubmitError(null)}
                  placeholder="Optional: stack, product context, team situation, or why this topic matters right now."
                  className="mt-2 min-h-[112px] w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-800">Experience level</label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {EXPERIENCE_LEVELS.map((level) => {
                    const isSelected = config.difficulty === level.value
                    return (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => {
                          setConfig((prev) => ({ ...prev, difficulty: level.value }))
                          setSubmitError(null)
                        }}
                        className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                          isSelected
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-sm font-medium">{level.label}</div>
                        <div
                          className={`mt-1 text-xs leading-5 ${
                            isSelected ? 'text-emerald-800' : 'text-gray-500'
                          }`}
                        >
                          {level.description}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-black"
                >
                  Review setup
                  <Sparkles size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )

      default:
        return (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.24 }}
            className="space-y-5"
          >
            <div className="rounded-[24px] border border-gray-200 bg-white p-5">
              <div className="space-y-4">
                {summaryRows.map((row) => (
                  <div key={row.label} className="flex flex-col gap-1 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black">
                      {row.label}
                    </span>
                    <span className="text-sm leading-6 text-gray-600">{row.value}</span>
                  </div>
                ))}
              </div>

              {submitError ? (
                <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {submitError}
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-950 shadow-sm transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? loadingMsg || 'Preparing your drill...' : 'Generate drill'}
              </button>
            </div>
          </motion.div>
        )
    }
  }

  if (loading) {
    return (
      <SessionCreationLoadingScreen
        variant="communication"
        statusMessage={loadingMsg}
        resolvedTheme={resolvedTheme}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-[32px] border border-gray-200 bg-white/90 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.32)] backdrop-blur sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goBack}
          disabled={currentStep === 0}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${
            currentStep === 0
              ? 'cursor-not-allowed border-gray-200 text-gray-400'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ChevronLeft size={16} />
          Back
        </button>

        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className={`h-2.5 rounded-full transition-all ${
                index <= currentStep ? 'w-10 bg-emerald-500' : 'w-6 bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700">
          Step {currentStep + 1} of {steps.length}
        </p>
        <p className="mt-2 text-sm text-gray-500">{steps[currentStep]?.description}</p>
      </div>

      <div className="mt-6">
        <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
      </div>
    </div>
  )
}

export default CommunicationSetup
