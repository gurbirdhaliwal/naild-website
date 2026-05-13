import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Check, Sparkles } from 'lucide-react'
import { InterviewConfig } from '../types/Interview'
import { AUREON_NAME } from '../lib/modelConfig'
import SessionCreationLoadingScreen from './SessionCreationLoadingScreen'

interface InterviewSetupProps {
  onCreateInterview: (config: InterviewConfig) => Promise<void>
  resolvedTheme: 'light' | 'dark'
}

const roles = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Scientist',
  'Machine Learning Engineer',
  'Mobile Developer',
  'Software Engineer',
]

const technologies = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C++',
  'C#',
  'Go',
  'Rust',
  'PHP',
  'Ruby',
  'Swift',
  'Kotlin',
  'React',
  'Node.js',
  'Angular',
  'Vue.js',
  'Django',
  'Flask',
  'Spring',
  'Docker',
  'AWS',
]

const difficulties = [
  {
    value: 'intern',
    label: 'Intern (0-2 years)',
    description: 'Intern to 2 years of experience',
  },
  {
    value: 'mid',
    label: 'Mid-level (2-5 years)',
    description: 'Roughly 2 to 5 years of experience',
  },
  {
    value: 'senior',
    label: 'Senior (5+ years)',
    description: 'Senior engineer or promotion prep',
  },
]

const steps = [
  { title: 'Job Title', description: 'Select your target role' },
  { title: 'Technologies', description: 'Choose relevant technologies' },
  { title: 'Context', description: 'Add a topic or extra context for the interview.' },
  { title: 'Confirm', description: 'Review your interview setup before it is generated.' },
]

const stepMotionProps = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: 0.24 },
}

const InterviewSetup: React.FC<InterviewSetupProps> = ({ onCreateInterview, resolvedTheme }) => {
  const [config, setConfig] = useState<InterviewConfig>({
    role: '',
    languages: [],
    difficulty: 'mid',
    topic: '',
    promptContext: '',
  })
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const getDifficultyLabel = (value: string) =>
    difficulties.find((difficulty) => difficulty.value === value)?.label || value

  const summaryRows = useMemo(
    () => [
      { label: 'Job Title', value: config.role || 'Not selected yet' },
      {
        label: 'Technologies',
        value: config.languages.length > 0 ? config.languages.join(', ') : 'Not selected yet',
      },
      {
        label: 'Topic',
        value: config.topic.trim() || 'Let Memotree steer the interview topic from your role and focus areas',
      },
      {
        label: 'Context',
        value:
          config.promptContext.trim() ||
          'No extra context added. Memotree will infer realistic situations from your selections.',
      },
      { label: 'Experience Level', value: getDifficultyLabel(config.difficulty) },
    ],
    [config]
  )

  const handleLanguageToggle = (language: string) => {
    setSubmitError(null)
    setConfig((prev) => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter((item) => item !== language)
        : [...prev.languages, language],
    }))
  }

  const handleRoleSelect = (role: string) => {
    setConfig((prev) => ({ ...prev, role }))
    setSubmitError(null)
    window.setTimeout(() => setCurrentStep(1), 300)
  }

  const handleLanguagesNext = () => {
    if (config.languages.length === 0) return
    setSubmitError(null)
    window.setTimeout(() => setCurrentStep(2), 300)
  }

  const handleDifficultySelect = (difficulty: string) => {
    setSubmitError(null)
    setConfig((prev) => ({ ...prev, difficulty: difficulty as InterviewConfig['difficulty'] }))
  }

  const handleReviewSetup = () => {
    window.setTimeout(() => setCurrentStep(3), 220)
  }

  const handleSubmit = async () => {
    if (!config.role || config.languages.length === 0 || loading) return

    setSubmitError(null)
    setLoading(true)
    setLoadingMsg(`${AUREON_NAME} is building your interview...`)
    let createdSuccessfully = false

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 250))
      await onCreateInterview(config)
      createdSuccessfully = true
    } catch (error) {
      console.error('Failed to create behavioral interview:', error)
      setSubmitError(`Unable to build your ${AUREON_NAME} interview. Please try again.`)
    } finally {
      if (!createdSuccessfully) {
        setLoading(false)
      }
    }
  }

  const goBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1)
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div key="job-title" {...stepMotionProps} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {roles.map((role, index) => {
                const isSelected = config.role === role
                return (
                  <motion.button
                    key={role}
                    type="button"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => handleRoleSelect(role)}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-gray-900">{role}</div>
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

      case 1:
        return (
          <motion.div key="technologies" {...stepMotionProps} className="space-y-5">
            <div className="rounded-[24px] border border-gray-200 bg-white p-5">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {technologies.map((technology, index) => {
                  const isSelected = config.languages.includes(technology)
                  return (
                    <motion.button
                      key={technology}
                      type="button"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleLanguageToggle(technology)}
                      className={`rounded-xl border px-3 py-3 text-left text-sm transition-all ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-emerald-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{technology}</span>
                        {isSelected ? <Check size={15} className="text-emerald-600" /> : null}
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              <div className="mt-5 flex items-center justify-between gap-4">
                <p className="text-sm text-gray-600">Selected: {config.languages.length} technologies</p>
                <button
                  type="button"
                  onClick={handleLanguagesNext}
                  disabled={config.languages.length === 0}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </motion.div>
        )

      case 2:
        return (
          <motion.div key="context" {...stepMotionProps} className="space-y-5">
            <div className="space-y-4 rounded-[24px] border border-gray-200 bg-white p-5">
              <div>
                <label className="text-sm font-medium text-gray-800">Topic</label>
                <input
                  type="text"
                  value={config.topic}
                  onChange={(event) => setConfig((prev) => ({ ...prev, topic: event.target.value }))}
                  onFocus={() => setSubmitError(null)}
                  placeholder="Optional: conflict resolution, stakeholder alignment, missed deadline..."
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
                  placeholder="Optional: team size, company stage, project type, or situations you want the interview to reflect."
                  className="mt-2 min-h-[112px] w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-800">Experience level</label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {difficulties.map((difficulty) => {
                    const isSelected = config.difficulty === difficulty.value
                    return (
                      <button
                        key={difficulty.value}
                        type="button"
                        onClick={() => handleDifficultySelect(difficulty.value)}
                        className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                          isSelected
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-sm font-medium">{difficulty.label}</div>
                        <div
                          className={`mt-1 text-xs leading-5 ${
                            isSelected ? 'text-emerald-800' : 'text-gray-500'
                          }`}
                        >
                          {difficulty.description}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleReviewSetup}
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
          <motion.div key="confirm" {...stepMotionProps} className="space-y-5">
            <div className="rounded-[24px] border border-gray-200 bg-white p-5">
              <div className="space-y-4">
                {summaryRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col gap-1 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
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
                Create Interview
              </button>
            </div>
          </motion.div>
        )
    }
  }

  if (loading) {
    return (
      <SessionCreationLoadingScreen
        variant="behavioral"
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

export default InterviewSetup
