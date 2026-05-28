import React, { useRef, useState } from "react";
import { LuMic } from "react-icons/lu";
import { getUserFacingErrorMessage } from "../lib/userFacingErrors";
import { prepareVoicePersonaPlayback } from "../services/voiceService";

const RECORDING_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
];

const getSupportedRecordingMimeType = () => {
  if (typeof window === "undefined" || !window.MediaRecorder?.isTypeSupported) {
    return "";
  }

  return RECORDING_MIME_TYPES.find((mimeType) => window.MediaRecorder.isTypeSupported(mimeType)) ?? "";
};

interface CustomMicRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void | Promise<void>;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onRecordingError?: (message: string) => void;
  maxDuration?: number; // max seconds to record
  wrapperClassName?: string;
  buttonClassName?: string;
  recordingButtonClassName?: string;
  statusClassName?: string;
  idleText?: string;
  recordingText?: string;
  processingText?: string;
  disabled?: boolean;
  disabledText?: string;
}

const CustomMicRecorder: React.FC<CustomMicRecorderProps> = ({
  onAudioRecorded,
  onRecordingStart,
  onRecordingStop,
  onRecordingError,
  maxDuration = 60,
  wrapperClassName,
  buttonClassName,
  recordingButtonClassName,
  statusClassName,
  idleText,
  recordingText,
  processingText,
  disabled = false,
  disabledText,
}) => {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<"idle" | "recording" | "processing">("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const maxTimer = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  const startRecording = async () => {
    if (disabled) return;

    try {
      void prepareVoicePersonaPlayback();
      setRecording(true);
      isRecordingRef.current = true;
      audioChunks.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedRecordingMimeType();
      const mediaRecorder = new window.MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
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

      mediaRecorder.onstop = async () => {
        isRecordingRef.current = false;
        setRecording(false);
        setStatus("processing");
        const recordingType = mediaRecorder.mimeType || mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunks.current, { type: recordingType });

        try {
          await Promise.resolve(onAudioRecorded(audioBlob));
        } catch (error) {
          const message = getUserFacingErrorMessage("recordingProcessing", error);
          onRecordingError?.(message);
        } finally {
          stream.getTracks().forEach((track) => track.stop());
          if (maxTimer.current) clearTimeout(maxTimer.current);
          setStatus("idle");
        }
      };

      mediaRecorder.start();
      setStatus("recording");
      onRecordingStart?.();
    } catch (error) {
      isRecordingRef.current = false;
      setRecording(false);
      setStatus("idle");
      if (maxTimer.current) {
        clearTimeout(maxTimer.current);
        maxTimer.current = null;
      }
      const message = getUserFacingErrorMessage("microphoneAccess", error);
      onRecordingError?.(message);
    }
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

  const wrapperClasses = wrapperClassName ?? "flex flex-col items-center gap-2";
  const idleButtonClasses =
    buttonClassName ??
    "bg-gray-900 text-white hover:bg-gray-800 hover:scale-105";
  const activeButtonClasses =
    recordingButtonClassName ??
    "bg-red-100 text-red-600 hover:bg-red-200 scale-110";
  const statusClasses = statusClassName ?? "text-sm text-gray-600";
  const idleStatusText = idleText ?? "Click the microphone to speak your answer";
  const recordingStatusText = recordingText ?? `Recording... (max ${maxDuration} seconds)`;
  const processingStatusText = processingText ?? "Processing...";
  const disabledStatusText = disabledText ?? processingStatusText;

  return (
    <div className={wrapperClasses}>
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        className={`p-6 rounded-full transition-all duration-300 ${
          recording ? activeButtonClasses : idleButtonClasses
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        disabled={status === "processing" || disabled}
      >
        {recording ? "Stop" : <LuMic />}
      </button>
      <div className={statusClasses}>
        {status === "idle" && (disabled ? disabledStatusText : idleStatusText)}
        {status === "recording" && recordingStatusText}
        {status === "processing" && processingStatusText}
      </div>
    </div>
  );
};

export default CustomMicRecorder; 
