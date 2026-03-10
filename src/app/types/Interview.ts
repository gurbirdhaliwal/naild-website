export interface Message {
  id: string
  role: 'candidate' | 'interviewer'
  content: string
  timestamp: Date
  transcription: string
  isThinking: boolean
}

export interface GradingScore {
  question: string
  answer: string
  score: number
  feedback?: string
}

export interface GradingSuccessResult {
  scores: GradingScore[]
  average_score: number
  feedback: string
}

export interface GradingErrorResult {
  error: string
}

export type GradingResult = GradingSuccessResult | GradingErrorResult

export interface Interview {
  id: string
  title: string
  role: string
  languages: string[]
  difficulty: string
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
}
  
