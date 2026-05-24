export interface Message {
  id: string
  role: 'candidate' | 'interviewer'
  content: string
  timestamp: Date
  transcription: string
  isThinking: boolean
}

export type SessionType = 'technical-communication' | 'behavioral-interview' | 'tech-chat'

export type PracticeMode = 'explain-concept' | 'explain-decision' | 'explain-tradeoff'

export type AudienceType =
  | 'recruiter'
  | 'peer-engineer'
  | 'senior-engineer'
  | 'engineering-manager'
  | 'product-manager'
  | 'non-technical-stakeholder'

export interface GradingScore {
  question: string
  answer: string
  score: number
  feedback?: string
}

export interface BehavioralGradingSuccessResult {
  scores: GradingScore[]
  average_score: number
  feedback: string
}

export interface CommunicationCategoryScore {
  key: 'clarity' | 'correctness' | 'depth' | 'audience_fit'
  label: string
  score: number
  feedback: string
}

export interface CommunicationGradingSuccessResult {
  overall_score: number
  average_score: number
  categories: CommunicationCategoryScore[]
  strengths: string[]
  missing_points: string[]
  improved_outline: string[]
  retry_advice: string
  feedback: string
}

export interface GradingErrorResult {
  error: string
}

export type GradingSuccessResult =
  | BehavioralGradingSuccessResult
  | CommunicationGradingSuccessResult

export type GradingResult = GradingSuccessResult | GradingErrorResult

export interface TechChatRecap {
  highlights: string[]
  fuzzySpots: string[]
  topicsCovered: string[]
  takeawayLine: string
}

export interface GeneratedPrompt {
  title: string
  scenario: string
  prompt: string
  audience: string
  practice_mode: PracticeMode
  field: string
  topic: string
  what_to_cover: string[]
  time_guidance: string
  focus_areas: string[]
}

export interface Interview {
  id: string
  title: string
  role: string
  languages: string[]
  difficulty: string
  sessionType?: SessionType
  practiceMode?: PracticeMode | null
  audience?: string | null
  topic?: string | null
  promptContext?: string | null
  generatedPrompt?: GeneratedPrompt | null
  createdAt: Date
  messages: Message[]
  status: string
  questions?: string[]
  currentQuestionIndex?: number
  gradingResult?: GradingResult | null
}

export interface InterviewConfig {
  role: string;
  languages: string[];
  difficulty: 'intern' | 'mid' | 'senior';
  topic: string;
  promptContext: string;
}

export interface CommunicationSessionConfig {
  role: string
  practiceMode: PracticeMode
  audience: AudienceType
  topic: string
  promptContext: string
  difficulty: 'intern' | 'mid' | 'senior'
}

export const isGradingErrorResult = (
  gradingResult: GradingResult | null | undefined
): gradingResult is GradingErrorResult =>
  Boolean(gradingResult && typeof gradingResult === 'object' && 'error' in gradingResult)

export const isBehavioralGradingResult = (
  gradingResult: GradingResult | null | undefined
): gradingResult is BehavioralGradingSuccessResult =>
  Boolean(
    gradingResult &&
      typeof gradingResult === 'object' &&
      'scores' in gradingResult &&
      Array.isArray((gradingResult as BehavioralGradingSuccessResult).scores)
  )

export const isCommunicationGradingResult = (
  gradingResult: GradingResult | null | undefined
): gradingResult is CommunicationGradingSuccessResult =>
  Boolean(
    gradingResult &&
      typeof gradingResult === 'object' &&
      'categories' in gradingResult &&
      Array.isArray((gradingResult as CommunicationGradingSuccessResult).categories)
  )
