# Python Backend for Naild Interview Platform

This backend provides transcription, drill generation, interview acknowledgements, and grading for Naild.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install Ollama (for local AI responses):
   - Visit https://ollama.ai/ and follow installation instructions
   - Pull the Mistral model:
   ```bash
   ollama pull mistral
   ```

## Running the Backend

Start the FastAPI server:
```bash
python main.py
```

The server will run on `http://localhost:8081`

## API Endpoints

- `GET /healthz` - Liveness probe
- `GET /readyz` - Readiness probe
- `POST /transcription` - Accepts uploaded audio and returns `{ "user_input": "..." }`
- `POST /generate_questions` - Generates behavioral interview questions from role/focus areas/difficulty
- `POST /interview_ack` - Returns acknowledgement plus next question (or goodbye on final question)
- `POST /grade_interview` - Grades 5 Q&A pairs and can persist grading when `interview_id` is provided

## Local Development Defaults

- `OLLAMA_HOST=http://localhost:11434`
- `SPRING_API_BASE=http://localhost:8080/api/v1`

## Production on GCP

For production deployment, set:

- `APP_ENV=production`
- `AI_PROVIDER=vertex_ai`
- `GOOGLE_CLOUD_PROJECT`
- `VERTEX_AI_LOCATION`
- `GEMINI_MODEL=gemini-2.5-flash`
- `SPRING_API_BASE`
- `CORS_ALLOW_ORIGINS`

## Requirements

- Python 3.8+
- Microphone access
- Ollama with Mistral model
- All dependencies listed in requirements.txt 
