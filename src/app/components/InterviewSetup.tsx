import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Check } from 'lucide-react'
import { InterviewConfig } from '../types/Interview'
import { AI_BASE } from '../services/api'

interface InterviewSetupProps {
  onCreateInterview: (config: InterviewConfig) => void
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
  { value: 'intern', label: 'Intern (0-2 years)' },
  { value: 'mid', label: 'Mid-level (2-5 years)' },
  { value: 'senior', label: 'Senior (5+ years)' },
]

const steps = [
  { title: 'Job Title', description: 'Select your target role' },
  { title: 'Technologies', description: 'Choose relevant technologies' },
  { title: 'Experience Level', description: 'Set your experience level' },
  { title: 'Confirm', description: 'Review your choices' },
]

const stepMotionProps = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: 0.24 },
}

const InterviewSetup: React.FC<InterviewSetupProps> = ({ onCreateInterview }) => {
  const [config, setConfig] = useState<InterviewConfig>({
    role: '',
    languages: [],
    difficulty: 'mid',
  })
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')

  const getDifficultyLabel = (value: string) =>
    difficulties.find((difficulty) => difficulty.value === value)?.label || value

  const summaryRows = useMemo(
    () => [
      { label: 'Job Title', value: config.role || 'Not selected yet' },
      {
        label: 'Technologies',
        value: config.languages.length > 0 ? config.languages.join(', ') : 'Not selected yet',
      },
      { label: 'Experience Level', value: getDifficultyLabel(config.difficulty) },
    ],
    [config]
  )

  const handleLanguageToggle = (language: string) => {
    setConfig((prev) => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter((item) => item !== language)
        : [...prev.languages, language],
    }))
  }

  const handleRoleSelect = (role: string) => {
    setConfig((prev) => ({ ...prev, role }))
    window.setTimeout(() => setCurrentStep(1), 300)
  }

  const handleLanguagesNext = () => {
    if (config.languages.length === 0) return
    window.setTimeout(() => setCurrentStep(2), 300)
  }

  const handleDifficultySelect = (difficulty: string) => {
    setConfig((prev) => ({ ...prev, difficulty: difficulty as InterviewConfig['difficulty'] }))
    window.setTimeout(() => setCurrentStep(3), 300)
  }

  const handleSubmit = async () => {
    if (!config.role || config.languages.length === 0) return

    setLoading(true)
    setLoadingMsg('Warming up AI, please wait...')

    try {
      const res = await fetch(`${AI_BASE}/warmup`)
      const data = await res.json()

      if (data.status === 'ready') {
        setLoadingMsg('AI is ready! Building your interview...')
        window.setTimeout(() => {
          onCreateInterview(config)
        }, 500)
      } else {
        setLoadingMsg('Error warming up AI. Please try again.')
      }
    } catch {
      setLoadingMsg('Error connecting to AI backend.')
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
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Select Job Title</h3>
              <p className="mt-1 text-sm text-gray-600">
                Choose the role you&apos;re interviewing for.
              </p>
            </div>

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
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Select Technologies</h3>
              <p className="mt-1 text-sm text-gray-600">
                Choose the technologies you want to be tested on.
              </p>
            </div>

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
          <motion.div key="experience-level" {...stepMotionProps} className="space-y-5">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Experience Level</h3>
              <p className="mt-1 text-sm text-gray-600">Select your experience level.</p>
            </div>

            <div className="grid gap-3">
              {difficulties.map((difficulty, index) => {
                const isSelected = config.difficulty === difficulty.value
                return (
                  <motion.button
                    key={difficulty.value}
                    type="button"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleDifficultySelect(difficulty.value)}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      isSelected
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">{difficulty.label}</div>
                      {isSelected ? (
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-900">
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

      default:
        return (
          <motion.div key="confirm" {...stepMotionProps} className="space-y-5">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Your Choices</h3>
              <p className="mt-1 text-sm text-gray-600">Review your interview configuration.</p>
            </div>

            <div className="rounded-[24px] border border-gray-200 bg-white p-5">
              <div className="space-y-4">
                {summaryRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col gap-1 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                  >
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500">
                      {row.label}
                    </span>
                    <span className="text-sm leading-6 text-gray-900">{row.value}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-black"
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
      <div className="mx-auto w-full max-w-3xl rounded-[32px] border border-gray-200 bg-white/90 p-8 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.32)] backdrop-blur">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <motion.svg
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="mb-4 h-10 w-10 text-gray-900"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </motion.svg>

          <div className="text-lg font-medium text-gray-900">{loadingMsg}</div>
          <div className="mt-2 text-sm text-gray-500">This may take a few seconds the first time.</div>
        </div>
      </div>
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
