import { AUREON_NAME } from './modelConfig'
import type {
  AudienceType,
  GeneratedPrompt,
  GradingResult,
  Interview,
  PracticeMode,
  SessionType,
} from '../types/Interview'
import {
  isBehavioralGradingResult,
  isCommunicationGradingResult,
  isGradingErrorResult,
} from '../types/Interview'

export const COMMUNICATION_FIELDS = [
  'Software Engineer',
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Engineer',
  'Data Scientist',
  'AI Engineer',
  'Machine Learning Engineer',
  'Product Engineer',
] as const

export const COMMUNICATION_PRACTICE_MODES: Array<{
  value: PracticeMode
  label: string
  description: string
}> = [
  {
    value: 'explain-concept',
    label: 'Explain a concept',
    description: 'Turn a technical idea into a clear explanation someone else can use.',
  },
  {
    value: 'explain-decision',
    label: 'Explain a decision',
    description: 'Defend why you chose an approach, tool, or architecture.',
  },
  {
    value: 'explain-tradeoff',
    label: 'Explain a tradeoff',
    description: 'Walk through the decision boundaries and what you chose to optimize.',
  },
]

export const AUDIENCE_OPTIONS: Array<{
  value: AudienceType
  label: string
  description: string
}> = [
  {
    value: 'peer-engineer',
    label: 'Peer engineer',
    description: 'Use precise technical language without overexplaining the basics.',
  },
  {
    value: 'senior-engineer',
    label: 'Senior engineer',
    description: 'Make your reasoning and tradeoffs legible to strong technical reviewers.',
  },
  {
    value: 'product-manager',
    label: 'Product manager',
    description: 'Translate the decision into user impact, constraints, and outcomes.',
  },
  {
    value: 'engineering-manager',
    label: 'Engineering manager',
    description: 'Balance the technical explanation with execution risk and ownership.',
  },
  {
    value: 'non-technical-stakeholder',
    label: 'Non-technical stakeholder',
    description: 'Simplify the idea without becoming vague or inaccurate.',
  },
  {
    value: 'recruiter',
    label: 'Recruiter',
    description: 'Keep the explanation accessible and high-signal for a non-specialist listener.',
  },
]

export const EXPERIENCE_LEVELS = [
  { value: 'intern', label: 'Early-career', description: 'Intern to 2 years of experience' },
  { value: 'mid', label: 'Mid-level', description: 'Roughly 2 to 5 years of experience' },
  { value: 'senior', label: 'Senior', description: 'Senior engineer or promotion prep' },
] as const

export const BEHAVIORAL_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Scientist',
  'Machine Learning Engineer',
  'Mobile Developer',
  'Software Engineer',
] as const

export const BEHAVIORAL_FOCUS_AREAS = [
  'Communication',
  'Teamwork',
  'Leadership',
  'Conflict Resolution',
  'Ownership',
  'Adaptability',
  'Prioritization',
  'Decision Making',
  'Dealing with Failure',
  'Cross-functional Collaboration',
  'Mentorship',
  'Ambiguity',
] as const

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  'technical-communication': 'Technical communication',
  'behavioral-interview': 'Behavioral interview',
}

export const PRACTICE_MODE_LABELS: Record<PracticeMode, string> = {
  'explain-concept': 'Explain a concept',
  'explain-decision': 'Explain a decision',
  'explain-tradeoff': 'Explain a tradeoff',
}

export const AUDIENCE_LABELS: Record<AudienceType, string> = {
  recruiter: 'Recruiter',
  'peer-engineer': 'Peer engineer',
  'senior-engineer': 'Senior engineer',
  'engineering-manager': 'Engineering manager',
  'product-manager': 'Product manager',
  'non-technical-stakeholder': 'Non-technical stakeholder',
}

export const COMMUNICATION_CATEGORY_LABELS = {
  clarity: 'Clarity',
  correctness: 'Correctness',
  depth: 'Depth',
  audience_fit: 'Audience fit',
} as const

const normalizePromptString = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim()
  return normalized || fallback
}

const normalizePromptArray = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) return fallback

  const normalized = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  return normalized.length > 0 ? normalized : fallback
}

export const normalizeGeneratedPrompt = (
  value: Partial<GeneratedPrompt> | null | undefined,
  fallback: GeneratedPrompt
): GeneratedPrompt => ({
  title: normalizePromptString(value?.title, fallback.title),
  scenario: normalizePromptString(value?.scenario, fallback.scenario),
  prompt: normalizePromptString(value?.prompt, fallback.prompt),
  audience: normalizePromptString(value?.audience, fallback.audience),
  practice_mode:
    value?.practice_mode === 'explain-concept' ||
    value?.practice_mode === 'explain-decision' ||
    value?.practice_mode === 'explain-tradeoff'
      ? value.practice_mode
      : fallback.practice_mode,
  field: normalizePromptString(value?.field, fallback.field),
  topic: normalizePromptString(value?.topic, fallback.topic),
  what_to_cover: normalizePromptArray(value?.what_to_cover, fallback.what_to_cover),
  time_guidance: normalizePromptString(value?.time_guidance, fallback.time_guidance),
  focus_areas: normalizePromptArray(value?.focus_areas, fallback.focus_areas),
})

export const getSessionTypeLabel = (value?: string | null) =>
  SESSION_TYPE_LABELS[(value as SessionType) || 'behavioral-interview'] ?? 'Behavioral interview'

export const getPracticeModeLabel = (value?: string | null) =>
  PRACTICE_MODE_LABELS[value as PracticeMode] ?? 'Practice session'

export const getAudienceLabel = (value?: string | null) =>
  AUDIENCE_LABELS[value as AudienceType] ?? value ?? 'Audience'

export const getOverallScore = (gradingResult: GradingResult | null | undefined): number | null => {
  if (!gradingResult || isGradingErrorResult(gradingResult)) return null
  if (isCommunicationGradingResult(gradingResult)) return gradingResult.overall_score
  if (isBehavioralGradingResult(gradingResult)) return gradingResult.average_score
  return null
}

export const getSessionSubtitle = (session: Interview) => {
  if ((session.sessionType ?? 'behavioral-interview') === 'technical-communication') {
    const labels = [
      session.role,
      getPracticeModeLabel(session.practiceMode),
      getAudienceLabel(session.audience),
    ].filter(Boolean)

    return labels.join(' • ')
  }

  return [session.role, `${session.difficulty} level`].filter(Boolean).join(' • ')
}

export const getSessionFocusSummary = (session: Interview) => {
  if ((session.sessionType ?? 'behavioral-interview') === 'technical-communication') {
    if (session.topic) return session.topic
    return session.generatedPrompt?.topic || `${AUREON_NAME}-generated drill`
  }

  return session.languages[0] || session.role
}
