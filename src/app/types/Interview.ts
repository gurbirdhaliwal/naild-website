export interface Message {
    id: string
    role: 'candidate' | 'interviewer'
    content: string
    timestamp: Date
    transcription: string
  }
  export interface Interview {
    id:string
    title:string
    role:string
    languages:string[]
    difficulty:string
    createdAt:Date
    messages:Message[]
    status:string
  }
  
  export interface InterviewConfig {
    role: string;
    languages: string[];
    difficulty: 'junior' | 'mid' | 'senior';
  }
  