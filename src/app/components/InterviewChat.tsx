import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Interview, Message } from '../types/Interview';

interface InterviewChatProps {
  interview: Interview;
  onUpdateInterview: (interview: Interview) => void;
}

const InterviewChat: React.FC<InterviewChatProps> = ({ interview, onUpdateInterview }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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
    <div className="flex h-full w-full bg-white">
      <div className={`flex-1 flex flex-col ${showTranscription ? 'lg:pr-80' : ''}`}>
        <div className="border-b border-gray-200 p-4 sm:p-6 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-light text-gray-900 truncate pr-4">{interview.title}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-500 mt-2">
                <span className="capitalize">{interview.difficulty} level</span>
                <span className="hidden sm:inline">•</span>
                <span className="truncate max-w-[200px] sm:max-w-none">{interview.languages.join(', ')}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTranscription(!showTranscription)}
                className="hidden lg:block px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors whitespace-nowrap"
              >
                {showTranscription ? 'Hide' : 'Show'} Transcription
              </button>
              <div className="flex items-center gap-2 text-green-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm hidden sm:inline">Live</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-gray-50">
          {interview.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'candidate' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-2xl lg:max-w-3xl p-3 sm:p-4 rounded-2xl ${
                  message.role === 'candidate'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0 ${
                    message.role === 'candidate' ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    {message.role === 'candidate' ? 'Y' : 'AI'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs mb-1 sm:mb-2 opacity-70">
                      {message.role === 'candidate' ? 'You' : 'AI Interviewer'}
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base break-words">{message.content}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 p-4 sm:p-6 bg-white">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleVoiceTurn}
              disabled={isRecording || isProcessing}
              className={`p-4 sm:p-6 rounded-full transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200 scale-110' 
                  : isProcessing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 text-white hover:bg-gray-800 hover:scale-105'
              }`}
            >
              {isRecording ? <MicOff size={24} className="sm:w-8 sm:h-8" /> : <Mic size={24} className="sm:w-8 sm:h-8" />}
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
      </div>

      {showTranscription && (
        <div className="hidden lg:block fixed right-0 top-0 w-80 h-full bg-white border-l border-gray-200 flex flex-col z-10">
          <div className="p-4 sm:p-6 border-b border-gray-200">
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
                <div className={`p-3 rounded-lg text-xs break-words ${
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
