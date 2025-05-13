'use client';

import { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';

export default function Demo() {
  const [isRecording, setIsRecording] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [feedback, setFeedback] = useState<string>('');

  const questions = [
    'Tell me about a time when you faced a challenging situation at work or school.',
    'Describe a project where you had to work in a team.',
    'How do you handle stress and pressure?',
    'What is your greatest professional achievement?',
  ];

  useEffect(() => {
    if (recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, {
        type: 'video/webm',
      });
      // Here you would typically send the blob to your AI service
      // For demo purposes, we'll simulate AI feedback
      simulateAIFeedback();
    }
  }, [recordedChunks]);

  const startInterview = () => {
    setCurrentQuestion(questions[Math.floor(Math.random() * questions.length)]);
    setIsRecording(true);
    setRecordedChunks([]);
    setFeedback('');

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

  const simulateAIFeedback = () => {
    // Simulate AI processing time
    setTimeout(() => {
      setFeedback(`
        Facial Expression Analysis:
        - Good eye contact maintained
        - Natural smile detected
        - Shows engaged body language
        
        Voice Analysis:
        - Clear and confident tone
        - Good pace of speech
        - Minimal filler words used
        
        Content Analysis:
        - Well-structured response
        - Provided specific examples
        - Could elaborate more on outcomes
        
        Suggestions:
        - Consider using more quantitative details
        - Maintain consistent energy throughout
        - Great job overall!
      `);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">Interview Practice Demo</h1>
          <p className="mt-4 text-lg text-gray-600">
            Experience real-time AI feedback on your interview responses
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6">
            {/* Webcam Display */}
            <div className="relative aspect-video mb-6">
              <Webcam
                ref={webcamRef}
                audio={true}
                className="w-full h-full rounded-lg"
                videoConstraints={{
                  width: 1280,
                  height: 720,
                  facingMode: 'user',
                }}
              />
              {isRecording && (
                <div className="absolute top-4 right-4 flex items-center">
                  <div className="animate-pulse w-3 h-3 bg-red-500 rounded-full mr-2" />
                  <span className="text-white text-sm">Recording</span>
                </div>
              )}
            </div>

            {/* Question Display */}
            {currentQuestion && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900">Current Question:</h3>
                <p className="mt-2 text-blue-800">{currentQuestion}</p>
              </div>
            )}

            {/* Controls */}
            <div className="flex justify-center gap-4">
              {!isRecording ? (
                <button
                  onClick={startInterview}
                  className="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                >
                  Start Practice Interview
                </button>
              ) : (
                <button
                  onClick={stopInterview}
                  className="bg-red-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-red-700 transition-colors"
                >
                  Stop Recording
                </button>
              )}
            </div>

            {/* Feedback Display */}
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-6 bg-gray-50 rounded-lg"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-4">AI Feedback</h3>
                <pre className="whitespace-pre-wrap text-gray-700 font-mono text-sm">
                  {feedback}
                </pre>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 