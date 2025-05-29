'use client';

import { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';

type Message = {
  sender: 'ai' | 'user';
  text: string;
};

export default function Demo() {
  const [isRecording, setIsRecording] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: "Welcome to your mock interview. Let's begin!",
    },
  ]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const questions = [
    'Tell me about a time when you faced a challenging situation at work or school.',
    'Describe a project where you had to work in a team.',
    'How do you handle stress and pressure?',
    'What is your greatest professional achievement?',
  ];

  useEffect(() => {
    if (recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      simulateInterviewProcessing();
    }
  }, [recordedChunks]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [messages]);

  const startInterview = () => {
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    setCurrentQuestion(randomQuestion);
    setMessages((prev) => [...prev, { sender: 'ai', text: randomQuestion }]);
    setIsRecording(true);
    setRecordedChunks([]);

    if (webcamRef.current?.stream) {
      mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream);
      mediaRecorderRef.current.addEventListener('dataavailable', handleDataAvailable);
      mediaRecorderRef.current.start();
    }
  };

  const stopInterview = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleDataAvailable = ({ data }: BlobEvent) => {
    if (data.size > 0) {
      setRecordedChunks((prev) => [...prev, data]);
    }
  };

  const simulateInterviewProcessing = () => {
    setTimeout(() => {
      const fakeTranscript =
        'Sure, in my final year project we had to migrate a legacy system to a modern stack...';
      const followUpQuestion =
        'That sounds interesting. What was the biggest challenge your team faced during the migration?';

      setMessages((prev) => [
        ...prev,
        { sender: 'user', text: fakeTranscript },
        { sender: 'ai', text: followUpQuestion },
      ]);

      setCurrentQuestion(followUpQuestion);
    }, 2000);
  };

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col h-full">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mt-20">AI Interview Practice</h1>
          <p className="mt-1 text-gray-600">Speak your answers out loud. The AI will listen and ask follow-ups.</p>
        </div>

        {/* Layout: Webcam + Chat Side-by-Side */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch h-[400px]">
          {/* Webcam Feed */}
          <div className="h-full w-full lg:w-1/2 relative">
            <Webcam
              ref={webcamRef}
              audio={true}
              className="w-full h-full rounded-lg object-cover"
              videoConstraints={{
                width: 1280,
                height: 720,
                facingMode: 'user',
              }}
            />
            {isRecording && (
              <div className="absolute top-4 right-4 flex items-center">
                <div className="animate-pulse w-3 h-3 bg-red-500 rounded-full mr-2" />
                <span className="text-white text-sm">Recording...</span>
              </div>
            )}
          </div>

          {/* Chat Panel */}
          <div className="h-full w-full lg:w-1/2 p-4 bg-white rounded-lg shadow flex flex-col">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Interview Chat</h3>
            <div className="overflow-y-auto pr-2 space-y-4 flex-1">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[80%] px-4 py-2 rounded-lg text-sm ${
                    msg.sender === 'ai'
                      ? 'bg-gray-100 text-gray-900 self-start'
                      : 'bg-blue-600 text-white self-end'
                  }`}
                >
                  {msg.text}
                </motion.div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center mt-2 gap-4">
          {!isRecording ? (
            <button
              onClick={startInterview}
              className="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Interview
            </button>
          ) : (
            <button
              onClick={stopInterview}
              className="bg-red-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-red-700 transition-colors"
            >
              Stop Answer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
