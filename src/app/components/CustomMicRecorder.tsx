import React, { useRef, useState } from "react";
import { LuMic } from "react-icons/lu";

interface CustomMicRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  maxDuration?: number; // max seconds to record
}

const CustomMicRecorder: React.FC<CustomMicRecorderProps> = ({
  onAudioRecorded,
  onRecordingStart,
  onRecordingStop,
  maxDuration = 60,
}) => {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<"idle" | "recording" | "processing">("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const maxTimer = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  const startRecording = async () => {
    setStatus("recording");
    setRecording(true);
    isRecordingRef.current = true;
    audioChunks.current = [];
    
    // Notify parent component that recording has started
    onRecordingStart?.();
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new window.MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    // Max duration timer
    maxTimer.current = setTimeout(() => {
      if (isRecordingRef.current) {
        stopRecording();
      }
    }, maxDuration * 1000);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      isRecordingRef.current = false;
      setRecording(false);
      setStatus("processing");
      const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
      onAudioRecorded(audioBlob);
      // Clean up
      stream.getTracks().forEach((track) => track.stop());
      if (maxTimer.current) clearTimeout(maxTimer.current);
      setStatus("idle");
    };

    mediaRecorder.start();
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setRecording(false);
    setStatus("processing");
    
    // Notify parent component that recording has stopped
    onRecordingStop?.();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
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
        {recording ? "Stop" : <LuMic />}
      </button>
      <div className="text-sm text-gray-600">
        {status === "idle" && "Click the microphone to speak your answer"}
        {status === "recording" && `Recording... (max ${maxDuration} seconds)`}
        {status === "processing" && "Processing..."}
      </div>
    </div>
  );
};

export default CustomMicRecorder; 