import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Camera, CameraOff } from 'lucide-react';
import { Interview, Message } from '../types/Interview';

interface InterviewChatProps {
  interview: Interview;
  onUpdateInterview: (interview: Interview) => void;
}

const InterviewChat: React.FC<InterviewChatProps> = ({ interview, onUpdateInterview }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [showTranscription, setShowTranscription] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [interview.messages]);

  useEffect(() => {
    if (interview.messages.length === 0) {
      const welcome: Message = {
        id: Date.now().toString(),
        role: 'interviewer',
        content: "Welcome to your mock interview. Click the microphone to begin speaking your answers.",
        timestamp: new Date(),
        transcription: `[AI Interviewer]: Welcome to your mock interview. Click the microphone to begin speaking your answers.`
      }
      const updated = { ...interview, messages: [welcome] }
      onUpdateInterview(updated);
    }
  }, [interview, onUpdateInterview]);

  useEffect(() => {
    if (cameraOn) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then((mediaStream) => {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        })
        .catch((err) => {
          setStream(null);
        });
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleVoiceTurn = async () => {
    if (isRecording || isProcessing) return;
    
    setIsRecording(true);
    setIsProcessing(true);
    
    try {
      // Call the Python backend API for voice processing
      const response = await fetch('http://localhost:8081/app/interview', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to process voice input');
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Add user's transcribed message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'candidate',
        content: result.user_input,
        timestamp: new Date(),
        transcription: `[Candidate]: ${result.user_input}`
      };

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'interviewer',
        content: result.ai_response,
        timestamp: new Date(),
        transcription: `[AI Interviewer]: ${result.ai_response}`
      };

      const updated = { 
        ...interview, 
        messages: [...interview.messages, userMessage, aiMessage] 
      };
      onUpdateInterview(updated);

    } catch (error) {
      console.error('Voice processing error:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'interviewer',
        content: "I'm sorry, I couldn't process your voice input. Please try again by clicking the microphone.",
        timestamp: new Date(),
        transcription: `[AI Interviewer]: I'm sorry, I couldn't process your voice input. Please try again by clicking the microphone.`
      };
      
      const updated = { 
        ...interview, 
        messages: [...interview.messages, errorMessage] 
      };
      onUpdateInterview(updated);
    } finally {
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full bg-white">
      <div className={`flex-1 flex flex-col ${showTranscription ? 'pr-80' : ''} items-center justify-center`}>
        <div className="border-b border-gray-200 p-6 bg-white w-full">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-light text-gray-900">{interview.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                <span className="capitalize">{interview.difficulty} level</span>
                <span>•</span>
                <span>{interview.languages.join(', ')}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTranscription(!showTranscription)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                {showTranscription ? 'Hide' : 'Show'} Transcription
              </button>
              <div className="flex items-center gap-2 text-green-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Live</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center w-full bg-gray-50 relative">
          <div className="relative w-full max-w-xl flex items-center justify-center">
            {cameraOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="rounded-xl shadow-lg w-full aspect-video bg-black"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className="w-full aspect-video rounded-xl shadow-lg bg-gray-200 flex flex-col items-center justify-center">
                <CameraOff size={64} className="text-gray-400" />
                <p className="text-gray-500 text-lg mt-4">Camera is off.</p>
              </div>
            )}
            {/* Center-bottom camera toggle button */}
            <button
              onClick={() => setCameraOn((prev) => !prev)}
              className="absolute left-1/2 -translate-x-1/2 -bottom-6 z-10 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 shadow-md transition border border-gray-200"
              title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
            >
              {cameraOn ? (
                <CameraOff size={28} className="text-gray-700" />
              ) : (
                <Camera size={28} className="text-gray-700" />
              )}
            </button>
          </div>
        </div>
        <div className="border-t border-gray-200 p-6 bg-white w-full flex flex-col items-center gap-4">
          <button
            onClick={handleVoiceTurn}
            disabled={isRecording || isProcessing}
            className={`p-6 rounded-full transition-all duration-300 ${
              isRecording 
                ? 'bg-red-100 text-red-600 hover:bg-red-200 scale-110' 
                : isProcessing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-gray-800 hover:scale-105'
            }`}
          >
            {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
          </button>
          <div className="text-center">
            {isRecording && (
              <div className="flex items-center justify-center text-red-500 text-sm mb-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                Listening for your response...
              </div>
            )}
            {isProcessing && (
              <div className="flex items-center justify-center text-blue-500 text-sm mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                Processing your response...
              </div>
            )}
            <p className="text-sm text-gray-600">
              {isRecording 
                ? "Speak your answer now..." 
                : isProcessing 
                ? "Processing your voice input..." 
                : "Click the microphone to speak your answer"}
            </p>
          </div>
        </div>
      </div>

      {showTranscription && (
        <div className="fixed right-0 top-0 w-80 h-full bg-white border-l border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Live Transcription</h3>
              <Volume2 size={16} className="text-gray-400" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {interview.messages.map((message) => (
              <div key={message.id} className="text-sm">
                <div className="text-gray-400 text-xs mb-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
                <div className={`p-3 rounded-lg text-xs ${
                  message.role === 'candidate'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-gray-50 text-gray-700'
                }`}>
                  {message.transcription}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewChat;
