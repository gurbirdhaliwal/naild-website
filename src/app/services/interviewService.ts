import { GeneratedPrompt, GradingResult, Interview, Message, SessionType, PracticeMode, AudienceType } from '../types/Interview';
import { API_BASE } from './api';
import { CSRF_HEADER_NAME, getCsrfToken } from './csrf';
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

const isHttpError = (error: unknown) =>
  error instanceof Error && error.message.startsWith('HTTP error!')

class InterviewService {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    try {
      const isDebugLoggingEnabled = process.env.NODE_ENV !== 'production';
      if (isDebugLoggingEnabled) {
        console.debug(`Making request to: ${API_BASE}${endpoint}`);
        console.debug('Request options:', options);
      }

      const method = (options.method ?? 'GET').toUpperCase();
      const requiresCsrf = !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method);
      const headers = new Headers(options.headers);
      headers.set('Content-Type', 'application/json');
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
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}${errorText ? ` - ${errorText}` : ''}`);
      }

      const data = await response.json();
      if (isDebugLoggingEnabled) {
        console.debug('Response data:', data);
      }
      return data;
    } catch (error) {
      console.error(`Network error for ${endpoint}:`, error);
      throw error;
    }
  }

  async getUserInterviews(): Promise<InterviewResponse[]> {
    try {
      return await this.makeRequest('/interviews');
    } catch {
      console.log('Backend not available, returning empty interviews list');
      return [];
    }
  }

  async getInterviewById(id: number): Promise<InterviewResponse> {
    try {
      return await this.makeRequest(`/interviews/${id}`);
    } catch {
      throw new Error('Interview not found');
    }
  }

  async createInterview(data: CreateInterviewRequest): Promise<InterviewResponse> {
    try {
      return await this.makeRequest('/interviews', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (isHttpError(error)) {
        throw error
      }
      // Return a mock response for testing
      const mockResponse: InterviewResponse = {
        id: Date.now(),
        title: data.title,
        role: data.role,
        languages: JSON.stringify(data.languages),
        difficulty: data.difficulty,
        sessionType: data.sessionType ?? 'behavioral-interview',
        practiceMode: data.practiceMode ?? null,
        audience: data.audience ?? null,
        topic: data.topic ?? null,
        promptContext: data.promptContext ?? null,
        generatedPrompt: data.generatedPrompt ? JSON.stringify(data.generatedPrompt) : null,
        status: 'active',
        questions: JSON.stringify(data.questions),
        messages: '[]',
        currentQuestionIndex: 0,
        gradingResult: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return mockResponse;
    }
  }



  async updateInterviewMessages(id: number, data: UpdateMessagesRequest): Promise<InterviewResponse> {
    try {
      return await this.makeRequest(`/interviews/${id}/messages`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (isHttpError(error)) {
        throw error
      }
      console.log('Backend not available, skipping message update');
      // Return a mock response
      const mockResponse: InterviewResponse = {
        id: id,
        title: 'Practice Session',
        role: 'Software Engineer',
        languages: '[]',
        difficulty: 'mid',
        sessionType: 'technical-communication',
        practiceMode: 'explain-concept',
        audience: 'peer-engineer',
        topic: null,
        promptContext: null,
        generatedPrompt: null,
        status: 'active',
        questions: '[]',
        messages: JSON.stringify(data.messages),
        currentQuestionIndex: 0,
        gradingResult: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return mockResponse;
    }
  }

  async updateGradingResult(id: number, data: UpdateGradingRequest): Promise<InterviewResponse> {
    try {
      return await this.makeRequest(`/interviews/${id}/grading`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (isHttpError(error)) {
        throw error
      }
      console.log('Backend not available, skipping grading update');
      // Return a mock response
      const mockResponse: InterviewResponse = {
        id: id,
        title: 'Practice Session',
        role: 'Software Engineer',
        languages: '[]',
        difficulty: 'mid',
        sessionType: 'technical-communication',
        practiceMode: 'explain-concept',
        audience: 'peer-engineer',
        topic: null,
        promptContext: null,
        generatedPrompt: null,
        status: 'completed',
        questions: '[]',
        messages: '[]',
        currentQuestionIndex: 0,
        gradingResult: JSON.stringify(data.gradingResult),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return mockResponse;
    }
  }

  async updateInterviewTitle(id: number, data: UpdateInterviewTitleRequest): Promise<InterviewResponse> {
    try {
      return await this.makeRequest(`/interviews/${id}/title`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (isHttpError(error)) {
        throw error
      }
      try {
        return await this.makeRequest(`/interviews/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      } catch (patchError) {
        if (isHttpError(patchError)) {
          throw patchError
        }
        console.log('Backend not available, skipping interview title update');
        const mockResponse: InterviewResponse = {
          id: id,
          title: data.title,
          role: 'Software Engineer',
          languages: '[]',
          difficulty: 'mid',
          sessionType: 'technical-communication',
          practiceMode: 'explain-concept',
          audience: 'peer-engineer',
          topic: null,
          promptContext: null,
          generatedPrompt: null,
          status: 'active',
          questions: '[]',
          messages: '[]',
          currentQuestionIndex: 0,
          gradingResult: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return mockResponse;
      }
    }
  }

  async deleteInterview(id: number): Promise<void> {
    try {
      return await this.makeRequest(`/interviews/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      if (isHttpError(error)) {
        throw error
      }
      console.log('Backend not available, skipping delete');
      // Don't throw error, just log it
    }
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
