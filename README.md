# Naild - AI-Powered Interview Practice Platform

Naild is an innovative platform that helps students practice and improve their interview skills using AI-powered voice interaction. The platform provides real-time voice transcription and AI-generated responses for a natural interview experience.

## Features

- Voice-only interview interaction
- Real-time speech transcription using Whisper
- AI-powered interview responses using Ollama
- Live transcription display
- Interview session management
- Multiple difficulty levels and technology stacks

## Technology Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- Framer Motion

### Backend
- Python FastAPI
- Whisper (OpenAI) for speech transcription
- Ollama for AI responses
- SoundDevice for audio recording

## Getting Started

### Prerequisites

1. **Install Ollama** (for AI responses):
   - Visit https://ollama.ai/ and follow installation instructions
   - Pull the Mistral model:
   ```bash
   ollama pull mistral
   ```

2. **Install Python dependencies** (for backend):
   ```bash
   cd python_backend
   pip install -r requirements.txt
   ```

### Quick Start (Recommended)

**On macOS/Linux:**
```bash
./start.sh
```

**On Windows:**
```bash
start.bat
```

These scripts will automatically:
- Install all dependencies
- Check for required software
- Start both frontend and backend services

### Manual Setup

1. **Start the Python backend** (Terminal 1):
   ```bash
   cd python_backend
   python main.py
   ```
   The backend will run on `http://localhost:8081`

2. **Start the Next.js frontend** (Terminal 2):
   ```bash
   npm install
   npm run dev
   ```

3. **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

### Using the Platform

1. Sign up or log in to your account
2. Click "Start New Interview" to configure your interview
3. Select your role, technologies, and experience level
4. Click the microphone button to begin speaking your answers
5. The AI will transcribe your speech and provide interview responses

## API Endpoints

FastAPI backend base URL: `http://localhost:8081`

- `POST /transcription` - Accepts uploaded audio and returns `{ "user_input": "..." }`
- `POST /generate_questions` - Generates interview questions from role/languages/difficulty
- `POST /interview_ack` - Returns acknowledgement plus next question (or goodbye on final question)
- `POST /grade_interview` - Grades 5 Q&A pairs and can persist grading when `interview_id` is provided
- `GET /warmup` - Warms Whisper/Ollama models and reports readiness/timings

Spring Boot API base URL used by frontend and auth checks: `http://localhost:8080/api/v1`

## License

MIT License
