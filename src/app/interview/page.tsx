'use client'

import React, { useState, useRef } from 'react'
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
  const [showSetup, setShowSetup] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, loading, setUser } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  if (!loading && !user) {
    router.push('/login')
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

  const handleCreateInterview = (config: any) => {
    const newInterview: Interview = {
      id: Date.now().toString(),
      title: `${config.role} Interview`,
      role: config.role,
      languages: config.languages,
      difficulty: config.difficulty,
      createdAt: new Date(),
      messages: [],
      status: 'active',
    }
    setInterviews((prev) => [newInterview, ...prev])
    setCurrentInterview(newInterview)
    setShowSetup(false)
  }

  const handleUpdate = (updated: Interview) => {
    setInterviews((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    setCurrentInterview(updated)
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
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
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-gray-500">
              Select or start an interview
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
