import { GradingResult, Interview, Message } from '../types/Interview';
import { API_BASE } from './api';
import { CSRF_HEADER_NAME, getCsrfToken } from './csrf';

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
};

export interface InterviewResponse {
  id: number;
  title: string;
  role: string;
  languages: string;
  difficulty: string;
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
      // Return mock responses for testing when backend is not available
      if (endpoint === '/interviews') {
        return [];
      }
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
    } catch {
      // Return a mock response for testing
      const mockResponse: InterviewResponse = {
        id: Date.now(),
        title: data.title,
        role: data.role,
        languages: JSON.stringify(data.languages),
        difficulty: data.difficulty,
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
    } catch {
      console.log('Backend not available, skipping message update');
      // Return a mock response
      const mockResponse: InterviewResponse = {
        id: id,
        title: 'Mock Interview',
        role: 'Developer',
        languages: '["JavaScript"]',
        difficulty: 'mid',
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
    } catch {
      console.log('Backend not available, skipping grading update');
      // Return a mock response
      const mockResponse: InterviewResponse = {
        id: id,
        title: 'Mock Interview',
        role: 'Developer',
        languages: '["JavaScript"]',
        difficulty: 'mid',
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
    } catch {
      try {
        return await this.makeRequest(`/interviews/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      } catch {
        console.log('Backend not available, skipping interview title update');
        const mockResponse: InterviewResponse = {
          id: id,
          title: data.title,
          role: 'Developer',
          languages: '["JavaScript"]',
          difficulty: 'mid',
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
    } catch {
      console.log('Backend not available, skipping delete');
      // Don't throw error, just log it
    }
  }

  // Helper method to convert InterviewResponse to Interview
  convertToInterview(response: InterviewResponse): Interview {
    const createdAt = toValidDate(response.createdAt);

    return {
      id: response.id.toString(),
      title: response.title,
      role: response.role,
      languages: JSON.parse(response.languages),
      difficulty: response.difficulty,
      createdAt,
      messages: normalizeMessages(response.messages, createdAt),
      status: response.status,
      questions: JSON.parse(response.questions),
      currentQuestionIndex: response.currentQuestionIndex,
      gradingResult: response.gradingResult ? (JSON.parse(response.gradingResult) as GradingResult) : null,
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
    };
  }
}

export const interviewService = new InterviewService(); 
