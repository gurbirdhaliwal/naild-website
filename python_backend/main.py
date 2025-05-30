import sounddevice as sd
import numpy as np
import whisper
import ollama
from scipy import signal
import time
import queue
import threading
import sys

class VoiceAssistant:
    def __init__(self):
        # Initialize Whisper model (using base model for faster performance)
        print("Loading Whisper model...")
        self.whisper_model = whisper.load_model("base")
        print("Whisper model loaded successfully!")
        
        # Audio parameters
        self.sample_rate = 16000
        self.channels = 1
        self.dtype = np.float32
        self.block_size = 4096
        
        # Voice activity detection parameters
        self.silence_threshold = 0.005  # Lowered threshold for better detection
        self.silence_duration = 1.5  # seconds
        self.last_sound = time.time()
        
        # Buffers
        self.audio_buffer = []
        self.audio_queue = queue.Queue()
        
        # Control flags
        self.is_recording = False
        self.is_processing = False
        self.debug = True  # Enable debug output

    def audio_callback(self, indata, frames, time_info, status):
        """Callback function for audio stream"""
        if status:
            print(f"Status: {status}")
        
        # Convert to mono if necessary
        if self.channels == 1:
            data = indata[:, 0]
        else:
            data = indata.mean(axis=1)
        
        # Check for voice activity
        audio_level = np.abs(data).mean()
        if audio_level > self.silence_threshold:
            if self.debug and not self.is_recording:
                print("\nVoice detected! Audio level:", audio_level)
            self.last_sound = time.time()
            if not self.is_recording:
                self.is_recording = True
                if self.debug:
                    print("Started recording...")
        
        # Add audio data to buffer if recording
        if self.is_recording:
            self.audio_buffer.extend(data.tolist())
        
        # Check if silence duration exceeded
        if self.is_recording and time.time() - self.last_sound > self.silence_duration:
            if self.debug:
                print("Silence detected, processing audio...")
            self.audio_queue.put(np.array(self.audio_buffer))
            self.audio_buffer = []
            self.is_recording = False

    def process_audio(self):
        """Process audio chunks and get AI responses"""
        while True:
            if not self.is_processing:
                break
                
            try:
                audio_data = self.audio_queue.get(timeout=0.1)
                
                if len(audio_data) < self.sample_rate:  # Skip if audio is too short
                    if self.debug:
                        print("Audio too short, skipping...")
                    continue
                
                # Normalize audio
                audio_data = np.array(audio_data, dtype=self.dtype)
                audio_data = audio_data / np.max(np.abs(audio_data))
                
                if self.debug:
                    print("Transcribing audio...")
                
                # Transcribe with Whisper
                result = self.whisper_model.transcribe(audio_data)
                transcription = result["text"].strip()
                
                if transcription:
                    print(f"\nYou said: {transcription}")
                    
                    if self.debug:
                        print("Getting AI response...")
                    
                    # Get AI response using Ollama
                    response = ollama.chat(model='mistral', 
                                        messages=[{'role': 'user', 'content': transcription}])
                    
                    ai_response = response['message']['content']
                    print(f"AI: {ai_response}\n")
                    print("Speak when ready... (or press Enter to quit)")
                
            except queue.Empty:
                continue
            except Exception as e:
                print(f"Error processing audio: {e}")

    def check_quit(self):
        """Thread function to check for quit command"""
        input()  # Wait for Enter key
        self.is_processing = False

    def run(self):
        """Main loop to run the voice assistant"""
        print("\nVoice Assistant started. Press Enter to quit.")
        print("Initializing audio stream...")
        print("Speak when ready...")
        
        try:
            # Start audio stream
            with sd.InputStream(channels=self.channels,
                              samplerate=self.sample_rate,
                              dtype=self.dtype,
                              blocksize=self.block_size,
                              callback=self.audio_callback):
                
                print("Audio stream started successfully!")
                self.is_processing = True
                
                # Start the audio processing thread
                process_thread = threading.Thread(target=self.process_audio)
                process_thread.start()
                
                # Start the quit checking thread
                quit_thread = threading.Thread(target=self.check_quit)
                quit_thread.start()
                
                while True:
                    if not self.is_processing:
                        print("\nStopping voice assistant...")
                        break
                    time.sleep(0.1)
                
                process_thread.join()
                quit_thread.join()
                
        except Exception as e:
            print(f"Error setting up audio stream: {e}")
            print("Make sure your microphone is properly connected and permissions are granted.")
            sys.exit(1)

if __name__ == "__main__":
    assistant = VoiceAssistant()
    assistant.run() 