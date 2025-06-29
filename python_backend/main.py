import sounddevice as sd
import numpy as np
import ollama
from scipy import signal
import time
import queue
import threading
import sys
from fastapi import FastAPI
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
        self.sample_rate = 16000
        self.channels = 1
        self.dtype = np.float32
        self.block_size = 2048
        self.silence_threshold = 0.005
        self.silence_duration = 0.5
        self.last_sound = time.time()
        self.audio_buffer = []
        self.audio_queue = queue.Queue()
        self.is_recording = False
        self.debug = True

    def audio_callback(self, indata, frames, time_info, status):
        if status:
            print(f"Status: {status}")
        data = indata[:, 0] if self.channels == 1 else indata.mean(axis=1)
        audio_level = np.abs(data).mean()
        if audio_level > self.silence_threshold:
            self.last_sound = time.time()
            if not self.is_recording:
                self.is_recording = True
        if self.is_recording:
            self.audio_buffer.extend(data.tolist())
        if self.is_recording and time.time() - self.last_sound > self.silence_duration:
            self.audio_queue.put(np.array(self.audio_buffer))
            self.audio_buffer = []
            self.is_recording = False

    def capture_once(self):
        try:
            with sd.InputStream(channels=self.channels,
                                samplerate=self.sample_rate,
                                dtype=self.dtype,
                                blocksize=self.block_size,
                                callback=self.audio_callback):
                print("Listening...")
                timeout = time.time() + 60
                while self.audio_queue.empty() and time.time() < timeout:
                    time.sleep(0.1)
                if not self.audio_queue.empty():
                    return self.audio_queue.get()
                else:
                    raise TimeoutError("No speech detected in time")
        except Exception as e:
            raise RuntimeError(f"Audio stream error: {e}")

    def transcribe_and_respond(self):
        try:
            audio_data = self.capture_once()
            audio_data = np.array(audio_data, dtype=self.dtype)
            audio_data = audio_data / np.max(np.abs(audio_data))
            # Save audio to a temporary file for faster-whisper
            import tempfile, os
            import soundfile as sf
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                sf.write(tmp.name, audio_data, self.sample_rate)
                tmp_path = tmp.name
            segments, info = self.whisper_model.transcribe(tmp_path)
            transcription = "".join([seg.text for seg in segments]).strip()
            os.remove(tmp_path)
            response = ollama.chat(
                model='mistral',
                messages=[
                    {
                        "role": "system",
                        "content": "You are a mock interview assistant. Respond in 1-2 short sentences only."
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




assistant = VoiceAssistant()


@app.get("/app/interview")
def interview():
    result = assistant.transcribe_and_respond()
    return JSONResponse(content=result)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
