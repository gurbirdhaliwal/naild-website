import React, { useRef, useState } from "react";

interface CustomMicRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  silenceDuration?: number; // seconds of silence before auto-stop
  silenceThreshold?: number; // volume threshold
  maxDuration?: number; // max seconds to record
}

const CustomMicRecorder: React.FC<CustomMicRecorderProps> = ({
  onAudioRecorded,
  silenceDuration = 1.2,
  silenceThreshold = 0.01,
  maxDuration = 60,
}) => {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<"idle" | "recording" | "processing">("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const maxTimer = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const startRecording = async () => {
    setStatus("recording");
    setRecording(true);
    audioChunks.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new window.MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    // Silence detection
    audioContextRef.current = new window.AudioContext();
    sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    sourceRef.current.connect(analyserRef.current);

    // Max duration timer
    maxTimer.current = setTimeout(() => {
      stopRecording();
    }, maxDuration * 1000);

    const detectSilence = () => {
      if (!analyserRef.current) return;
      const buffer = new Uint8Array(analyserRef.current.fftSize);
      analyserRef.current.getByteTimeDomainData(buffer);
      const rms =
        Math.sqrt(
          buffer.reduce((sum, val) => sum + Math.pow(val - 128, 2), 0) / buffer.length
        ) / 128;
      if (rms < silenceThreshold) {
        if (!silenceTimer.current) {
          silenceTimer.current = setTimeout(() => {
            stopRecording();
          }, silenceDuration * 1000);
        }
      } else {
        if (silenceTimer.current) {
          clearTimeout(silenceTimer.current);
          silenceTimer.current = null;
        }
      }
      if (recording) {
        requestAnimationFrame(detectSilence);
      }
    };

    requestAnimationFrame(detectSilence);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      setRecording(false);
      setStatus("processing");
      const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
      onAudioRecorded(audioBlob);
      // Clean up
      stream.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close();
      if (maxTimer.current) clearTimeout(maxTimer.current);
      setStatus("idle");
    };

    mediaRecorder.start();
  };

  const stopRecording = () => {
    setRecording(false);
    setStatus("processing");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
    if (maxTimer.current) {
      clearTimeout(maxTimer.current);
      maxTimer.current = null;
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={recording ? stopRecording : startRecording}
        className={`p-6 rounded-full transition-all duration-300 ${
          recording
            ? "bg-red-100 text-red-600 hover:bg-red-200 scale-110"
            : "bg-gray-900 text-white hover:bg-gray-800 hover:scale-105"
        }`}
        disabled={status === "processing"}
      >
        {recording ? "Stop" : "🎤"}
      </button>
      <div className="text-sm text-gray-600">
        {status === "idle" && "Click the microphone to speak your answer"}
        {status === "recording" && `Listening... (auto-stops on silence or after ${maxDuration} seconds)`}
        {status === "processing" && "Processing..."}
      </div>
    </div>
  );
};

export default CustomMicRecorder; 