'use client';

import { useAuth } from '../context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';

type Message = {
  sender: 'ai' | 'user';
  text: string;
};

export default function Demo() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isRecording, setIsRecording] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: "Welcome to your mock interview. Let's begin!" },
  ]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDots, setLoadingDots] = useState('');

  const questions = [
    'Tell me about a time when you faced a challenging situation at work or school.',
    'Describe a project where you had to work in a team.',
    'How do you handle stress and pressure?',
    'What is your greatest professional achievement?',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingDots((prev) => (prev.length < 3 ? prev + '.' : ''));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, pathname, router]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages]);

  if (loading || !user) {
    return <p className="mt-28 text-center">Redirecting...</p>;
  }

  const handleInterviewTurn = async () => { 
    setIsRecording(true); 

    // If no current question, ask one
    if (!currentQuestion) {
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
      setMessages((prev) => [...prev, { sender: 'ai', text: randomQuestion }]);
      setCurrentQuestion(randomQuestion);
      setIsRecording(false);
      return;
    }

    // Otherwise, capture user response
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:8000/app/interview');
      const data = await res.json();
      setIsLoading(false);
      setIsRecording(false);

      if (data.user_input && data.ai_response) {
        setMessages((prev) => [
          ...prev,
          { sender: 'user', text: data.user_input },
          { sender: 'ai', text: data.ai_response },
        ]);
        setCurrentQuestion(data.ai_response);
      } else {
        console.warn('No user_input or ai_response from server');
      }
    } catch (err) {
      console.error('Error fetching response:', err);
      setIsLoading(false);
      setIsRecording(false);
    }
  };

  return (
    <div className="mt-28 h-screen overflow-hidden flex flex-col">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col h-full">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mt-20">AI Interview Practice</h1>
          <p className="mt-1 text-gray-600">
            Speak your answers out loud. The AI will listen and ask follow-ups.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-stretch h-[400px]">
          <div className="h-full w-full lg:w-1/2 relative">
            <Webcam
              ref={webcamRef}
              audio={false}
              className="w-full h-full rounded-lg object-cover"
              videoConstraints={{ width: 1280, height: 720, facingMode: 'user' }}
            />
            {isRecording && (
              <div className="absolute top-4 right-4 flex items-center">
                <div className="animate-pulse w-3 h-3 bg-red-500 rounded-full mr-2" />
                <span className="text-white text-sm">Recording...</span>
              </div>
            )}
          </div>

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
              {isLoading && (
                <div className="text-sm text-gray-500 mt-2 ml-2 animate-pulse">
                  AI is listening{loadingDots}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-2 gap-4">
          <button
            onClick={handleInterviewTurn}
            disabled={isLoading}
            className={`${
              isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            } text-white px-6 py-3 rounded-full font-semibold transition-colors`}
          >
            {isRecording
              ? 'Recording...'
              : currentQuestion
              ? 'Answer / Continue'
              : 'Start Interview'}
          </button>
        </div>
      </div>
    </div>
  );
}
