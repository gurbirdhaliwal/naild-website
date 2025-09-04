import { Interview, Message } from '../types/Interview';

const API_BASE = 'http://localhost:8080/api/v1';

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
  gradingResult: any;
}

class InterviewService {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    try {
      console.log(`Making request to: ${API_BASE}${endpoint}`);
      console.log(`Request options:`, options);
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      console.log(`Response status: ${response.status}`);
      console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`Response data:`, data);
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
    } catch (error) {
      console.log('Backend not available, returning empty interviews list');
      return [];
    }
  }

  async getInterviewById(id: number): Promise<InterviewResponse> {
    try {
      return await this.makeRequest(`/interviews/${id}`);
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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

  async deleteInterview(id: number): Promise<void> {
    try {
      return await this.makeRequest(`/interviews/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.log('Backend not available, skipping delete');
      // Don't throw error, just log it
    }
  }

  // Helper method to convert InterviewResponse to Interview
  convertToInterview(response: InterviewResponse): Interview {
    return {
      id: response.id.toString(),
      title: response.title,
      role: response.role,
      languages: JSON.parse(response.languages),
      difficulty: response.difficulty,
      createdAt: new Date(response.createdAt),
      messages: JSON.parse(response.messages),
      status: response.status,
      questions: JSON.parse(response.questions),
      currentQuestionIndex: response.currentQuestionIndex,
      gradingResult: response.gradingResult ? JSON.parse(response.gradingResult) : null,
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