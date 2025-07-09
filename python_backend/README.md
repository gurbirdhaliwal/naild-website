# Python Backend for Naild Interview Platform

This backend provides voice recording, transcription, and AI response functionality for the Naild interview platform.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install Ollama (for AI responses):
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

The server will run on `http://localhost:8080`

## API Endpoints

- `GET /app/interview` - Records voice input, transcribes it, and returns AI response

## Requirements

- Python 3.8+
- Microphone access
- Ollama with Mistral model
- All dependencies listed in requirements.txt 