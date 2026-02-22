import numpy as np
import ollama
from scipy import signal
import time
import queue
import threading
import sys
import os
import logging
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio
import requests
import json


def _load_cors_origins():
    raw_origins = os.getenv("CORS_ALLOW_ORIGINS")
    if not raw_origins:
        # Safe local defaults for development.
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    origins = [origin.strip().rstrip("/") for origin in raw_origins.split(",") if origin.strip()]
    if "*" in origins:
        raise ValueError("CORS_ALLOW_ORIGINS cannot include '*' when allow_credentials=True.")
    return origins


ALLOWED_CORS_ORIGINS = _load_cors_origins()

app = FastAPI()

# Allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VoiceAssistant:
    def __init__(self):
        self.whisper_model = WhisperModel("tiny", device="auto")
        self.sample_rate = 16000
        self.channels = 1
        self.dtype = np.float32
        self.block_size = 2048
        self.silence_threshold = 0.001
        self.silence_duration = 2
        self.last_sound = time.time()
        self.audio_buffer = []
        self.audio_queue = queue.Queue()
        self.is_recording = False
        self.debug = True

assistant = VoiceAssistant()

# Configurable service endpoints
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
SPRING_API_BASE = os.getenv("SPRING_API_BASE", "http://localhost:8080/api/v1")
AUTH_CHECK_TIMEOUT_SECONDS = float(os.getenv("AUTH_CHECK_TIMEOUT_SECONDS", "5"))
MAX_AUDIO_UPLOAD_SIZE_BYTES = int(os.getenv("MAX_AUDIO_UPLOAD_SIZE_BYTES", str(10 * 1024 * 1024)))
MAX_AUDIO_DURATION_SECONDS = float(os.getenv("MAX_AUDIO_DURATION_SECONDS", "300"))
AUDIO_UPLOAD_CHUNK_SIZE_BYTES = 1024 * 1024
ALLOWED_AUDIO_CONTENT_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/x-m4a",
    "audio/ogg",
    "audio/flac",
}
ALLOWED_AUDIO_EXTENSIONS = {".webm", ".wav", ".mp3", ".m4a", ".mp4", ".ogg", ".flac"}
logger = logging.getLogger(__name__)

ollama_client = ollama.Client(host=OLLAMA_HOST)

def require_authenticated_user(request: Request):
    auth_header = request.headers.get("authorization")
    token_cookie = request.cookies.get("token")

    if not auth_header and not token_cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    headers = {}
    cookies = {}
    if auth_header:
        headers["Authorization"] = auth_header
    if token_cookie:
        cookies["token"] = token_cookie

    try:
        auth_response = requests.get(
            f"{SPRING_API_BASE}/user/me",
            headers=headers,
            cookies=cookies,
            timeout=AUTH_CHECK_TIMEOUT_SECONDS,
        )
    except requests.RequestException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable.",
        )

    if auth_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized.",
        )

    try:
        return auth_response.json()
    except ValueError:
        return {"authenticated": True}

@app.post("/transcription")
async def transcription(
    audio: UploadFile = File(...),
    _: dict = Depends(require_authenticated_user),
):
    import tempfile
    from pathlib import Path

    tmp_path = None
    try:
        content_type = (audio.content_type or "").split(";")[0].strip().lower()
        if content_type not in ALLOWED_AUDIO_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Unsupported audio type.",
            )

        file_extension = Path(audio.filename or "").suffix.lower()
        if file_extension and file_extension not in ALLOWED_AUDIO_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Unsupported audio file extension.",
            )

        total_size = 0
        with tempfile.NamedTemporaryFile(suffix=file_extension or ".webm", delete=False) as tmp:
            tmp_path = tmp.name
            while True:
                chunk = await audio.read(AUDIO_UPLOAD_CHUNK_SIZE_BYTES)
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > MAX_AUDIO_UPLOAD_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Audio file exceeds the {MAX_AUDIO_UPLOAD_SIZE_BYTES} byte limit.",
                    )
                tmp.write(chunk)

        if total_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded audio file is empty.",
            )

        try:
            decoded_audio = decode_audio(tmp_path, sampling_rate=assistant.sample_rate)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decode uploaded audio. Ensure the file is valid.",
            )

        duration_seconds = len(decoded_audio) / assistant.sample_rate
        if duration_seconds > MAX_AUDIO_DURATION_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Audio duration exceeds the {MAX_AUDIO_DURATION_SECONDS:.0f} second limit.",
            )

        segments, info = assistant.whisper_model.transcribe(tmp_path)
        transcription = "".join([seg.text for seg in segments]).strip()

        return {"user_input": transcription}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unexpected error while processing transcription request.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to process transcription request.",
        )
    finally:
        await audio.close()
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.get("/warmup")
def warmup():
    import time
    import numpy as np
    import tempfile, os
    import soundfile as sf
    try:
        timings = {}
        t0 = time.time()
        # Generate a 1-second sine wave (minimal audio for warmup)
        sr = 16000
        duration = 1.0
        t = np.linspace(0, duration, int(sr * duration), endpoint=False)
        audio = 0.1 * np.sin(2 * np.pi * 220 * t)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            sf.write(tmp.name, audio, sr)
            tmp_path = tmp.name
        t1 = time.time()
        segments, info = assistant.whisper_model.transcribe(tmp_path)
        _ = "".join([seg.text for seg in segments]).strip()
        os.remove(tmp_path)
        timings['whisper'] = time.time() - t1
        # Warm up Ollama
        t2 = time.time()
        response = ollama_client.chat(
            model='mistral',
            messages=[
                {"role": "system", "content": "You are a mock interview assistant."},
                {"role": "user", "content": "hi"}
            ]
        )
        _ = response['message']['content']
        timings['ollama'] = time.time() - t2
        timings['total'] = time.time() - t0
        return {"status": "ready", "timings": timings}
    except Exception:
        logger.exception("Warmup failed.")
        return {"status": "error", "error": "Warmup failed."}

@app.post("/generate_questions")
async def generate_questions(
    request: Request,
    _: dict = Depends(require_authenticated_user),
):
    data = await request.json()
    role = data.get("role", "")
    languages = data.get("languages", [])
    difficulty = data.get("difficulty", "")
    prompt = f"You are an expert technical interviewer. Generate 5 unique interview questions for a {role} position, focusing on the following technologies: {', '.join(languages)}. The questions should be appropriate for a {difficulty} level candidate. The questions should not ask the user to code any functions. Return only the questions as a numbered list."
    response = ollama_client.chat(
        model='mistral',
        messages=[
            {"role": "system", "content": "You are an expert technical interviewer that generates interview questions."},
            {"role": "user", "content": prompt}
        ]
    )
    questions = response['message']['content']
    return {"questions": questions}

@app.post("/interview_ack")
async def interview_ack(
    request: Request,
    _: dict = Depends(require_authenticated_user),
):
    data = await request.json()
    current_question = data.get("current_question", "")
    user_answer = data.get("user_answer", "")
    previous_qa = data.get("previous_qa", [])
    next_question = data.get("next_question", "")
    is_last_question = data.get("is_last_question", False)
    
    # Build context from previous Q&A
    context = ""
    if previous_qa:
        context = "Previous Q&A:\n" + "\n".join([f"Q: {qa['question']}\nA: {qa['answer']}" for qa in previous_qa])
    
    if is_last_question:
        # Generate final acknowledgement and goodbye
        prompt = f"""You are an expert technical interviewer. The candidate just answered the final question.

        Current question: {current_question}
        Candidate's answer: {user_answer}
        {context}

        Generate a brief, professional acknowledgement of their answer (1-2 sentences) and a friendly goodbye message (1 sentence). Return as JSON:
                {{"acknowledgement": "your acknowledgement here", "goodbye": "your goodbye message here"}}"""
    else:
        # Generate acknowledgement and provide next question
        prompt = f"""You are an expert technical interviewer that is very thorough. The candidate just answered a question.

        Current question: {current_question}
        Candidate's answer: {user_answer}
        {context}
        Next question: {next_question}

        Generate a brief, professional acknowledgement of their answer (1-2 sentences) that references specific details from their response if relevant, or simply acknowledges their answer if it's off-topic. Return as JSON:
                {{"acknowledgement": "your acknowledgement here", "next_question": "{next_question}"}}"""
            
    response = ollama_client.chat(
        model='mistral',
        messages=[
            {"role": "system", "content": "You are a helpful AI that generates interview responses. Always return valid JSON."},
            {"role": "user", "content": prompt}
        ]
    )
    
    try:
        import json
        result = json.loads(response['message']['content'])
        return result
    except:
        # Fallback if JSON parsing fails
        if is_last_question:
            return {
                "acknowledgement": "Thank you for your answer.",
                "goodbye": "Thank you for participating in this interview. Good luck with your job search!"
            }
        else:
            return {
                "acknowledgement": "Thank you for your answer.",
                "next_question": next_question
            }

@app.post("/grade_interview")
async def grade_interview(
    request: Request,
    _: dict = Depends(require_authenticated_user),
):
    data = await request.json()
    questions = data.get("questions", [])
    answers = data.get("answers", [])
    interview_id = data.get("interview_id")  # New parameter for interview ID
    
    if not questions or not answers or len(questions) != 5 or len(answers) != 5:
        return {"error": "Must provide exactly 5 questions and 5 answers."}

    grading_prompt = f"""
You are an expert technical interviewer and grader. You will be given 5 interview questions and 5 candidate answers. For each answer, grade it from 1-100 based on these criteria:
- Accuracy: Is the answer factually correct and addresses the question? (0 if unrelated)
- Relevance: Is the answer on-topic and appropriate for the question?
- Clarity: Is the answer clear, well-explained, and easy to understand?

Short, off-topic, or nonsense answers should be penalized. Every answer must receive a grade, even if it is completely off-topic or nonsense. If an answer is unrelated, set accuracy to 0. Be consistent and robust.

Return a JSON object with:
- "scores": a list of 5 objects, each with "question", "answer", and "score" (1-100)
- "average_score": the average of the 5 scores (rounded to 1 decimal)
- "feedback": a readable summary of strengths, weaknesses, and suggestions for improvement, in plain English.

Questions:
"""
    for i, q in enumerate(questions, 1):
        grading_prompt += f"{i}. {q}\n"
    grading_prompt += "\nAnswers:\n"
    for i, a in enumerate(answers, 1):
        grading_prompt += f"{i}. {a}\n"

    response = ollama_client.chat(
        model='mistral',
        messages=[
            {"role": "system", "content": "You are a strict, fair, and robust technical interview grader. Always return valid JSON."},
            {"role": "user", "content": grading_prompt}
        ]
    )
    import json
    try:
        result = json.loads(response['message']['content'])
        
        # If interview_id is provided, save the grading result to Spring Boot
        if interview_id:
            try:
                grading_update_response = requests.put(
                    f"{SPRING_API_BASE}/interviews/{interview_id}/grading",
                    json={"gradingResult": result},
                    headers={"Content-Type": "application/json"}
                )
                if grading_update_response.status_code != 200:
                    print(f"Warning: Failed to save grading result to database: {grading_update_response.text}")
            except Exception as e:
                print(f"Warning: Failed to save grading result to database: {str(e)}")
        
        return result
    except Exception as e:
        # Fallback: basic structure if parsing fails
        scores = []
        for q, a in zip(questions, answers):
            scores.append({"question": q, "answer": a, "score": 1})
        return {
            "scores": scores,
            "average_score": 1.0,
            "feedback": "There was an error grading the answers. Please try again."
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
