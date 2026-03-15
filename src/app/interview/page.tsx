'use client'

import React, { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import CommunicationSetup from '../components/CommunicationSetup'
import InterviewSetup from '../components/InterviewSetup'
import InterviewChat from '../components/InterviewChat'
import CoachNotes, { COACH_NOTES, type CoachNoteId } from '../components/CoachNotes'
import {
  CommunicationSessionConfig,
  GeneratedPrompt,
  Interview,
  InterviewConfig,
} from '../types/Interview'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  ChevronDown,
  ChevronUp,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Settings,
  Sun,
  User,
} from 'lucide-react'
import { interviewService } from '../services/interviewService'
import { AI_BASE, API_BASE } from '../services/api'
import { CSRF_HEADER_NAME, getCsrfToken } from '../services/csrf'
import { broadcastLogout, clearOAuthHandoffRedirect, requestLogout } from '../services/authSession'
import {
  getAudienceLabel,
  getPracticeModeLabel,
  normalizeGeneratedPrompt,
} from '../lib/practiceConfig'

type SettingsTab = 'account' | 'appearance' | 'notifications'
type ThemePreference = 'system' | 'light' | 'dark'
type SidebarPreference = 'standard' | 'compact'
type ProfileToastType = 'success' | 'error'
type WorkspaceLandingView = 'home' | 'communication' | 'behavioral' | 'notes'

const SETTINGS_STORAGE_KEY = 'naild.settings.preferences.v1'
const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark'

const resolveThemePreference = (
  preference: ThemePreference,
  prefersDark: boolean
): Exclude<ThemePreference, 'system'> => {
  if (preference === 'system') {
    return prefersDark ? 'dark' : 'light'
  }

  return preference
}

export default function InterviewPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [currentInterview, setCurrentInterview] = useState<Interview | null>(null)
  const [activeLandingView, setActiveLandingView] = useState<WorkspaceLandingView>('home')
  const [selectedLibraryTopicId, setSelectedLibraryTopicId] = useState<CoachNoteId>(
    COACH_NOTES[0].id
  )
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, loading, setUser } = useAuth()
  const router = useRouter()
  const [loadingInterviews, setLoadingInterviews] = useState(false)
  const [activeModal, setActiveModal] = useState<'settings' | null>(null)
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('account')
  const [themePreference, setThemePreference] = useState<ThemePreference>('system')
  const [resolvedTheme, setResolvedTheme] = useState<Exclude<ThemePreference, 'system'>>('light')
  const [sidebarPreference, setSidebarPreference] = useState<SidebarPreference>('standard')
  const [interviewReminderNotifications, setInterviewReminderNotifications] = useState(true)
  const [emailSummaryNotifications, setEmailSummaryNotifications] = useState(true)
  const [productUpdatesNotifications, setProductUpdatesNotifications] = useState(false)
  const [profileFormData, setProfileFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    currentpassword: '',
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileUpdateToast, setProfileUpdateToast] = useState<{
    type: ProfileToastType
    message: string
  } | null>(null)
  const [showAccountEditor, setShowAccountEditor] = useState(false)
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false)
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

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const rawPreferences = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (!rawPreferences) return

      const parsed = JSON.parse(rawPreferences) as Partial<{
        themePreference: ThemePreference
        sidebarPreference: SidebarPreference
        interviewReminderNotifications: boolean
        emailSummaryNotifications: boolean
        productUpdatesNotifications: boolean
      }>

      if (isThemePreference(parsed.themePreference)) {
        setThemePreference(parsed.themePreference)
      }

      if (parsed.sidebarPreference === 'standard' || parsed.sidebarPreference === 'compact') {
        setSidebarPreference(parsed.sidebarPreference)
        setSidebarCollapsed(parsed.sidebarPreference === 'compact')
      }

      if (typeof parsed.interviewReminderNotifications === 'boolean') {
        setInterviewReminderNotifications(parsed.interviewReminderNotifications)
      }

      if (typeof parsed.emailSummaryNotifications === 'boolean') {
        setEmailSummaryNotifications(parsed.emailSummaryNotifications)
      }

      if (typeof parsed.productUpdatesNotifications === 'boolean') {
        setProductUpdatesNotifications(parsed.productUpdatesNotifications)
      }
    } catch (error) {
      console.error('Failed to parse settings preferences:', error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const serializedPreferences = JSON.stringify({
      themePreference,
      sidebarPreference,
      interviewReminderNotifications,
      emailSummaryNotifications,
      productUpdatesNotifications,
    })
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, serializedPreferences)
  }, [
    themePreference,
    sidebarPreference,
    interviewReminderNotifications,
    emailSummaryNotifications,
    productUpdatesNotifications,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const rootElement = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyThemePreference = () => {
      const nextResolvedTheme = resolveThemePreference(themePreference, mediaQuery.matches)
      rootElement.dataset.themePreference = themePreference
      rootElement.dataset.theme = nextResolvedTheme
      rootElement.style.colorScheme = nextResolvedTheme
      setResolvedTheme(nextResolvedTheme)
    }

    const handlePreferenceChange = () => {
      if (themePreference !== 'system') return
      applyThemePreference()
    }

    applyThemePreference()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handlePreferenceChange)
      return () => mediaQuery.removeEventListener('change', handlePreferenceChange)
    }

    mediaQuery.addListener(handlePreferenceChange)
    return () => mediaQuery.removeListener(handlePreferenceChange)
  }, [themePreference])

  useEffect(() => {
    return () => {
      const rootElement = document.documentElement
      rootElement.removeAttribute('data-theme')
      rootElement.removeAttribute('data-theme-preference')
      rootElement.style.removeProperty('color-scheme')
    }
  }, [])

  useEffect(() => {
    if (activeSettingsTab === 'account') return
    setShowAccountEditor(false)
    setShowDeleteAccountConfirm(false)
  }, [activeSettingsTab])

  useEffect(() => {
    if (!profileUpdateToast) return
    const timeoutId = window.setTimeout(() => {
      setProfileUpdateToast(null)
    }, 3500)

    return () => window.clearTimeout(timeoutId)
  }, [profileUpdateToast])

  const showProfileUpdateToast = (type: ProfileToastType, message: string) => {
    setProfileUpdateToast({ type, message })
  }

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

  const openHome = () => {
    setActiveLandingView('home')
    setCurrentInterview(null)
  }

  const openBehavioralSetup = () => {
    setActiveLandingView('behavioral')
    setCurrentInterview(null)
  }

  const openCommunicationSetup = () => {
    setActiveLandingView('communication')
    setCurrentInterview(null)
  }

  const handleSelectLibraryTopic = (topicId: CoachNoteId) => {
    setSelectedLibraryTopicId(topicId)
    setActiveLandingView('notes')
    setCurrentInterview(null)
  }

  const buildFallbackPrompt = (config: CommunicationSessionConfig): GeneratedPrompt => {
    const audience = getAudienceLabel(config.audience)
    const topic = config.topic.trim() || `${config.role.toLowerCase()} system choice`
    const promptLabel = getPracticeModeLabel(config.practiceMode)

    return {
      title: `${config.role} • ${promptLabel}`,
      scenario: `You are explaining ${topic} to a ${audience.toLowerCase()}.`,
      prompt: `Explain ${topic} to a ${audience.toLowerCase()} in a way that is clear, technically accurate, and useful for decision-making.`,
      audience,
      practice_mode: config.practiceMode,
      field: config.role,
      topic,
      what_to_cover: [
        'Lead with the core point',
        'Explain the mechanism or decision clearly',
        'Show the most important tradeoff or implication',
      ],
      time_guidance: 'Aim for 60 to 90 seconds.',
      focus_areas: ['Clarity', 'Correctness', 'Depth', 'Audience fit'],
    }
  }

  const buildTechnicalCoachIntro = (
    config: CommunicationSessionConfig,
    generatedPrompt: GeneratedPrompt
  ) => {
    const sections = [
      `Today's drill is for a ${config.role}.`,
      generatedPrompt.scenario,
      generatedPrompt.what_to_cover.length > 0
        ? `A strong answer should cover: ${generatedPrompt.what_to_cover.join('; ')}.`
        : '',
      generatedPrompt.time_guidance,
    ].filter(Boolean)

    return sections.join(' ')
  }

  const handleCreateTechnicalSession = async (config: CommunicationSessionConfig) => {
    const fallbackPrompt = buildFallbackPrompt(config)
    let generatedPrompt: GeneratedPrompt = fallbackPrompt

    try {
      const res = await fetch(`${AI_BASE}/generate_drill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          field: config.role,
          practice_mode: config.practiceMode,
          audience: config.audience,
          topic: config.topic,
          additional_context: config.promptContext,
          difficulty: config.difficulty,
        }),
      })

      if (!res.ok) {
        throw new Error(`Failed to generate drill: ${res.status}`)
      }

      const data = await res.json()
      const rawPrompt =
        data?.prompt && typeof data.prompt === 'object'
          ? (data.prompt as Partial<GeneratedPrompt>)
          : (data as Partial<GeneratedPrompt>)

      generatedPrompt = normalizeGeneratedPrompt(rawPrompt, fallbackPrompt)
    } catch {
      generatedPrompt = fallbackPrompt
    }

    const coachIntro = buildTechnicalCoachIntro(config, generatedPrompt)
    const now = new Date()
    const introMessage = {
      id: `${Date.now()}-intro`,
      role: 'interviewer' as const,
      content: coachIntro,
      timestamp: now,
      transcription: `[AI Coach]: ${coachIntro}`,
      isThinking: false,
    }
    const promptMessage = {
      id: `${Date.now()}-prompt`,
      role: 'interviewer' as const,
      content: `Prompt: ${generatedPrompt.prompt}`,
      timestamp: now,
      transcription: `[AI Coach]: Prompt: ${generatedPrompt.prompt}`,
      isThinking: false,
    }
    const messages = [introMessage, promptMessage]

    try {
      const createRequest = {
        title: generatedPrompt.title,
        role: config.role,
        languages: generatedPrompt.focus_areas,
        difficulty: config.difficulty,
        questions: [generatedPrompt.prompt],
        sessionType: 'technical-communication' as const,
        practiceMode: config.practiceMode,
        audience: config.audience,
        topic: generatedPrompt.topic,
        promptContext: config.promptContext,
        generatedPrompt,
      }

      const savedInterview = await interviewService.createInterview(createRequest)
      const newInterview = interviewService.convertToInterview(savedInterview)
      newInterview.messages = messages
      newInterview.currentQuestionIndex = 0
      await interviewService.updateInterviewMessages(Number(newInterview.id), { messages: newInterview.messages })

      setInterviews((prev) => [newInterview, ...prev])
      setCurrentInterview(newInterview)
      setActiveLandingView('home')
    } catch (error) {
      console.error('Failed to create technical communication session:', error)
      const newInterview: Interview = {
        id: Date.now().toString(),
        title: generatedPrompt.title,
        role: config.role,
        languages: generatedPrompt.focus_areas ?? [],
        difficulty: config.difficulty,
        sessionType: 'technical-communication',
        practiceMode: config.practiceMode,
        audience: config.audience,
        topic: generatedPrompt.topic,
        promptContext: config.promptContext,
        generatedPrompt,
        createdAt: now,
        messages,
        status: 'active',
        questions: [generatedPrompt.prompt],
        currentQuestionIndex: 0,
      }
      setInterviews((prev) => [newInterview, ...prev])
      setCurrentInterview(newInterview)
      setActiveLandingView('home')
    }
  }

  const handleCreateBehavioralInterview = async (config: InterviewConfig) => {
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
          topic: config.topic,
          additional_context: config.promptContext,
        }),
      });
      const data = await res.json();
      // Parse numbered list into array
      aiQuestions = data.questions
        .split(/\n|\r/)
        .map((q: string) => q.replace(/^\d+\.|^\d+\)/, '').trim())
        .filter((q: string) => q.length > 0);
    } catch {
      aiQuestions = [];
    }
    const focusAreaSummary = config.languages.join(', ')
    const questionCount = aiQuestions.length || 5
    const introCopy = `Welcome to your ${config.role} behavioral interview! I'll be asking you ${questionCount} questions focused on ${focusAreaSummary}. Let's get started!`
    const now = new Date();
    // Add introduction and first question
    const introMessage = {
      id: `${Date.now()}-intro`,
      role: 'interviewer' as const,
      content: introCopy,
      timestamp: now,
      transcription: `[AI Interviewer]: ${introCopy}`,
      isThinking: false,
    };
    const firstQuestionMessage = {
      id: `${Date.now()}-q0`,
      role: 'interviewer' as const,
      content: aiQuestions[0] || "Tell me about a time you handled a challenging situation at work.",
      timestamp: now,
      transcription: `[AI Interviewer]: ${aiQuestions[0] || "Tell me about a time you handled a challenging situation at work."}`,
      isThinking: false,
    };
    const messages = [introMessage, firstQuestionMessage];
    
    // Create interview in database
    try {
      const createRequest = {
        title: `${config.role} Behavioral Interview`,
        role: config.role,
        languages: config.languages,
        difficulty: config.difficulty,
        questions: aiQuestions,
        topic: config.topic || null,
        promptContext: config.promptContext || null,
      };
      
      const savedInterview = await interviewService.createInterview(createRequest);
      const newInterview = interviewService.convertToInterview(savedInterview);
      newInterview.messages = messages;
      newInterview.currentQuestionIndex = 0;
      newInterview.topic = config.topic || null;
      newInterview.promptContext = config.promptContext || null;
      await interviewService.updateInterviewMessages(Number(newInterview.id), {messages: newInterview.messages});

      setInterviews((prev) => [newInterview, ...prev]);
      setCurrentInterview(newInterview);
      setActiveLandingView('home');
    } catch (error) {
      console.error('Failed to create interview:', error);
      // Fallback to in-memory only - this will work even without backend
      const newInterview: Interview = {
        id: Date.now().toString(),
        title: `${config.role} Behavioral Interview`,
        role: config.role,
        languages: config.languages,
        difficulty: config.difficulty,
        topic: config.topic || null,
        promptContext: config.promptContext || null,
        createdAt: now,
        messages,
        status: 'active',
        questions: aiQuestions,
        currentQuestionIndex: 0,
      };
      setInterviews((prev) => [newInterview, ...prev]);
      setCurrentInterview(newInterview);
      setActiveLandingView('home');
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
      setActiveLandingView('home')
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

  const handleSelectInterview = (interview: Interview) => {
    setActiveLandingView('home')
    setCurrentInterview(interview)
  }

  const canChangePassword = !user.authProvider || user.authProvider.toUpperCase() === 'LOCAL'

  const openModal = () => {
    setProfileUpdateToast(null)
    setShowAccountEditor(false)
    setShowDeleteAccountConfirm(false)
    setActiveSettingsTab('account')
    setActiveModal('settings')
  }

  const closeModal = () => {
    setActiveModal(null)
    setProfileUpdateToast(null)
    setShowAccountEditor(false)
    setShowDeleteAccountConfirm(false)
  }

  const handleSidebarToggle = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      setSidebarPreference(next ? 'compact' : 'standard')
      return next
    })
  }

  const handleToggleAccountEditor = () => {
    setShowAccountEditor((prev) => !prev)
    setProfileUpdateToast(null)
    setShowDeleteAccountConfirm(false)
  }

  const handleProfileFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfileFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileUpdateToast(null)
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
        showProfileUpdateToast('success', 'Profile updated successfully.')
        setProfileFormData((prev) => ({
          ...prev,
          password: '',
          currentpassword: '',
        }))
      } else {
        showProfileUpdateToast('error', text || 'Failed to update profile.')
      }
    } catch {
      showProfileUpdateToast('error', 'An error occurred. Try again.')
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
        window.location.href = '/'
      } else {
        const errMsg = await response.text()
        showProfileUpdateToast('error', errMsg || 'Error deleting account.')
      }
    } catch {
      showProfileUpdateToast('error', 'Error deleting account.')
    } finally {
      setProfileLoading(false)
      setShowDeleteAccountConfirm(false)
    }
  }

  const handleConfirmDeleteAccount = () => {
    setShowDeleteAccountConfirm(true)
  }

  const settingsTabs = [
    {
      id: 'account' as const,
      label: 'Account',
      description: 'Manage your profile information and account security.',
      icon: User,
    },
    {
      id: 'appearance' as const,
      label: 'Appearance',
      description: 'Personalize workspace display preferences.',
      icon: Palette,
    },
    {
      id: 'notifications' as const,
      label: 'Notifications',
      description: 'Control reminders and email notification preferences.',
      icon: Bell,
    },
  ]

  const activeSettingsItem =
    settingsTabs.find((tab) => tab.id === activeSettingsTab) ?? settingsTabs[0]
  const modalTitle = 'Settings'
  const modalSubtitle = activeSettingsItem.description
  const greetingName = user.firstname || 'there'

  const renderPromptPanel = () => {
    return (
      <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-4 overflow-y-auto px-6 py-6 lg:px-10">
        <div className="flex items-center justify-center">
          <button
            onClick={openHome}
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ChevronUp size={16} />
            Back
          </button>
        </div>

        <div className="flex-1 min-h-0">
          {activeLandingView === 'behavioral' ? (
            <InterviewSetup onCreateInterview={handleCreateBehavioralInterview} />
          ) : (
            <CommunicationSetup onCreateSession={handleCreateTechnicalSession} />
          )}
        </div>
      </div>
    )
  }

  const renderPracticeFlow = () => (
    <div className="practice-home-shell h-full overflow-hidden">
      <motion.div
        initial={false}
        animate={{ y: activeLandingView === 'home' ? '0%' : '-50%' }}
        transition={{ type: 'spring', stiffness: 170, damping: 26 }}
        className="flex h-[200%] flex-col"
      >
        <section className="flex h-1/2 items-center">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center gap-6 px-6 py-8 lg:px-10">
            <section className="flex flex-col items-center justify-center px-4 pt-8 pb-2 text-center sm:pt-12">
              <div className="flex h-24 w-24 items-center justify-center">
                <img
                  src="/naild_logo.png"
                  alt="Naild Logo"
                  className="h-20 w-20 object-contain"
                />
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                Welcome back, {greetingName}
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-gray-600">
                Practice explaining technical ideas out loud, then jump back into saved sessions from the sidebar.
              </p>
            </section>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
              <section className="practice-mode-card practice-mode-card--technical rounded-[28px] border p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-emerald-700">
                      Technical communication
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-gray-900">Role-specific speaking drills</h2>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-gray-600">
                      Pick your field, the audience, and the kind of explanation you want to practice. Naild generates one focused drill and scores clarity, correctness, depth, and audience fit.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {['Software engineering', 'Data science', 'AI engineering', 'Decision tradeoffs'].map((pill) => (
                    <span
                      key={pill}
                      className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-gray-700"
                    >
                      {pill}
                    </span>
                  ))}
                </div>

                <div className="mt-8">
                  <button
                    onClick={openCommunicationSetup}
                    className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-black"
                  >
                    Generate drill
                    <ChevronDown size={16} />
                  </button>
                </div>
              </section>

              <section className="practice-mode-card practice-mode-card--behavioral rounded-[28px] border p-6 sm:p-7">
                <div className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-emerald-700">
                  Secondary mode
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">Behavioral interviews</h2>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Keep practicing the classic story-based interview flow when you need it.
                </p>

                <div className="mt-8">
                  <button
                    onClick={openBehavioralSetup}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Start interview
                    <ChevronDown size={16} />
                  </button>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="practice-preview-shell flex h-1/2 items-center justify-center">
          {renderPromptPanel()}
        </section>
      </motion.div>
    </div>
  )

  return (
    <div className="interview-workspace flex h-screen bg-white overflow-hidden font-['Space_Grotesk']">
      <Sidebar
        interviews={interviews}
        currentInterview={currentInterview}
        onGoHome={openHome}
        onStartNew={openCommunicationSetup}
        onSelectInterview={handleSelectInterview}
        onDeleteInterview={handleDeleteInterview}
        onRenameInterview={handleRenameInterview}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleSidebarToggle}
        userInitial={user.firstname?.charAt(0).toUpperCase() || 'U'}
        userFirstName={user.firstname}
        userCreatedAt={user.createdAt}
        userName={`${user.firstname} ${user.lastname}`.trim() || user.email}
        userEmail={user.email}
        onOpenSettings={openModal}
        onSelectLibraryTopic={handleSelectLibraryTopic}
        onLogout={handleLogout}
        loading={loadingInterviews}
        isHomeActive={!currentInterview && activeLandingView === 'home'}
        isLibraryActive={!currentInterview && activeLandingView === 'notes'}
      />

      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        {/* Interview Section */}
        <div className="flex-1 overflow-hidden">
          {currentInterview ? (
            <InterviewChat
              interview={currentInterview}
              onUpdateInterview={handleUpdate}
            />
          ) : activeLandingView === 'notes' ? (
            <CoachNotes
              selectedTopicId={selectedLibraryTopicId}
              onSelectTopic={setSelectedLibraryTopicId}
            />
          ) : (
            renderPracticeFlow()
          )}
        </div>
      </main>

      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 p-3 sm:p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-5">
                <div>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Settings size={18} />
                    <h2 className="text-sm font-semibold sm:text-base">{modalTitle}</h2>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 sm:text-sm">{modalSubtitle}</p>
                </div>
                <button
                  onClick={closeModal}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  <span className="text-sm">✕</span>
                </button>
              </div>

              <div className="max-h-[calc(92vh-84px)] overflow-y-auto bg-gradient-to-b from-white to-gray-50">
                <div className="flex min-h-[460px] flex-col sm:flex-row">
                  <aside className="border-b border-gray-200 bg-gray-50/80 p-3 sm:w-56 sm:border-b-0 sm:border-r sm:p-4">
                    <nav className="space-y-1">
                      {settingsTabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeSettingsTab === tab.id
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveSettingsTab(tab.id)}
                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                              isActive
                                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                : 'text-gray-600 hover:bg-white/80 hover:text-gray-900'
                            }`}
                          >
                            <Icon size={16} />
                            {tab.label}
                          </button>
                        )
                      })}

                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    </nav>
                  </aside>

                  <section className="flex-1 p-5 sm:p-6">
                    {activeSettingsTab === 'account' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">Account</h3>
                          <p className="mt-1 text-sm text-gray-600">
                            Update your profile details and account security from one place.
                          </p>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                          <dl className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-4">
                              <dt className="text-gray-500">Name</dt>
                              <dd className="font-medium text-gray-900">
                                {`${user.firstname} ${user.lastname}`.trim() || 'Not provided'}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <dt className="text-gray-500">Email</dt>
                              <dd className="font-medium text-gray-900">{user.email}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <dt className="text-gray-500">Sign-in Method</dt>
                              <dd className="font-medium text-gray-900">
                                {user.authProvider || 'Local account'}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={handleToggleAccountEditor}
                            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black"
                          >
                            {showAccountEditor ? 'Close Account Editor' : 'Change Account Details'}
                          </button>
                        </div>

                        {showAccountEditor && (
                          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
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

                              <div>
                                <button
                                  type="submit"
                                  disabled={profileLoading}
                                  className={`w-full py-3 px-4 rounded-md border border-[#26922c] bg-[#cbf5cd] text-black font-medium text-base hover:bg-[#bfeec2] focus:outline-none ${
                                    profileLoading ? 'opacity-75 cursor-not-allowed' : ''
                                  }`}
                                >
                                  {profileLoading ? 'Saving...' : 'Update Profile'}
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        <div className="border-t border-gray-200 pt-4">
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-sm text-gray-700">Delete Account</p>
                            <button
                              onClick={handleConfirmDeleteAccount}
                              disabled={profileLoading}
                              className={`px-4 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 ${
                                profileLoading ? 'opacity-75 cursor-not-allowed' : ''
                              }`}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSettingsTab === 'appearance' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">Appearance</h3>
                          <p className="mt-1 text-sm text-gray-600">
                            Customize how your practice workspace looks and feels.
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-800">Theme</p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <button
                              onClick={() => setThemePreference('system')}
                              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm ${
                                themePreference === 'system'
                                  ? 'border-gray-900 bg-gray-900 text-white'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <Monitor size={16} />
                              System
                            </button>
                            <button
                              onClick={() => setThemePreference('light')}
                              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm ${
                                themePreference === 'light'
                                  ? 'border-gray-900 bg-gray-900 text-white'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <Sun size={16} />
                              Light
                            </button>
                            <button
                              onClick={() => setThemePreference('dark')}
                              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm ${
                                themePreference === 'dark'
                                  ? 'border-gray-900 bg-gray-900 text-white'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <Moon size={16} />
                              Dark
                            </button>
                          </div>
                          <p className="mt-3 text-xs text-gray-500">
                            Current color mode:{' '}
                            {themePreference === 'system'
                              ? `System (${resolvedTheme})`
                              : resolvedTheme.charAt(0).toUpperCase() + resolvedTheme.slice(1)}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-800">Sidebar Layout</p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <button
                              onClick={() => {
                                setSidebarPreference('standard')
                                setSidebarCollapsed(false)
                              }}
                              className={`rounded-md border px-3 py-2 text-sm ${
                                sidebarPreference === 'standard'
                                  ? 'border-gray-900 bg-gray-900 text-white'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              Standard
                            </button>
                            <button
                              onClick={() => {
                                setSidebarPreference('compact')
                                setSidebarCollapsed(true)
                              }}
                              className={`rounded-md border px-3 py-2 text-sm ${
                                sidebarPreference === 'compact'
                                  ? 'border-gray-900 bg-gray-900 text-white'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              Compact
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSettingsTab === 'notifications' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">Notifications</h3>
                          <p className="mt-1 text-sm text-gray-600">
                            Choose which updates and reminders you want to receive.
                          </p>
                        </div>

                        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
                          <label className="flex items-center justify-between gap-4 rounded-md border border-gray-100 p-3">
                            <span className="text-sm text-gray-700">Practice reminders</span>
                            <input
                              type="checkbox"
                              checked={interviewReminderNotifications}
                              onChange={(e) => setInterviewReminderNotifications(e.target.checked)}
                              className="h-4 w-4 accent-gray-900"
                            />
                          </label>
                          <label className="flex items-center justify-between gap-4 rounded-md border border-gray-100 p-3">
                            <span className="text-sm text-gray-700">Email practice summaries</span>
                            <input
                              type="checkbox"
                              checked={emailSummaryNotifications}
                              onChange={(e) => setEmailSummaryNotifications(e.target.checked)}
                              className="h-4 w-4 accent-gray-900"
                            />
                          </label>
                          <label className="flex items-center justify-between gap-4 rounded-md border border-gray-100 p-3">
                            <span className="text-sm text-gray-700">Product updates and announcements</span>
                            <input
                              type="checkbox"
                              checked={productUpdatesNotifications}
                              onChange={(e) => setProductUpdatesNotifications(e.target.checked)}
                              className="h-4 w-4 accent-gray-900"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteAccountConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 p-4"
            onClick={() => setShowDeleteAccountConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md rounded-xl border border-red-200 bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-gray-900">Delete Account</h3>
              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to permanently delete your account? This action cannot be undone.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteAccountConfirm(false)}
                  disabled={profileLoading}
                  className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleDeleteAccount()}
                  disabled={profileLoading}
                  className={`px-3 py-1.5 rounded-md border border-red-300 bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 ${
                    profileLoading ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {profileLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileUpdateToast && (
          <motion.div
            key={profileUpdateToast.message}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-4 right-4 z-[120] w-[calc(100vw-2rem)] max-w-sm rounded-lg border px-4 py-3 shadow-lg ${
              profileUpdateToast.type === 'success'
                ? 'border-teal-200 bg-teal-50 text-teal-900'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            <p className="text-sm font-medium">
              {profileUpdateToast.type === 'success' ? 'Profile Updated' : 'Profile Update Failed'}
            </p>
            <p className="mt-1 text-sm">{profileUpdateToast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
