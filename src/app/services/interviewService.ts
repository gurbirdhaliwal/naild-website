import { GeneratedPrompt, GradingResult, Interview, Message, SessionType, PracticeMode, AudienceType } from '../types/Interview';
import { API_BASE } from './api';
import { getAuthHeaders } from './authToken';
import { CSRF_HEADER_NAME, getCsrfToken } from './csrf';
import { confirmSessionExpired, notifySessionExpired } from './authSession';
import { normalizeGeneratedPrompt } from '../lib/practiceConfig';

const toValidDate = (value: unknown, fallback: Date = new Date()): Date => {
  const date =
    value instanceof Date
      ? new Date(value)
      : typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : new Date(fallback);

  return Number.isNaN(date.getTime()) ? new Date(fallback) : date;
};

const normalizeMessages = (messages: string, fallbackTimestamp: Date): Message[] => {
  try {
    const parsed = JSON.parse(messages);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((message, index) => {
      const candidate = typeof message === 'object' && message !== null ? message : {};
      const rawMessage = candidate as Partial<Message> & { timestamp?: unknown };

      return {
        id: typeof rawMessage.id === 'string' ? rawMessage.id : `message-${index}`,
        role: rawMessage.role === 'candidate' ? 'candidate' : 'interviewer',
        content: typeof rawMessage.content === 'string' ? rawMessage.content : '',
        timestamp: toValidDate(rawMessage.timestamp, fallbackTimestamp),
        transcription: typeof rawMessage.transcription === 'string' ? rawMessage.transcription : '',
        isThinking: Boolean(rawMessage.isThinking),
      };
    });
  } catch {
    return [];
  }
};

const parseStringArray = (value: string | null | undefined): string[] => {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

const parseGeneratedPrompt = (value: string | null | undefined): GeneratedPrompt | null => {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object') return null
    return normalizeGeneratedPrompt(parsed as Partial<GeneratedPrompt>, {
      title: 'Practice Session',
      scenario: 'Practice communicating a technical idea clearly.',
      prompt: 'Explain the technical idea clearly and helpfully.',
      audience: 'Audience',
      practice_mode: 'explain-concept',
      field: 'Developer',
      topic: 'Technical communication',
      what_to_cover: [],
      time_guidance: 'Aim for 60 to 90 seconds.',
      focus_areas: [],
    })
  } catch {
    return null
  }
}

const parseGradingResult = (value: string | null | undefined): GradingResult | null => {
  if (!value) return null

  try {
    return JSON.parse(value) as GradingResult
  } catch {
    return null
  }
}

export interface InterviewResponse {
  id: number;
  title: string;
  role: string;
  languages: string;
  difficulty: string;
  sessionType?: SessionType | null;
  practiceMode?: PracticeMode | null;
  audience?: AudienceType | null;
  topic?: string | null;
  promptContext?: string | null;
  generatedPrompt?: string | null;
  status: string;
  questions: string;
  messages: string;
  currentQuestionIndex: number;
  gradingResult: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInterviewRequest {
  title: string;
  role: string;
  languages: string[];
  difficulty: string;
  questions: string[];
  sessionType?: SessionType;
  practiceMode?: PracticeMode | null;
  audience?: AudienceType | null;
  topic?: string | null;
  promptContext?: string | null;
  generatedPrompt?: GeneratedPrompt | null;
}


export interface UpdateMessagesRequest {
  messages: Message[];
}

export interface UpdateGradingRequest {
  gradingResult: GradingResult;
}

export interface UpdateInterviewTitleRequest {
  title: string;
}

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const isHttpError = (error: unknown): error is HttpError => error instanceof HttpError

const readResponsePayload = async (response: Response): Promise<unknown> => {
  if (response.status === 204) {
    return null
  }

  const text = await response.text()
  if (!text) {
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return JSON.parse(text)
  }

  return text
}

class InterviewService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const isDebugLoggingEnabled = process.env.NODE_ENV !== 'production';
      if (isDebugLoggingEnabled) {
        console.debug(`Making request to: ${API_BASE}${endpoint}`);
        console.debug('Request options:', options);
      }

      const method = (options.method ?? 'GET').toUpperCase();
      const requiresCsrf = !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method);
      const headers = new Headers(options.headers);
      if (options.body != null && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      for (const [name, value] of Object.entries(getAuthHeaders())) {
        if (!headers.has(name)) {
          headers.set(name, value);
        }
      }
      if (requiresCsrf) {
        headers.set(CSRF_HEADER_NAME, await getCsrfToken());
      }
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers,
      });

      if (isDebugLoggingEnabled) {
        console.debug(`Response status: ${response.status}`);
      }
      
      if (!response.ok) {
        await readResponsePayload(response).catch(() => null);
        if (response.status === 401) {
          const sessionExpired = await confirmSessionExpired();
          if (sessionExpired) {
            notifySessionExpired();
          }
        }
        throw new HttpError(
          response.status,
          `Request failed (${response.status})`
        );
      }

      const data = (await readResponsePayload(response)) as T;
      if (isDebugLoggingEnabled) {
        console.debug('Response data:', data);
      }
      return data;
    } catch (error) {
      if (!(isHttpError(error) && error.status === 401)) {
        console.error(`Network error for ${endpoint}:`, error);
      }
      throw error;
    }
  }

  async getUserInterviews(): Promise<InterviewResponse[]> {
    return await this.makeRequest<InterviewResponse[]>('/interviews');
  }

  async getInterviewById(id: number): Promise<InterviewResponse> {
    return await this.makeRequest<InterviewResponse>(`/interviews/${id}`);
  }

  async createInterview(data: CreateInterviewRequest): Promise<InterviewResponse> {
    return await this.makeRequest<InterviewResponse>('/interviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }



  async updateInterviewMessages(id: number, data: UpdateMessagesRequest): Promise<InterviewResponse> {
    return await this.makeRequest<InterviewResponse>(`/interviews/${id}/messages`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateGradingResult(id: number, data: UpdateGradingRequest): Promise<InterviewResponse> {
    return await this.makeRequest<InterviewResponse>(`/interviews/${id}/grading`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateInterviewTitle(id: number, data: UpdateInterviewTitleRequest): Promise<InterviewResponse> {
    try {
      return await this.makeRequest<InterviewResponse>(`/interviews/${id}/title`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (isHttpError(error) && ![404, 405, 501].includes(error.status)) {
        throw error
      }

      return await this.makeRequest<InterviewResponse>(`/interviews/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }
  }

  async deleteInterview(id: number): Promise<void> {
    await this.makeRequest<unknown>(`/interviews/${id}`, {
      method: 'DELETE',
    });
  }

  // Helper method to convert InterviewResponse to Interview
  convertToInterview(response: InterviewResponse): Interview {
    const safeResponse = (response ?? {}) as Partial<InterviewResponse>
    const createdAt = toValidDate(safeResponse.createdAt);

    return {
      id:
        typeof safeResponse.id === 'number' || typeof safeResponse.id === 'string'
          ? safeResponse.id.toString()
          : Date.now().toString(),
      title: typeof safeResponse.title === 'string' && safeResponse.title.trim() ? safeResponse.title : 'Practice Session',
      role: typeof safeResponse.role === 'string' && safeResponse.role.trim() ? safeResponse.role : 'Software Engineer',
      languages: parseStringArray(safeResponse.languages),
      difficulty:
        typeof safeResponse.difficulty === 'string' && safeResponse.difficulty.trim()
          ? safeResponse.difficulty
          : 'mid',
      sessionType: safeResponse.sessionType ?? 'behavioral-interview',
      practiceMode: safeResponse.practiceMode ?? null,
      audience: safeResponse.audience ?? null,
      topic: safeResponse.topic ?? null,
      promptContext: safeResponse.promptContext ?? null,
      generatedPrompt: parseGeneratedPrompt(safeResponse.generatedPrompt),
      createdAt,
      messages: normalizeMessages(typeof safeResponse.messages === 'string' ? safeResponse.messages : '[]', createdAt),
      status: typeof safeResponse.status === 'string' ? safeResponse.status : 'active',
      questions: parseStringArray(safeResponse.questions),
      currentQuestionIndex:
        typeof safeResponse.currentQuestionIndex === 'number' ? safeResponse.currentQuestionIndex : 0,
      gradingResult: parseGradingResult(safeResponse.gradingResult),
    };
  }

  // Helper method to convert Interview to CreateInterviewRequest
  convertToCreateRequest(interview: Interview): CreateInterviewRequest {
    return {
      title: interview.title,
      role: interview.role,
      languages: interview.languages,
      difficulty: interview.difficulty,
      questions: interview.questions || [],
      sessionType: interview.sessionType,
      practiceMode: interview.practiceMode ?? null,
      audience: interview.audience ?? null,
      topic: interview.topic ?? null,
      promptContext: interview.promptContext ?? null,
      generatedPrompt: interview.generatedPrompt ?? null,
    };
  }
}

export const interviewService = new InterviewService(); 
