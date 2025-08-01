import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Camera, CameraOff, Loader2, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { Interview, Message } from '../types/Interview';
import CustomMicRecorder from "./CustomMicRecorder";

interface InterviewChatProps {
  interview: Interview;
  onUpdateInterview: (interview: Interview) => void;
}

const getScoreLabel = (percent: number) => {
  if (percent >= 90) return 'Excellent';
  if (percent >= 75) return 'Good';
  if (percent >= 60) return 'Fair';
  return 'Needs Improvement';
};

const getBarColor = (percent: number) => {
  if (percent >= 75) return 'bg-green-500';
  if (percent >= 60) return 'bg-yellow-400';
  return 'bg-red-400';
};

// Simple ThinkingDots component
const ThinkingDots = () => {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  return <span>{dots}</span>;
};

const InterviewChat: React.FC<InterviewChatProps> = ({ interview, onUpdateInterview }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [showTranscription, setShowTranscription] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [gradingResult, setGradingResult] = useState<any>(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [expandedIndexes, setExpandedIndexes] = useState<number[]>([]);
  const [timer, setTimer] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
        transcription: `[AI Interviewer]: Welcome to your mock interview. Click the microphone to begin speaking your answers.`,
        isThinking: false
      }
      const updated = { ...interview, messages: [welcome] }
      onUpdateInterview(updated);
    }
  }, [interview, onUpdateInterview]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning && timer > 0) {
      timerRef.current = setTimeout(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerRunning(false);
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isTimerRunning, timer]);

  const startTimer = () => {
    setTimer(60);
    setIsTimerRunning(true);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    setTimer(60);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  const handleAudioUpload = async (audioBlob: Blob) => {
    // Stop the timer when audio processing starts
    stopTimer();
    
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    const response = await fetch("http://localhost:8081/transcription", {
      method: "POST",
      body: formData,
    });
      const result = await response.json();
      if (result.error) {
      // Add error message to chat
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'interviewer',
        content: "I'm sorry, I couldn't process your voice input. Please try again by clicking the microphone.",
        timestamp: new Date(),
        transcription: `[AI Interviewer]: I'm sorry, I couldn't process your voice input. Please try again by clicking the microphone.`,
        isThinking: false
      };
      const updated = { ...interview, messages: [...interview.messages, errorMessage] };
      onUpdateInterview(updated);
      return;
      }

      const currentMessages = [...interview.messages];

      // Add user's transcribed message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'candidate',
        content: result.user_input,
        timestamp: new Date(),
        transcription: `[Candidate]: ${result.user_input}`,
        isThinking: false
      };

      currentMessages.push(userMessage);
      onUpdateInterview({
        ...interview,
        messages: currentMessages
      })

      const thinkingMessage: Message = {
        id: (Date.now() + 0.5).toString(),
        role: 'interviewer',
        content: "AI is thinking...",
        timestamp: new Date(),
        transcription: `AI is thinking`,
        isThinking: true
      };
    
      currentMessages.push(thinkingMessage);
      onUpdateInterview( {
        ...interview,
        messages: currentMessages
      });

      // Get current question and check if this is the last question
      const currentQuestionIndex = interview.currentQuestionIndex || 0;
      const questions = interview.questions || [];
      const currentQuestion = questions[currentQuestionIndex];
      const isLastQuestion = currentQuestionIndex >= questions.length - 1;
      const nextQuestion = isLastQuestion ? "" : questions[currentQuestionIndex + 1];

      // Build previous Q&A context
      const previousQA = [];
      for (let i = 0; i < currentQuestionIndex; i++) {
        const question = questions[i];
        // Find the corresponding answer in messages
        const questionMessageIndex = interview.messages.findIndex(m => m.content === question);
        if (questionMessageIndex !== -1 && questionMessageIndex + 1 < interview.messages.length) {
          const answerMessage = interview.messages[questionMessageIndex + 1];
          if (answerMessage.role === 'candidate') {
            previousQA.push({
              question: question,
              answer: answerMessage.content
            });
          }
        }
      }

      // Call the interview acknowledgement endpoint
      const ackResponse = await fetch('http://localhost:8081/interview_ack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_question: currentQuestion,
          user_answer: result.user_input,
          previous_qa: previousQA,
          next_question: nextQuestion,
          is_last_question: isLastQuestion,
        }),
      });

      const ackResult = await ackResponse.json();

      // Remove the thinking message and add acknowledgement message
      const messagesWithoutThinking = currentMessages.filter(msg => msg.id !== thinkingMessage.id);
      
      const ackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'interviewer',
        content: ackResult.acknowledgement,
        timestamp: new Date(),
        transcription: `[AI Interviewer]: ${ackResult.acknowledgement}`,
        isThinking: false
      };
      
      messagesWithoutThinking.push(ackMessage);

      // Add next question or goodbye message
      if (isLastQuestion) {
        const goodbyeMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'interviewer',
          content: ackResult.goodbye,
          timestamp: new Date(),
          transcription: `[AI Interviewer]: ${ackResult.goodbye}`,
          isThinking: false
        };
        messagesWithoutThinking.push(goodbyeMessage);
      } else {
        const nextQuestionMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'interviewer',
          content: ackResult.next_question,
          timestamp: new Date(),
          transcription: `[AI Interviewer]: ${ackResult.next_question}`,
          isThinking: false
        };
        messagesWithoutThinking.push(nextQuestionMessage);
      }

      // Update interview with new messages and increment question index
      const updated = { 
        ...interview, 
        messages: messagesWithoutThinking,
        currentQuestionIndex: currentQuestionIndex + 1
      };
      onUpdateInterview(updated);

  // --- Grading logic: trigger after last answer ---
  if (isLastQuestion) {
    // Collect 5 questions and 5 user answers
    const questions = updated.questions || [];
    // Find candidate answers in messages (after each question)
    const userAnswers: string[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      // Find the message after the question with role 'candidate'
      const qIdx = updated.messages.findIndex(m => m.content === q);
      if (qIdx !== -1 && qIdx + 1 < updated.messages.length) {
        const answerMsg = updated.messages[qIdx + 1];
        if (answerMsg.role === 'candidate') {
          userAnswers.push(answerMsg.content);
        } else {
          userAnswers.push('');
        }
      } else {
        userAnswers.push('');
      }
    }
    if (questions.length === 5 && userAnswers.length === 5) {
      setGradingLoading(true);
      setGradingResult(null);
      try {
        const gradeRes = await fetch('http://localhost:8081/grade_interview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            questions, 
            answers: userAnswers,
            interview_id: !isNaN(Number(interview.id)) ? Number(interview.id) : null
          })
        });
        const gradeData = await gradeRes.json();
        setGradingResult(gradeData);
        
        // Update interview status to completed
        if (!isNaN(Number(interview.id))) {
          try {
            await fetch(`http://localhost:8080/api/v1/interviews/${interview.id}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ status: 'completed' })
            });
          } catch (e) {
            console.error('Failed to update interview status:', e);
          }
        }
      } catch (e) {
        setGradingResult({ error: 'Failed to grade answers. Please try again.' });
      } finally {
        setGradingLoading(false);
      }
    }
  }

  };

  // Helper to toggle expanded state for a question
  const toggleExpand = (idx: number) => {
    setExpandedIndexes((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Helper to parse feedback into pros/cons (AI should return feedback in a structured way, but fallback to splitting by lines)
  const parseFeedback = (feedback: string) => {
    const pros: string[] = [];
    const cons: string[] = [];
    const lines = feedback.split(/\n|\r/).map(l => l.trim()).filter(Boolean);
    let current: 'pros' | 'cons' | null = null;
    for (const line of lines) {
      if (/pros[:]?/i.test(line)) { current = 'pros'; continue; }
      if (/cons[:]?/i.test(line)) { current = 'cons'; continue; }
      if (current === 'pros') pros.push(line.replace(/^[-•*]\s*/, ''));
      else if (current === 'cons') cons.push(line.replace(/^[-•*]\s*/, ''));
    }
    // fallback: if no pros/cons detected, put all in pros
    if (!pros.length && !cons.length) pros.push(...lines);
    return { pros, cons };
  };

  return (
    <div className="flex h-full bg-white">
      <div className={`flex-1 flex flex-col ${showTranscription ? 'pr-80' : ''} items-center justify-start overflow-y-auto`}>
        {/* Header and camera */}
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
            
            {/* Timer display in top right corner */}
            {isTimerRunning && (
              <div className="absolute top-4 right-4 z-20 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg font-mono text-lg font-bold">
                {formatTime(timer)}
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
        {/* Grading or mic area below camera */}
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 py-8">
          {gradingLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[180px] w-full bg-white rounded-xl shadow p-8">
              <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
              <div className="text-blue-600 font-medium text-lg">Grading your answers...</div>
            </div>
          ) : gradingResult ? (
            <>
              {/* Interview Results Card */}
              <div className="bg-white rounded-xl shadow p-6 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xl font-semibold text-gray-900">Interview Results</div>
                    <div className="text-gray-500 text-sm mt-1">Total Score</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-2xl font-bold text-gray-900">{gradingResult.scores ? gradingResult.scores.reduce((a: number, b: any) => a + (b.score || 0), 0) : 0}/{gradingResult.scores ? gradingResult.scores.length * 10 : 50}</div>
                    <div className="text-lg font-semibold text-gray-700">{gradingResult.average_score ? Math.round(gradingResult.average_score) : 0}%</div>
                    <div className="text-xs font-medium text-gray-500 mt-1">{getScoreLabel(gradingResult.average_score || 0)}</div>
                  </div>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div className={`${getBarColor(gradingResult.average_score || 0)} h-3 rounded-full`} style={{ width: `${gradingResult.average_score || 0}%` }}></div>
                </div>
              </div>
              {/* Question Breakdown Card */}
              <div className="bg-white rounded-xl shadow p-6 mb-2">
                <div className="text-lg font-semibold text-gray-900 mb-4">Question Breakdown</div>
                <div className="flex flex-col gap-4">
                  {gradingResult.scores && gradingResult.scores.map((item: any, idx: number) => {
                    const percent = Math.round((item.score / 10) * 100);
                    const isGood = percent >= 75;
                    return (
                      <div key={idx} className="border-b last:border-b-0 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          {isGood ? <CheckCircle2 className="text-green-500" size={20} /> : <AlertCircle className="text-yellow-500" size={20} />}
                          <button
                            className="font-semibold text-gray-900 text-left flex-1 flex items-center gap-2 focus:outline-none"
                            onClick={() => toggleExpand(idx)}
                          >
                            Question {idx + 1}
                            {expandedIndexes.includes(idx) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                          <div className="font-semibold text-gray-700">{item.score}/10</div>
                          <div className="text-xs text-gray-500">{percent}%</div>
                        </div>
                        <div className="text-gray-700 text-sm mb-2 ml-7">{item.question}</div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2 ml-7">
                          <div className={`${getBarColor(percent)} h-2 rounded-full`} style={{ width: `${percent}%` }}></div>
                        </div>
                        {expandedIndexes.includes(idx) && (
                          <div className="bg-gray-50 border rounded p-4 mt-2 ml-7">
                            <div className="text-xs text-gray-500 mb-1">Your Answer:</div>
                            <div className="text-sm mb-2">{item.answer}</div>
                            {item.feedback && (() => {
                              const { pros, cons } = parseFeedback(item.feedback);
                              return (
                                <div className="flex gap-8">
                                  <div>
                                    <div className="font-semibold text-green-700 mb-1">Pros</div>
                                    <ul className="list-disc ml-5 text-green-800 text-sm">
                                      {pros.length ? pros.map((p, i) => <li key={i}>{p}</li>) : <li>None</li>}
                                    </ul>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-red-700 mb-1">Cons</div>
                                    <ul className="list-disc ml-5 text-red-800 text-sm">
                                      {cons.length ? cons.map((c, i) => <li key={i}>{c}</li>) : <li>None</li>}
                                    </ul>
                                  </div>
                                </div>
                              );
                            })()}
              </div>
            )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Detailed Feedback Card */}
              {gradingResult.feedback && (
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="text-lg font-semibold text-gray-900 mb-3">Detailed Feedback</div>
                  <ul className="list-disc ml-5 text-gray-800 space-y-2">
                    {parseFeedback(gradingResult.feedback).pros.map((fb, i) => (
                      <li key={i}>{fb}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            // Default mic area (before grading)
            <CustomMicRecorder 
              onAudioRecorded={handleAudioUpload} 
              onRecordingStart={startTimer}
              onRecordingStop={stopTimer}
            />
          )}
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
                  {message.timestamp.toLocaleDateString()}
                </div>
                <div className={`p-3 rounded-lg text-xs ${
                  message.role === 'candidate'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-gray-50 text-gray-700'
                }`}>
                  {message.isThinking ? (
                    <span>
                      AI is thinking
                      <span className="thinking-dots-bouncing">
                        <span></span>
                        <span></span>
                        <span></span>
                      </span>
                    </span>
                  ) : (
                    message.transcription
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewChat;