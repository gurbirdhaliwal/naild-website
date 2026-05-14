# Memova - AI-Powered Interview Practice Platform

Memova helps students practice and improve interview and technical communication skills through spoken drills, transcription, and AI feedback.

## Features

- Voice-only interview interaction
- Real-time speech transcription using Whisper
- AI-powered interview responses using Ollama
- Live transcription display
- Interview session management
- Multiple difficulty levels and behavioral focus areas

## Technology Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- Framer Motion

### Backend
- Python FastAPI
- Whisper (OpenAI) for speech transcription
- Ollama for local development
- Vertex AI Gemini 2.5 Flash for production deployment on GCP

## Getting Started

### Prerequisites

1. **Install Ollama** (for local AI responses):
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

### Quality Gates

```bash
npm run lint
npm run typecheck
npm run test
npm run build
python3 -m py_compile python_backend/main.py
python3 -m unittest discover -s python_backend/tests
```

### Using the Platform

1. Sign up or log in to your account
2. Click "Start New Interview" to configure your interview
3. Select your role, focus areas, and experience level
4. Click the microphone button to begin speaking your answers
5. The AI will transcribe your speech and provide interview responses

## API Endpoints

FastAPI backend base URL: `http://localhost:8081`

- `GET /healthz` - Basic liveness probe
- `GET /readyz` - Readiness probe with provider metadata
- `POST /transcription` - Accepts uploaded audio and returns `{ "user_input": "..." }`
- `POST /generate_questions` - Generates behavioral interview questions from role/focus areas/difficulty
- `POST /interview_ack` - Returns acknowledgement plus next question (or goodbye on final question)
- `POST /grade_interview` - Grades 5 Q&A pairs and can persist grading when `interview_id` is provided

Spring Boot API base URL used by frontend and auth checks: `http://localhost:8080/api/v1`

## Deployment

- Production web container: `Dockerfile.web`
- Local development web container: `Dockerfile.web.dev`
- GCP Cloud Run deployment guide: `DEPLOYMENT_GCP.md`
- Cloud Build config: `cloudbuild.gcp.yaml`

## License

MIT License
