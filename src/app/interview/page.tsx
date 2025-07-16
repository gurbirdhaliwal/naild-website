'use client'

import React, { useState, useRef, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import InterviewSetup from '../components/InterviewSetup'
import InterviewChat from '../components/InterviewChat'
import { Interview } from '../types/Interview'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { MdOutlinePersonPin, MdLogout } from 'react-icons/md'
import { IoSettingsOutline } from 'react-icons/io5'

export default function InterviewPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [currentInterview, setCurrentInterview] = useState<Interview | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, loading, setUser } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  // Handle authentication redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  // Don't render anything while loading or if user is not authenticated
  if (loading || !user) {
    return null
  }

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8080/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      setUser(null)
      window.location.href = '/'
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  const handleCreateInterview = async (config: any) => {
    // Fetch AI-generated questions
    let aiQuestions: string[] = [];
    try {
      const res = await fetch('http://localhost:8081/generate_questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: config.role,
          languages: config.languages,
          difficulty: config.difficulty,
        }),
      });
      const data = await res.json();
      // Parse numbered list into array
      aiQuestions = data.questions
        .split(/\n|\r/)
        .map((q: string) => q.replace(/^\d+\.|^\d+\)/, '').trim())
        .filter((q: string) => q.length > 0);
    } catch (e) {
      aiQuestions = [];
    }
    const now = new Date();
    // Add introduction and first question
    const introMessage = {
      id: `${Date.now()}-intro`,
      role: 'interviewer' as const,
      content: `Welcome to your ${config.role} interview! I'll be asking you ${aiQuestions.length} questions about ${config.languages.join(', ')}. Let's get started!`,
      timestamp: now,
      transcription: `[AI Interviewer]: Welcome to your ${config.role} interview! I'll be asking you ${aiQuestions.length} questions about ${config.languages.join(', ')}. Let's get started!`,
    };
    const firstQuestionMessage = {
      id: `${Date.now()}-q0`,
      role: 'interviewer' as const,
      content: aiQuestions[0] || "Let's start with your first question.",
      timestamp: now,
      transcription: `[AI Interviewer]: ${aiQuestions[0] || "Let's start with your first question."}`,
    };
    const messages = [introMessage, firstQuestionMessage];
    const newInterview: Interview = {
      id: Date.now().toString(),
      title: `${config.role} Interview`,
      role: config.role,
      languages: config.languages,
      difficulty: config.difficulty,
      createdAt: now,
      messages,
      status: 'active',
      questions: aiQuestions,
      currentQuestionIndex: 0,
    };
    console.log(aiQuestions);
    setInterviews((prev) => [newInterview, ...prev]);
    setCurrentInterview(newInterview);
    setShowSetup(false);
  };

  const handleUpdate = (updated: Interview) => {
    setInterviews((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    setCurrentInterview(updated)
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden font-['Space_Grotesk']">
      <Sidebar
        interviews={interviews}
        currentInterview={currentInterview}
        onStartNew={() => setShowSetup(true)}
        onSelectInterview={setCurrentInterview}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        {/* Top-right Profile */}
        <div className="flex justify-end items-center p-4 border-b border-gray-200 relative">
          {user && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-full transition"
              >
                <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-lg">
                  {user.firstname?.charAt(0).toUpperCase() || 'U'}
                </div>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                  >
                    <Link href="/profile" className="dropdown-link">
                      <MdOutlinePersonPin className="text-lg text-green-600" />
                      Profile
                    </Link>
                    <Link href="/settings" className="dropdown-link">
                      <IoSettingsOutline className="text-lg text-green-600" />
                      Settings
                    </Link>
                    <button onClick={handleLogout} className="dropdown-link text-red-600">
                      <MdLogout className="text-lg" />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Interview Section */}
        <div className="flex-1 overflow-hidden">
          {showSetup ? (
            <div className="w-full overflow-y-auto h-full flex items-center justify-center">
              <InterviewSetup onCreateInterview={handleCreateInterview} />
            </div>
          ) : currentInterview ? (
            <InterviewChat
              interview={currentInterview}
              onUpdateInterview={handleUpdate}
            />
          ) : interviews.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="h-full flex items-start justify-center pt-32 p-8"
            >
              <div className="text-center max-w-md">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="w-24 h-24 mx-auto mb-2 flex items-center justify-center mt-10"
                >
                  <img
                    src="/naild_logo.png"
                    alt="Naild Logo"
                    className="w-20 h-20 object-contain"
                  />
                </motion.div>
                <motion.h3 
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: -10 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="text-3xl text-gray-900 mb-2 font-['Space_Grotesk'] mt-4"
                >
                  Hey {user?.firstname || 'there'}, let's jump into some interviews!
                </motion.h3>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="text-gray-600 mb-6"
                >
                  
                </motion.p>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSetup(true)}
                  className="inline-flex items-center px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors mt-1"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Your First Interview
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-gray-500">
              Select an interview from the sidebar or start a new one
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
