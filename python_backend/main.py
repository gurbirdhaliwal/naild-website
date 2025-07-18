import numpy as np
import ollama
from scipy import signal
import time
import queue
import threading
import sys
from fastapi import FastAPI, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

app = FastAPI()

# Allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VoiceAssistant:
    def __init__(self):
        self.whisper_model = WhisperModel("tiny", device="auto")
        self.debug = True

assistant = VoiceAssistant()

@app.post("/app/interview")
async def interview(audio: UploadFile = File(...)):
    try:
        import tempfile, os
        # Save uploaded audio to a temp file
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name
        # Transcribe using your existing logic
        segments, info = assistant.whisper_model.transcribe(tmp_path)
        transcription = "".join([seg.text for seg in segments]).strip()
        os.remove(tmp_path)
        response = ollama.chat(
            model='mistral',
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert technical interviewer that is very thorough. Respond in 1-2 short sentences only."
                },
                {
                    "role": "user",
                    "content": transcription
                }
            ]
        )
        ai_response = response['message']['content']
        return {"user_input": transcription, "ai_response": ai_response}
    except Exception as e:
        return {"error": str(e)}

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
        response = ollama.chat(
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
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.post("/generate_questions")
async def generate_questions(request: Request):
    data = await request.json()
    role = data.get("role", "")
    languages = data.get("languages", [])
    difficulty = data.get("difficulty", "")
    prompt = f"You are an expert technical interviewer. Generate 5 unique interview questions for a {role} position, focusing on the following technologies: {', '.join(languages)}. The questions should be appropriate for a {difficulty} level candidate. Return only the questions as a numbered list."
    response = ollama.chat(
        model='mistral',
        messages=[
            {"role": "system", "content": "You are an expert technical interviewer that generates interview questions."},
            {"role": "user", "content": prompt}
        ]
    )
    questions = response['message']['content']
    return {"questions": questions}

@app.post("/interview_ack")
async def interview_ack(request: Request):
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
    
    response = ollama.chat(
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
async def grade_interview(request: Request):
    data = await request.json()
    questions = data.get("questions", [])
    answers = data.get("answers", [])
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

    response = ollama.chat(
        model='mistral',
        messages=[
            {"role": "system", "content": "You are a strict, fair, and robust technical interview grader. Always return valid JSON."},
            {"role": "user", "content": grading_prompt}
        ]
    )
    import json
    try:
        result = json.loads(response['message']['content'])
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
