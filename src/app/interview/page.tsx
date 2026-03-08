'use client'

import React, { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import InterviewSetup from '../components/InterviewSetup'
import InterviewChat from '../components/InterviewChat'
import { Interview } from '../types/Interview'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { interviewService } from '../services/interviewService'
import { AI_BASE, API_BASE } from '../services/api'
import { CSRF_HEADER_NAME, getCsrfToken } from '../services/csrf'
import { broadcastLogout, clearOAuthHandoffRedirect, requestLogout } from '../services/authSession'

export default function InterviewPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [currentInterview, setCurrentInterview] = useState<Interview | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, loading, setUser } = useAuth()
  const router = useRouter()
  const [loadingInterviews, setLoadingInterviews] = useState(false)
  const [activeModal, setActiveModal] = useState<'profile' | 'settings' | null>(null)
  const [profileFormData, setProfileFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    currentpassword: '',
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const messagePersistQueueRef = useRef<Map<string, Promise<void>>>(new Map())

  // Handle authentication redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [loading, user, router])

  // Load saved interviews when user is authenticated
  useEffect(() => {
    if (user && !loading) {
      clearOAuthHandoffRedirect();
      loadSavedInterviews();
    }
  }, [user, loading]);

  useEffect(() => {
    getCsrfToken().catch((err) => {
      console.error('Failed to initialize CSRF token:', err)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    setProfileFormData((prev) => ({
      ...prev,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      password: '',
      currentpassword: '',
    }))
  }, [user])

  const loadSavedInterviews = async () => {
    try {
      setLoadingInterviews(true);
      console.log('Loading saved interviews...');
      const savedInterviews = await interviewService.getUserInterviews();
      console.log('Received interviews:', savedInterviews);
      const convertedInterviews = savedInterviews.map(response => 
        interviewService.convertToInterview(response)
      );
      console.log('Converted interviews:', convertedInterviews);
      setInterviews(convertedInterviews);
    } catch (error) {
      console.error('Failed to load interviews:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      // Don't show error to user, just log it - interviews will be empty
    } finally {
      setLoadingInterviews(false);
    }
  };

  // Don't render anything while loading or if user is not authenticated
  if (loading || !user) {
    return null
  }

  const handleLogout = async () => {
    try {
      await requestLogout()
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      setUser(null)
      broadcastLogout()
      window.location.href = '/'
    }
  }

  const handleCreateInterview = async (config: any) => {
    // Fetch AI-generated questions
    let aiQuestions: string[] = [];
    try {
      const res = await fetch(`${AI_BASE}/generate_questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      isThinking: false,
    };
    const firstQuestionMessage = {
      id: `${Date.now()}-q0`,
      role: 'interviewer' as const,
      content: aiQuestions[0] || "Let's start with your first question.",
      timestamp: now,
      transcription: `[AI Interviewer]: ${aiQuestions[0] || "Let's start with your first question."}`,
      isThinking: false,
    };
    const messages = [introMessage, firstQuestionMessage];
    
    // Create interview in database
    try {
      const createRequest = {
        title: `${config.role} Interview`,
        role: config.role,
        languages: config.languages,
        difficulty: config.difficulty,
        questions: aiQuestions,
      };
      
      const savedInterview = await interviewService.createInterview(createRequest);
      const newInterview = interviewService.convertToInterview(savedInterview);
      newInterview.messages = messages;
      newInterview.currentQuestionIndex = 0;
      await interviewService.updateInterviewMessages(Number(newInterview.id), {messages: newInterview.messages});

      setInterviews((prev) => [newInterview, ...prev]);
      setCurrentInterview(newInterview);
      setShowSetup(false);
    } catch (error) {
      console.error('Failed to create interview:', error);
      // Fallback to in-memory only - this will work even without backend
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
      setInterviews((prev) => [newInterview, ...prev]);
      setCurrentInterview(newInterview);
      setShowSetup(false);
    }
  };

  const queueInterviewMessageSave = (updated: Interview) => {
    if (isNaN(Number(updated.id))) return
    const lastMessage = updated.messages[updated.messages.length - 1]
    if (lastMessage?.isThinking) return

    const interviewId = updated.id
    const previousSave = messagePersistQueueRef.current.get(interviewId) ?? Promise.resolve()
    const nextSave = previousSave
      .catch(() => undefined)
      .then(async () => {
        await interviewService.updateInterviewMessages(Number(interviewId), {
          messages: updated.messages,
        })
      })
      .catch((error) => {
        console.error('Failed to save interview messages:', error)
      })
      .finally(() => {
        if (messagePersistQueueRef.current.get(interviewId) === nextSave) {
          messagePersistQueueRef.current.delete(interviewId)
        }
      })

    messagePersistQueueRef.current.set(interviewId, nextSave)
  }

  const handleUpdate = (updated: Interview) => {
    setInterviews((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    setCurrentInterview(updated)

    // Persist updates sequentially per interview to avoid out-of-order writes.
    queueInterviewMessageSave(updated)
  }

  const handleDeleteInterview = async (interviewId: string) => {
    try {
      if (!isNaN(Number(interviewId))) {
        await interviewService.deleteInterview(Number(interviewId));
      }
    } catch (error) {
      console.error('Failed to delete interview from backend:', error);
      // Continue with local deletion even if backend fails
    }
    
    // Always remove from local state
    setInterviews((prev) => prev.filter((i) => i.id !== interviewId));
    if (currentInterview?.id === interviewId) {
      setCurrentInterview(null);
    }
  }

  const handleRenameInterview = async (interviewId: string, title: string) => {
    const normalizedTitle = title.trim()
    if (!normalizedTitle) return

    setInterviews((prev) =>
      prev.map((interview) =>
        interview.id === interviewId ? { ...interview, title: normalizedTitle } : interview
      )
    )

    setCurrentInterview((prev) =>
      prev?.id === interviewId ? { ...prev, title: normalizedTitle } : prev
    )

    if (isNaN(Number(interviewId))) return

    try {
      await interviewService.updateInterviewTitle(Number(interviewId), {
        title: normalizedTitle,
      })
    } catch (error) {
      console.error('Failed to rename interview:', error)
    }
  }

  const canChangePassword = !user.authProvider || user.authProvider.toUpperCase() === 'LOCAL'

  const openModal = (modal: 'profile' | 'settings') => {
    setProfileMessage('')
    setShowConfirmDelete(false)
    setActiveModal(modal)
  }

  const closeModal = () => {
    setActiveModal(null)
    setProfileMessage('')
    setShowConfirmDelete(false)
  }

  const handleProfileFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfileFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMessage('')
    setProfileLoading(true)

    try {
      const isPasswordChangeRequested = canChangePassword && profileFormData.password.trim().length > 0
      const payload: Record<string, string> = {
        firstname: profileFormData.firstname,
        lastname: profileFormData.lastname,
      }

      if (isPasswordChangeRequested) {
        payload.password = profileFormData.password
        payload.currentpassword = profileFormData.currentpassword
      }

      const csrfToken = await getCsrfToken()
      const response = await fetch(`${API_BASE}/user/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const text = await response.text()
      if (response.ok) {
        setUser({
          ...user,
          firstname: profileFormData.firstname,
          lastname: profileFormData.lastname,
        })
        setProfileMessage('✅ Profile updated successfully.')
        setProfileFormData((prev) => ({
          ...prev,
          password: '',
          currentpassword: '',
        }))
      } else {
        setProfileMessage(`❌ ${text}`)
      }
    } catch {
      setProfileMessage('❌ An error occurred. Try again.')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setProfileLoading(true)
    try {
      const csrfToken = await getCsrfToken()
      const response = await fetch(`${API_BASE}/user/delete`, {
        method: 'DELETE',
        headers: {
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'include',
      })

      if (response.ok) {
        window.location.href = '/signup'
      } else {
        const errMsg = await response.text()
        setProfileMessage(`❌ ${errMsg}`)
      }
    } catch {
      setProfileMessage('❌ Error deleting account.')
    } finally {
      setProfileLoading(false)
      setShowConfirmDelete(false)
    }
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden font-['Space_Grotesk']">
      <Sidebar
        interviews={interviews}
        currentInterview={currentInterview}
        onStartNew={() => setShowSetup(true)}
        onSelectInterview={setCurrentInterview}
        onDeleteInterview={handleDeleteInterview}
        onRenameInterview={handleRenameInterview}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        userInitial={user.firstname?.charAt(0).toUpperCase() || 'U'}
        userFirstName={user.firstname}
        userCreatedAt={user.createdAt}
        userName={`${user.firstname} ${user.lastname}`.trim() || user.email}
        userEmail={user.email}
        onOpenProfile={() => openModal('profile')}
        onOpenSettings={() => openModal('settings')}
        onLogout={handleLogout}
        loading={loadingInterviews}
      />

      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="h-full flex items-center justify-center p-8"
            >
              <div className="text-center max-w-md">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="w-24 h-24 mx-auto mb-2 flex items-center justify-center"
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
                  Welcome back, {user?.firstname || 'there'}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="text-gray-600 mb-6"
                >
                  Select an interview from the sidebar or start a new one
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
                  Create New Interview
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {activeModal === 'profile' ? 'Profile' : 'Settings'}
                </h2>
                <button
                  onClick={closeModal}
                  className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {activeModal === 'profile' ? (
                <div className="px-6 py-5">
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">First Name</label>
                        <input
                          name="firstname"
                          type="text"
                          value={profileFormData.firstname}
                          onChange={handleProfileFieldChange}
                          className="mt-1 block w-full border rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Name</label>
                        <input
                          name="lastname"
                          type="text"
                          value={profileFormData.lastname}
                          onChange={handleProfileFieldChange}
                          className="mt-1 block w-full border rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          name="email"
                          type="email"
                          value={profileFormData.email}
                          readOnly
                          disabled
                          className="mt-1 block w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                      </div>

                      {canChangePassword ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">New Password</label>
                          <input
                            name="password"
                            type="password"
                            value={profileFormData.password}
                            onChange={handleProfileFieldChange}
                            placeholder="Leave blank to keep current password"
                            className="mt-1 block w-full border rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          Password changes are managed by your social login provider.
                        </p>
                      )}

                      {canChangePassword && profileFormData.password.trim().length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Current Password</label>
                          <input
                            name="currentpassword"
                            type="password"
                            value={profileFormData.currentpassword}
                            onChange={handleProfileFieldChange}
                            className="mt-1 block w-full border rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                      )}
                    </div>

                    {profileMessage && (
                      <p
                        className={`text-sm text-center ${
                          profileMessage.startsWith('✅') ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {profileMessage}
                      </p>
                    )}

                    <div>
                      <button
                        type="submit"
                        disabled={profileLoading}
                        className={`w-full py-3 px-4 text-white font-medium rounded-md shadow-sm bg-green-600 hover:bg-green-700 focus:outline-none ${
                          profileLoading ? 'opacity-75 cursor-not-allowed' : ''
                        }`}
                      >
                        {profileLoading ? 'Saving...' : 'Update Profile'}
                      </button>
                    </div>
                  </form>

                  <div className="mt-10 text-center">
                    <button
                      onClick={() => setShowConfirmDelete(true)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete My Account
                    </button>
                  </div>

                  {showConfirmDelete && (
                    <div className="mt-6 bg-red-50 border border-red-200 p-4 rounded-md">
                      <p className="text-sm text-red-700">
                        Are you sure you want to permanently delete your account?
                      </p>
                      <div className="mt-4 flex justify-between">
                        <button
                          onClick={handleDeleteAccount}
                          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                        >
                          Yes, delete it
                        </button>
                        <button
                          onClick={() => setShowConfirmDelete(false)}
                          className="text-sm text-gray-600 underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  Settings content coming soon.
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
