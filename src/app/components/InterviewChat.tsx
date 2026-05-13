import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Volume2,
} from 'lucide-react'
import {
  CommunicationGradingSuccessResult,
  GradingResult,
  Interview,
  Message,
  isBehavioralGradingResult,
  isCommunicationGradingResult,
  isGradingErrorResult,
} from '../types/Interview'
import CustomMicRecorder from './CustomMicRecorder'
import { interviewService } from '../services/interviewService'
import { AI_BASE, API_BASE } from '../services/api'
import { getAuthHeaders, getOrLoadAuthHeaders } from '../services/authToken'
import { confirmSessionExpired, notifySessionExpired } from '../services/authSession'
import {
  COMMUNICATION_CATEGORY_LABELS,
  getAudienceLabel,
  getSessionTypeLabel,
  normalizeGeneratedPrompt,
} from '../lib/practiceConfig'
import { getUserFacingErrorMessage } from '../lib/userFacingErrors'
import { AUREON_NAME } from '../lib/modelConfig'

interface InterviewChatProps {
  interview: Interview
  onUpdateInterview: (interview: Interview) => void
  resolvedTheme: 'light' | 'dark'
}

const EXPECTED_QUESTION_COUNT = 5
const MAX_TRANSCRIPT_PREVIEW_LENGTH = 220
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

const clampScore = (score: unknown) => {
  const parsed = Number(score)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(100, Math.round(parsed)))
}

const getScoreLabel = (percent: number) => {
  if (percent >= 90) return 'Excellent'
  if (percent >= 75) return 'Strong'
  if (percent >= 60) return 'Solid'
  return 'Needs work'
}

const getBarColor = (percent: number) => {
  if (percent >= 80) return 'bg-green-500'
  if (percent >= 65) return 'bg-emerald-400'
  if (percent >= 50) return 'bg-yellow-400'
  return 'bg-red-400'
}

const getTranscriptPreview = (transcription: string) => {
  if (transcription.length <= MAX_TRANSCRIPT_PREVIEW_LENGTH) return transcription

  const preview = transcription.slice(0, MAX_TRANSCRIPT_PREVIEW_LENGTH)
  const lastSpaceIndex = preview.lastIndexOf(' ')
  const safePreview = lastSpaceIndex > 0 ? preview.slice(0, lastSpaceIndex) : preview

  return `${safePreview.trim()}...`
}

const extractCandidateAnswers = (messages: Message[], questions: string[]): string[] => {
  const questionSet = new Set(questions)
  return questions.map((question) => {
    const qIdx = messages.findIndex((message) => message.role === 'interviewer' && message.content === question)
    if (qIdx === -1) return ''

    for (let index = qIdx + 1; index < messages.length; index += 1) {
      const message = messages[index]
      if (message.role === 'candidate') return message.content ?? ''
      if (message.role === 'interviewer' && questionSet.has(message.content)) break
    }

    return ''
  })
}

interface BehavioralScoreCandidate {
  question?: string
  answer?: string
  score?: unknown
  feedback?: string
}

interface BehavioralResultCandidate {
  scores?: BehavioralScoreCandidate[]
  error?: string
  feedback?: string
}

interface CommunicationCategoryCandidate {
  key?: string
  score?: unknown
  feedback?: string
}

interface CommunicationResultCandidate {
  overall_score?: unknown
  categories?: CommunicationCategoryCandidate[]
  strengths?: unknown[]
  missing_points?: unknown[]
  improved_outline?: unknown[]
  retry_advice?: string
  feedback?: string
  error?: string
}

const normalizeBehavioralGradingResult = (
  raw: BehavioralResultCandidate,
  questions: string[],
  answers: string[]
): GradingResult => {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Unable to normalize the interview results.' }
  }
  if (raw.error) {
    return { error: raw.error }
  }
  if (!Array.isArray(raw.scores)) return { error: 'Unable to normalize the interview results.' }
  const scores = raw.scores

  const canonicalQuestions = questions.slice(0, EXPECTED_QUESTION_COUNT)
  const canonicalAnswers = answers.slice(0, EXPECTED_QUESTION_COUNT)
  const used = new Set<number>()
  const normalizedScores = canonicalQuestions.map((question, index) => {
    const answer = canonicalAnswers[index] ?? ''
    let selected: BehavioralScoreCandidate | null = null

    for (let scoreIndex = 0; scoreIndex < scores.length; scoreIndex += 1) {
      const entry = scores[scoreIndex]
      if (used.has(scoreIndex) || !entry || typeof entry !== 'object') continue
      if (entry.question === question && entry.answer === answer) {
        selected = entry
        used.add(scoreIndex)
        break
      }
    }

    if (!selected) {
      for (let scoreIndex = 0; scoreIndex < scores.length; scoreIndex += 1) {
        const entry = scores[scoreIndex]
        if (used.has(scoreIndex) || !entry || typeof entry !== 'object') continue
        if (entry.question === question) {
          selected = entry
          used.add(scoreIndex)
          break
        }
      }
    }

    const normalizedEntry: {
      question: string
      answer: string
      score: number
      feedback?: string
    } = {
      question,
      answer,
      score: clampScore(selected?.score),
    }

    if (selected && typeof selected.feedback === 'string') {
      normalizedEntry.feedback = selected.feedback
    }

    return normalizedEntry
  })

  const average_score = normalizedScores.length
    ? Number(
        (
          normalizedScores.reduce((sum, item) => sum + item.score, 0) /
          normalizedScores.length
        ).toFixed(1)
      )
    : 0

  return {
    scores: normalizedScores,
    average_score,
    feedback: typeof raw.feedback === 'string' ? raw.feedback : '',
  }
}

const normalizeCommunicationGradingResult = (
  raw: CommunicationResultCandidate
): CommunicationGradingSuccessResult | { error: string } => {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Unable to evaluate this answer right now.' }
  }

  if (typeof raw.error === 'string') {
    return { error: raw.error }
  }

  const categoryEntries = Object.entries(COMMUNICATION_CATEGORY_LABELS).map(([key, label]) => {
    const selected = Array.isArray(raw.categories)
      ? raw.categories.find((entry) => entry?.key === key)
      : null

    return {
      key: key as keyof typeof COMMUNICATION_CATEGORY_LABELS,
      label,
      score: clampScore(selected?.score),
      feedback:
        typeof selected?.feedback === 'string'
          ? selected.feedback
          : `${AUREON_NAME} did not return explicit feedback for ${label.toLowerCase()}.`,
    }
  })

  const overallScore =
    typeof raw.overall_score === 'number'
      ? clampScore(raw.overall_score)
      : Number(
          (
            categoryEntries.reduce((sum, category) => sum + category.score, 0) / categoryEntries.length
          ).toFixed(1)
        )

  return {
    overall_score: overallScore,
    average_score: overallScore,
    categories: categoryEntries,
    strengths: Array.isArray(raw.strengths)
      ? raw.strengths.filter((item: unknown): item is string => typeof item === 'string').slice(0, 4)
      : [],
    missing_points: Array.isArray(raw.missing_points)
      ? raw.missing_points.filter((item: unknown): item is string => typeof item === 'string').slice(0, 4)
      : [],
    improved_outline: Array.isArray(raw.improved_outline)
      ? raw.improved_outline.filter((item: unknown): item is string => typeof item === 'string').slice(0, 5)
      : [],
    retry_advice:
      typeof raw.retry_advice === 'string'
        ? raw.retry_advice
        : 'Retry the answer once more, but lead with the main point sooner and make the structure more explicit.',
    feedback:
      typeof raw.feedback === 'string'
        ? raw.feedback
        : 'The answer was evaluated on clarity, correctness, depth, and audience fit.',
  }
}

const parseFeedback = (feedback: string) => {
  const pros: string[] = []
  const cons: string[] = []
  const lines = feedback
    .split(/\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean)
  let current: 'pros' | 'cons' | null = null

  for (const line of lines) {
    if (/pros[:]?/i.test(line)) {
      current = 'pros'
      continue
    }

    if (/cons[:]?/i.test(line)) {
      current = 'cons'
      continue
    }

    if (current === 'pros') pros.push(line.replace(/^[-•*]\s*/, ''))
    else if (current === 'cons') cons.push(line.replace(/^[-•*]\s*/, ''))
  }

  if (!pros.length && !cons.length) {
    pros.push(...lines)
  }

  return { pros, cons }
}

const dedupeFeedbackEntries = (entries: string[]) => {
  const seen = new Set<string>()

  return entries.filter((entry) => {
    const normalized = entry.trim()
    if (!normalized) return false

    const key = normalized.toLowerCase()
    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

const InterviewChat: React.FC<InterviewChatProps> = ({
  interview,
  onUpdateInterview,
  resolvedTheme,
}) => {
  const isBehavioralSession = (interview.sessionType ?? 'behavioral-interview') === 'behavioral-interview'
  const maxRecordingDuration = isBehavioralSession ? 60 : 120
  const modelLabel = AUREON_NAME
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showTranscription, setShowTranscription] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null)
  const [gradingLoading, setGradingLoading] = useState(false)
  const [loadingExistingGrade, setLoadingExistingGrade] = useState(false)
  const [expandedIndexes, setExpandedIndexes] = useState<number[]>([])
  const [expandedTranscriptIds, setExpandedTranscriptIds] = useState<string[]>([])
  const [timer, setTimer] = useState<number>(maxRecordingDuration)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)

  const promptDetails = useMemo(() => {
    const fallbackPrompt = interview.questions?.[0] ?? ''
    return normalizeGeneratedPrompt(interview.generatedPrompt, {
      title: interview.title,
      scenario: interview.promptContext || 'Practice communicating a technical idea clearly.',
      prompt: fallbackPrompt,
      audience: getAudienceLabel(interview.audience),
      practice_mode: interview.practiceMode ?? 'explain-concept',
      field: interview.role,
      topic: interview.topic ?? fallbackPrompt,
      what_to_cover: interview.languages ?? [],
      time_guidance: `Aim for ${maxRecordingDuration <= 60 ? '60' : '90 to 120'} seconds.`,
      focus_areas: interview.languages ?? [],
    })
  }, [interview, maxRecordingDuration])

  useEffect(() => {
    scrollToBottom()
  }, [interview.messages])

  useEffect(() => {
    setExpandedTranscriptIds([])
  }, [interview.id])

  useEffect(() => {
    setGradingResult(
      isCommunicationGradingResult(interview.gradingResult)
        ? normalizeCommunicationGradingResult(interview.gradingResult)
        : interview.gradingResult ?? null
    )
    setGradingLoading(false)
    setLoadingExistingGrade(false)
    setExpandedIndexes([])
    setRecordingError(null)
  }, [interview.id, interview.gradingResult])

  useEffect(() => {
    setTimer(maxRecordingDuration)
    setIsTimerRunning(false)
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [maxRecordingDuration, interview.id])

  useEffect(() => {
    const loadGradingResult = async () => {
      if (interview.status !== 'completed' || Number.isNaN(Number(interview.id))) return

      try {
        setLoadingExistingGrade(true)
        const response = await interviewService.getInterviewById(Number(interview.id))
        const converted = interviewService.convertToInterview(response)
        if (converted.gradingResult) {
          if (isBehavioralSession && isBehavioralGradingResult(converted.gradingResult)) {
            const questions = converted.questions || []
            const answers = extractCandidateAnswers(converted.messages || [], questions)
            setGradingResult(normalizeBehavioralGradingResult(converted.gradingResult, questions, answers))
          } else if (isCommunicationGradingResult(converted.gradingResult)) {
            setGradingResult(normalizeCommunicationGradingResult(converted.gradingResult))
          } else {
            setGradingResult(converted.gradingResult)
          }
        }
      } catch (error) {
        console.error('Failed to load grading result:', error)
      } finally {
        setLoadingExistingGrade(false)
      }
    }

    void loadGradingResult()
  }, [interview.id, interview.status, isBehavioralSession])

  useEffect(() => {
    if (interview.messages.length > 0) return

    const welcomeContent = isBehavioralSession
      ? 'Welcome to your behavioral interview. Click the microphone to begin speaking your answers.'
      : 'Welcome to your communication drill. Record one focused answer when you are ready.'

    const welcome: Message = {
      id: Date.now().toString(),
      role: 'interviewer',
      content: welcomeContent,
      timestamp: new Date(),
      transcription: `[${modelLabel}]: ${welcomeContent}`,
      isThinking: false,
    }

    onUpdateInterview({ ...interview, messages: [welcome] })
  }, [interview, isBehavioralSession, modelLabel, onUpdateInterview])

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

    if (!cameraOn) {
      if (videoNode) {
        videoNode.srcObject = null
      }
      return () => undefined
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((mediaStream) => {
        activeStream = mediaStream
        if (videoNode) {
          videoNode.srcObject = mediaStream
        }
      })
      .catch(() => {
        if (videoNode) {
          videoNode.srcObject = null
        }
      })

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
      if (videoNode) {
        videoNode.srcObject = null
      }
    }
  }, [cameraOn])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const startTimer = () => {
    setTimer(maxRecordingDuration)
    setIsTimerRunning(true)
  }

  const stopTimer = () => {
    setIsTimerRunning(false)
    setTimer(maxRecordingDuration)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
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

    if (!response.ok) {
      throw new Error('Failed to process voice input.')
    }

    const result = await response.json()
    if (result.error) {
      throw new Error(result.error)
    }

    return result.user_input as string
  }

  const persistMessages = async (messages: Message[]) => {
    if (Number.isNaN(Number(interview.id))) return
    try {
      await interviewService.updateInterviewMessages(Number(interview.id), { messages })
    } catch (error) {
      console.error('Failed to persist session messages:', error)
    }
  }

  const buildThinkingMessage = (): Message => ({
    id: `${Date.now()}-thinking`,
    role: 'interviewer',
    content: `${modelLabel} is thinking...`,
    timestamp: new Date(),
    transcription: `${modelLabel} is thinking...`,
    isThinking: true,
  })

  const handleTechnicalDrillUpload = async (audioBlob: Blob) => {
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

      const thinkingMessage = buildThinkingMessage()
      const currentMessages = [...interview.messages, userMessage, thinkingMessage]
      onUpdateInterview({ ...interview, messages: currentMessages })

      const evaluationResponse = await fetch(`${AI_BASE}/evaluate_drill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          field: interview.role,
          practice_mode: interview.practiceMode,
          audience: interview.audience,
          topic: interview.topic,
          additional_context: interview.promptContext,
          generated_prompt: interview.generatedPrompt ?? promptDetails,
          transcript,
          session_id: Number.isNaN(Number(interview.id)) ? null : Number(interview.id),
        }),
      })

      if (!evaluationResponse.ok) {
        throw new Error(`Failed to evaluate this answer (${evaluationResponse.status})`)
      }

      const evaluationData = normalizeCommunicationGradingResult(await evaluationResponse.json())
      if (isGradingErrorResult(evaluationData)) {
        throw new Error(evaluationData.error)
      }

      const messagesWithoutThinking = currentMessages.filter((message) => message.id !== thinkingMessage.id)
      const strongestPoint = evaluationData.strengths[0] ?? 'The explanation had a clear foundation.'
      const missingPoint =
        evaluationData.missing_points[0] ?? 'Make the structure even easier to follow on the next pass.'
      const summaryMessage: Message = {
        id: `${Date.now()}-feedback`,
        role: 'interviewer',
        content: `Strongest signal: ${strongestPoint} Next fix: ${missingPoint}`,
        timestamp: new Date(),
        transcription: `[${modelLabel}]: Strongest signal: ${strongestPoint} Next fix: ${missingPoint}`,
        isThinking: false,
      }

      const completedMessages = [...messagesWithoutThinking, summaryMessage]
      const updatedInterview: Interview = {
        ...interview,
        messages: completedMessages,
        status: 'completed',
        gradingResult: evaluationData,
      }

      setGradingResult(evaluationData)
      onUpdateInterview(updatedInterview)
      await persistMessages(completedMessages)

      if (!Number.isNaN(Number(interview.id))) {
        await interviewService.updateGradingResult(Number(interview.id), {
          gradingResult: evaluationData,
        })
      }
    } catch (error) {
      const message = getUserFacingErrorMessage('drillEvaluation', error)
      console.error('Failed to evaluate drill:', error)
      setRecordingError(message)
      setGradingResult({ error: message })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBehavioralUpload = async (audioBlob: Blob) => {
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
        transcription: `[Candidate]: ${transcript}`,
        isThinking: false,
      }

      const thinkingMessage = buildThinkingMessage()
      const currentMessages = [...interview.messages, userMessage, thinkingMessage]
      onUpdateInterview({ ...interview, messages: currentMessages })

      const currentQuestionIndex = interview.currentQuestionIndex || 0
      const questions = interview.questions || []
      const currentQuestion = questions[currentQuestionIndex]
      const isLastQuestion = currentQuestionIndex >= questions.length - 1
      const nextQuestion = isLastQuestion ? '' : questions[currentQuestionIndex + 1]

      const previousQA = []
      const priorAnswers = extractCandidateAnswers(interview.messages, questions)
      for (let index = 0; index < currentQuestionIndex; index += 1) {
        previousQA.push({
          question: questions[index],
          answer: priorAnswers[index] || '',
        })
      }

      const ackResponse = await fetch(`${AI_BASE}/interview_ack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          current_question: currentQuestion,
          user_answer: transcript,
          previous_qa: previousQA,
          next_question: nextQuestion,
          is_last_question: isLastQuestion,
        }),
      })

      if (!ackResponse.ok) {
        throw new Error(`Failed to continue the interview (${ackResponse.status})`)
      }

      const ackResult = await ackResponse.json()
      const messagesWithoutThinking = currentMessages.filter((message) => message.id !== thinkingMessage.id)

      const acknowledgementMessage: Message = {
        id: `${Date.now()}-ack`,
        role: 'interviewer',
        content: ackResult.acknowledgement,
        timestamp: new Date(),
        transcription: `[${modelLabel}]: ${ackResult.acknowledgement}`,
        isThinking: false,
      }

      messagesWithoutThinking.push(acknowledgementMessage)

      const closingMessage: Message = {
        id: `${Date.now()}-next`,
        role: 'interviewer',
        content: isLastQuestion ? ackResult.goodbye : ackResult.next_question,
        timestamp: new Date(),
        transcription: `[${modelLabel}]: ${isLastQuestion ? ackResult.goodbye : ackResult.next_question}`,
        isThinking: false,
      }

      messagesWithoutThinking.push(closingMessage)

      const updatedInterview = {
        ...interview,
        messages: messagesWithoutThinking,
        currentQuestionIndex: currentQuestionIndex + 1,
      }

      onUpdateInterview(updatedInterview)
      await persistMessages(messagesWithoutThinking)

      try {
        const authHeaders = await getOrLoadAuthHeaders(API_BASE)
        const response = await fetch(`${API_BASE}/interviews/${interview.id}/current_question_index`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          credentials: authHeaders.Authorization ? 'omit' : 'include',
          body: JSON.stringify({ currentQuestionIndex: updatedInterview.currentQuestionIndex }),
        })

        if (response.status === 401) {
          const sessionExpired = await confirmSessionExpired()
          if (sessionExpired) {
            notifySessionExpired()
          }
          return
        }

        if (!response.ok) {
          throw new Error(`Failed to update current question index (${response.status})`)
        }
      } catch (error) {
        console.error('Failed to update current question index:', error)
      }

      if (isLastQuestion) {
        const canonicalQuestions = (updatedInterview.questions || []).slice(0, EXPECTED_QUESTION_COUNT)
        const userAnswers = extractCandidateAnswers(updatedInterview.messages, canonicalQuestions)

        if (
          canonicalQuestions.length === EXPECTED_QUESTION_COUNT &&
          userAnswers.length === EXPECTED_QUESTION_COUNT
        ) {
          setGradingLoading(true)
          setGradingResult(null)

          try {
            const gradeResponse = await fetch(`${AI_BASE}/grade_interview`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
              credentials: 'include',
              body: JSON.stringify({
                questions: canonicalQuestions,
                answers: userAnswers,
                interview_id: Number.isNaN(Number(interview.id)) ? null : Number(interview.id),
              }),
            })

            if (!gradeResponse.ok) {
              throw new Error(`Failed to grade the interview (${gradeResponse.status})`)
            }

            const rawGrade = await gradeResponse.json()
            const normalizedGrade = normalizeBehavioralGradingResult(
              rawGrade,
              canonicalQuestions,
              userAnswers
            )
            setGradingResult(normalizedGrade)

            const completedInterview: Interview = {
              ...updatedInterview,
              status: 'completed',
              gradingResult: normalizedGrade,
            }

            onUpdateInterview(completedInterview)
            if (!Number.isNaN(Number(interview.id))) {
              await interviewService.updateGradingResult(Number(interview.id), {
                gradingResult: normalizedGrade,
              })
            }
          } catch (error) {
            const message = getUserFacingErrorMessage('interviewGrading', error)
            setGradingResult({ error: message })
          } finally {
            setGradingLoading(false)
          }
        }
      }
    } catch (error) {
      const message = getUserFacingErrorMessage('interviewProgress', error)
      console.error('Failed to process voice input:', error)
      setRecordingError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleExpand = (index: number) => {
    setExpandedIndexes((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
    )
  }

  const toggleTranscriptExpand = (messageId: string) => {
    setExpandedTranscriptIds((prev) =>
      prev.includes(messageId) ? prev.filter((item) => item !== messageId) : [...prev, messageId]
    )
  }

  const behavioralSummaryFeedback = useMemo(() => {
    if (!gradingResult || !isBehavioralGradingResult(gradingResult)) {
      return { pros: [], cons: [] }
    }

    const pros: string[] = []
    const cons: string[] = []

    if (gradingResult.feedback) {
      const parsedOverallFeedback = parseFeedback(gradingResult.feedback)
      pros.push(...parsedOverallFeedback.pros)
      cons.push(...parsedOverallFeedback.cons)
    }

    gradingResult.scores.forEach((score) => {
      if (!score.feedback) return

      const parsedScoreFeedback = parseFeedback(score.feedback)
      pros.push(...parsedScoreFeedback.pros)
      cons.push(...parsedScoreFeedback.cons)
    })

    return {
      pros: dedupeFeedbackEntries(pros).slice(0, 4),
      cons: dedupeFeedbackEntries(cons).slice(0, 4),
    }
  }, [gradingResult])

  const sessionHeading = isBehavioralSession ? interview.title : 'Communication Drill'
  const shouldShowGrading = interview.status === 'completed' || gradingResult
  return (
    <div className="flex h-full bg-white">
      <div className={`flex flex-1 flex-col items-center justify-start overflow-y-auto ${showTranscription ? 'pr-80' : ''}`}>
        <div className="w-full border-b border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-600">
                {getSessionTypeLabel(interview.sessionType)}
              </div>
              <h1 className="mt-3 text-2xl font-light text-gray-900">{sessionHeading}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                {!isBehavioralSession && interview.role ? (
                  <>
                    <span>{interview.role}</span>
                    <span>•</span>
                  </>
                ) : null}
                <span className="capitalize">{interview.difficulty} level</span>
                {isBehavioralSession && interview.languages.length > 0 ? (
                  <>
                    <span>•</span>
                    <span>Focus areas: {interview.languages.join(', ')}</span>
                  </>
                ) : null}
                {interview.status === 'completed' ? (
                  <>
                    <span>•</span>
                    <span className="font-medium text-green-600">Completed</span>
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
              {interview.status !== 'completed' ? (
                <div className="flex items-center gap-2 text-green-500">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  <span className="text-sm">Live</span>
                </div>
              ) : null}
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

            {loadingExistingGrade ? (
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                Loading saved results...
              </div>
            ) : gradingLoading ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl bg-white p-8 shadow-sm">
                <Loader2 className="mb-4 animate-spin text-emerald-500" size={40} />
                <div className="text-lg font-medium text-emerald-700">Reviewing your answer...</div>
              </div>
            ) : shouldShowGrading && gradingResult && !isGradingErrorResult(gradingResult) ? (
              isBehavioralSession && isBehavioralGradingResult(gradingResult) ? (
                <>
                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xl font-semibold text-gray-900">Interview Results</div>
                        <div className="mt-1 text-sm text-gray-500">Total Score</div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900">
                          {Math.round(gradingResult.average_score)}%
                        </div>
                        <div className="mt-1 text-xs font-medium text-gray-500">
                          {getScoreLabel(Number(gradingResult.average_score) || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`${getBarColor(Number(gradingResult.average_score) || 0)} h-3 rounded-full`}
                        style={{ width: `${Math.min(100, Math.max(0, Number(gradingResult.average_score) || 0))}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="mb-4 text-lg font-semibold text-gray-900">Question Breakdown</div>
                    <div className="flex flex-col gap-4">
                      {gradingResult.scores.map((item, index) => {
                        const score = Number(item.score) || 0
                        const percent = Math.round(Math.min(100, Math.max(0, score)))
                        const isGood = percent >= 75

                        return (
                          <div key={`${item.question}-${index}`} className="border-b pb-4 last:border-b-0">
                            <div className="mb-1 flex items-center gap-2">
                              {isGood ? (
                                <CheckCircle2 className="text-green-500" size={20} />
                              ) : (
                                <AlertCircle className="text-yellow-500" size={20} />
                              )}
                              <button
                                className="flex flex-1 items-center gap-2 text-left font-semibold text-gray-900 focus:outline-none"
                                onClick={() => toggleExpand(index)}
                              >
                                Question {index + 1}
                                {expandedIndexes.includes(index) ? (
                                  <ChevronUp size={18} />
                                ) : (
                                  <ChevronDown size={18} />
                                )}
                              </button>
                              <div className="font-semibold text-gray-700">{score}/100</div>
                              <div className="text-xs text-gray-500">{percent}%</div>
                            </div>
                            <div className="mb-2 ml-7 text-sm text-gray-700">{item.question}</div>
                            <div className="mb-2 ml-7 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                              <div className={`${getBarColor(percent)} h-2 rounded-full`} style={{ width: `${percent}%` }} />
                            </div>
                            {expandedIndexes.includes(index) ? (
                              <div className="ml-7 mt-2 rounded-lg border bg-gray-50 p-4">
                                <div className="mb-1 text-xs text-gray-500">Your Answer</div>
                                <div className="mb-2 text-sm text-gray-800">{item.answer}</div>
                                {item.feedback ? (
                                  <div className="flex gap-8">
                                    <div>
                                      <div className="mb-1 font-semibold text-green-700">Pros</div>
                                      <ul className="ml-5 list-disc text-sm text-green-800">
                                        {parseFeedback(item.feedback).pros.map((entry) => (
                                          <li key={entry}>{entry}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <div className="mb-1 font-semibold text-red-700">Cons</div>
                                      <ul className="ml-5 list-disc text-sm text-red-800">
                                        {parseFeedback(item.feedback).cons.map((entry) => (
                                          <li key={entry}>{entry}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                        <CheckCircle2 size={18} />
                        Strong signals
                      </div>
                      <ul className="mt-4 space-y-3 text-sm leading-6 text-emerald-950">
                        {behavioralSummaryFeedback.pros.length > 0 ? (
                          behavioralSummaryFeedback.pros.map((entry) => <li key={entry}>• {entry}</li>)
                        ) : (
                          <li>• Your answers stayed relevant and understandable across the interview.</li>
                        )}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                        <AlertCircle size={18} />
                        Tighten next
                      </div>
                      <ul className="mt-4 space-y-3 text-sm leading-6 text-amber-950">
                        {behavioralSummaryFeedback.cons.length > 0 ? (
                          behavioralSummaryFeedback.cons.map((entry) => <li key={entry}>• {entry}</li>)
                        ) : (
                          <li>• Add more specific examples and make the deciding detail clearer.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </>
              ) : isCommunicationGradingResult(gradingResult) ? (
                <>
                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xl font-semibold text-gray-900">Drill Results</div>
                        <div className="mt-1 text-sm text-gray-500">Overall communication score</div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900">{Math.round(gradingResult.overall_score)}%</div>
                        <div className="mt-1 text-xs font-medium text-gray-500">
                          {getScoreLabel(gradingResult.overall_score)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`${getBarColor(gradingResult.overall_score)} h-3 rounded-full`}
                        style={{ width: `${gradingResult.overall_score}%` }}
                      />
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {gradingResult.categories.map((category) => (
                        <div key={category.key} className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-gray-900">{category.label}</div>
                            <div className="text-sm font-medium text-gray-600">{category.score}%</div>
                          </div>
                          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                            <div
                              className={`${getBarColor(category.score)} h-2 rounded-full`}
                              style={{ width: `${category.score}%` }}
                            />
                          </div>
                          <p className="mt-3 text-sm leading-6 text-gray-600">{category.feedback}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                        <CheckCircle2 size={18} />
                        Strong signals
                      </div>
                      <ul className="mt-4 space-y-3 text-sm leading-6 text-emerald-950">
                        {gradingResult.strengths.length > 0 ? (
                          gradingResult.strengths.map((item) => <li key={item}>• {item}</li>)
                        ) : (
                          <li>• {AUREON_NAME} did not return extra strengths for this answer.</li>
                        )}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                        <AlertCircle size={18} />
                        Tighten next
                      </div>
                      <ul className="mt-4 space-y-3 text-sm leading-6 text-amber-950">
                        {gradingResult.missing_points.length > 0 ? (
                          gradingResult.missing_points.map((item) => <li key={item}>• {item}</li>)
                        ) : (
                          <li>• Add a clearer structure and make your most important point earlier.</li>
                        )}
                      </ul>
                    </div>
                  </div>

                </>
              ) : null
            ) : isGradingErrorResult(gradingResult) ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                {gradingResult.error}
              </div>
            ) : interview.status !== 'completed' ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center px-4 py-6">
                <div className="mb-4 max-w-xl text-center text-sm text-gray-600">
                  {isBehavioralSession
                    ? 'Record your next answer when you are ready.'
                    : 'Record one clear answer. Naild will score the explanation right after you finish.'}
                </div>
                <CustomMicRecorder
                  onAudioRecorded={isBehavioralSession ? handleBehavioralUpload : handleTechnicalDrillUpload}
                  onRecordingStart={startTimer}
                  onRecordingStop={stopTimer}
                  onRecordingError={setRecordingError}
                  maxDuration={maxRecordingDuration}
                  idleText={
                    isBehavioralSession
                      ? 'Click the microphone to answer the current question.'
                      : 'Click the microphone to answer this drill.'
                  }
                  processingText={isProcessing ? `${modelLabel} is reviewing your answer...` : 'Processing...'}
                  wrapperClassName="flex flex-col items-center gap-3"
                  statusClassName="text-center text-sm text-gray-600"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {showTranscription ? (
        <div className="fixed right-0 top-0 flex h-full w-80 flex-col border-l border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Session Transcript</h3>
              <Volume2 size={16} className="text-gray-400" />
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {interview.messages.map((message) => (
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
                      {modelLabel} is thinking
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
                        onClick={() => toggleTranscriptExpand(message.id)}
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
      ) : null}
    </div>
  )
}

export default InterviewChat
