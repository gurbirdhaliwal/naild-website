'use client'

import Image from 'next/image'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from '../components/Sidebar'
import CommunicationSetup from '../components/CommunicationSetup'
import InterviewSetup from '../components/InterviewSetup'
import InterviewChat from '../components/InterviewChat'
import TechChatSession from '../components/TechChatSession'
import TechChatSetup, { type TechChatSessionConfig } from '../components/TechChatSetup'
import Library, { LIBRARY_SECTIONS, type LibrarySectionId } from '../components/Library'
import WorkspaceTutorial, { type WorkspaceTutorialStep } from '../components/WorkspaceTutorial'
import {
  CommunicationSessionConfig,
  GeneratedPrompt,
  Interview,
  InterviewConfig,
} from '../types/Interview'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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
  Volume2,
} from 'lucide-react'
import { interviewService } from '../services/interviewService'
import { AI_BASE, API_BASE } from '../services/api'
import { getAuthHeaders } from '../services/authToken'
import { broadcastLogout, consumeOAuthHandoffRedirect, requestLogout } from '../services/authSession'
import {
  getAudienceLabel,
  getPracticeModeLabel,
  normalizeGeneratedPrompt,
} from '../lib/practiceConfig'
import { getUserFacingErrorMessage, getUserFacingStatusMessage } from '../lib/userFacingErrors'
import {
  AUREON_MODEL_OPTIONS,
  AUREON_NAME,
  AUREON_VERSION_LABEL,
} from '../lib/modelConfig'
import {
  createTechChatMemoryState,
  getTechChatPersona,
  serializeTechChatMemoryState,
} from '../lib/techChatConfig'
import {
  AUREON_VOICE_OPTIONS,
  DEFAULT_AUREON_VOICE_ID,
  getAureonVoicePersona,
} from '../lib/voicePersonasConfig'

type SettingsTab = 'account' | 'personalization' | 'appearance' | 'notifications'
type ThemePreference = 'system' | 'light' | 'dark'
type SidebarPreference = 'standard' | 'compact'
type ProfileToastType = 'success' | 'error'
type WorkspaceLandingView = 'home' | 'communication' | 'behavioral' | 'tech-chat' | 'notes'

const SETTINGS_STORAGE_KEY = 'knappi.settings.preferences.v1'
const WORKSPACE_TUTORIAL_STORAGE_KEY = 'knappi.interview.workspace.tutorial.v2'
const WORKSPACE_EXAMPLE_TYPING_STEP_MS = 26
const WORKSPACE_EXAMPLE_DELETING_STEP_MS = 18
const WORKSPACE_EXAMPLE_PAUSE_MS = 1800
const WORKSPACE_EXAMPLE_RESET_PAUSE_MS = 280
const WORKSPACE_SESSION_EXAMPLE_PREFIX = 'I want to '
const WORKSPACE_SESSION_EXAMPLE_SUFFIXES = [
  'simulate a Backend Engineer interview on Spring Boot.',
  'clearly communicate AI Engineer principles to a non-technical stakeholder.',
  'practice distributed systems tradeoffs for a senior backend role.',
  'rehearse behavioral stories for a software engineering interview.',
] as const
const LONGEST_WORKSPACE_SESSION_EXAMPLE_SUFFIX = WORKSPACE_SESSION_EXAMPLE_SUFFIXES.reduce<string>(
  (longest, example) => (example.length > longest.length ? example : longest),
  WORKSPACE_SESSION_EXAMPLE_SUFFIXES[0]
)
const WORKSPACE_HOME_HERO_BACKGROUND_STYLES: Record<
  Exclude<ThemePreference, 'system'>,
  React.CSSProperties
> = {
  light: {
    backgroundImage: [
      'radial-gradient(48% 60% at 50% 45%, rgba(255,255,255,0.995) 0%, rgba(252,254,253,0.985) 24%, rgba(247,253,249,0.92) 42%, rgba(234,249,239,0.14) 58%, rgba(234,249,239,0) 72%)',
      'radial-gradient(26% 34% at 14% 16%, rgba(134,239,172,0.1) 0%, rgba(134,239,172,0.07) 34%, rgba(134,239,172,0.02) 54%, transparent 76%)',
      'radial-gradient(24% 30% at 86% 14%, rgba(153,246,228,0.09) 0%, rgba(153,246,228,0.06) 34%, rgba(153,246,228,0.02) 54%, transparent 76%)',
      'radial-gradient(28% 38% at 9% 80%, rgba(74,222,128,0.09) 0%, rgba(74,222,128,0.06) 38%, rgba(74,222,128,0.02) 58%, transparent 80%)',
      'radial-gradient(30% 38% at 92% 78%, rgba(110,231,183,0.09) 0%, rgba(110,231,183,0.06) 36%, rgba(110,231,183,0.02) 56%, transparent 78%)',
      'radial-gradient(18% 22% at 31% 68%, rgba(187,247,208,0.07) 0%, rgba(187,247,208,0.04) 36%, transparent 74%)',
      'radial-gradient(16% 20% at 72% 66%, rgba(204,251,241,0.06) 0%, rgba(204,251,241,0.035) 34%, transparent 70%)',
      'linear-gradient(135deg, #fbfefd 0%, #f7fcf8 18%, #f4fbf6 35%, #f9fdfb 52%, #f3faf5 72%, #fcfefd 100%)',
    ].join(', '),
  },
  dark: {
    backgroundImage: [
      'radial-gradient(48% 60% at 50% 45%, rgba(22,101,52,0.28) 0%, rgba(21,128,61,0.2) 26%, rgba(7,21,16,0.08) 48%, rgba(7,21,16,0) 72%)',
      'radial-gradient(28% 36% at 14% 16%, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.14) 34%, rgba(16,185,129,0.04) 56%, transparent 78%)',
      'radial-gradient(24% 30% at 86% 14%, rgba(45,212,191,0.18) 0%, rgba(45,212,191,0.12) 34%, rgba(45,212,191,0.035) 54%, transparent 76%)',
      'radial-gradient(30% 40% at 10% 82%, rgba(34,197,94,0.16) 0%, rgba(34,197,94,0.1) 38%, rgba(34,197,94,0.03) 58%, transparent 80%)',
      'radial-gradient(32% 38% at 92% 80%, rgba(52,211,153,0.15) 0%, rgba(52,211,153,0.1) 36%, rgba(52,211,153,0.03) 56%, transparent 78%)',
      'radial-gradient(18% 22% at 32% 66%, rgba(134,239,172,0.08) 0%, rgba(134,239,172,0.045) 36%, transparent 72%)',
      'radial-gradient(16% 20% at 72% 64%, rgba(153,246,228,0.07) 0%, rgba(153,246,228,0.04) 34%, transparent 70%)',
      'linear-gradient(135deg, #06110d 0%, #081712 18%, #0a1e17 36%, #081611 56%, #07130f 76%, #05100d 100%)',
    ].join(', '),
  },
}
const WORKSPACE_HOME_HERO_OVERLAY_STYLES: Record<
  Exclude<ThemePreference, 'system'>,
  React.CSSProperties
> = {
  light: {
    backgroundImage: [
      'radial-gradient(circle at 24% 48%, rgba(255,255,255,0.14) 0%, transparent 32%)',
      'radial-gradient(circle at 76% 32%, rgba(255,255,255,0.12) 0%, transparent 28%)',
      'radial-gradient(circle at 58% 84%, rgba(255,255,255,0.1) 0%, transparent 34%)',
    ].join(', '),
  },
  dark: {
    backgroundImage: [
      'radial-gradient(circle at 24% 48%, rgba(167,243,208,0.06) 0%, transparent 30%)',
      'radial-gradient(circle at 76% 32%, rgba(209,250,229,0.05) 0%, transparent 28%)',
      'radial-gradient(circle at 58% 84%, rgba(110,231,183,0.04) 0%, transparent 34%)',
    ].join(', '),
  },
}
const WORKSPACE_TUTORIAL_STEPS: WorkspaceTutorialStep[] = [
  {
    id: 'intro',
    title: 'Welcome to your interview workspace',
    description:
      'This short tour will walk you through the main controls before you start practicing. Click Next and I will point out the most important parts one by one.',
  },
  {
    id: 'sidebar',
    target: '[data-workspace-tour="sidebar"]',
    title: 'This sidebar is your workspace rail',
    description:
      'Use it to jump home, search older sessions, open metrics, and browse the library. Once you finish sessions, they will also show up here for quick review.',
    placement: 'right',
  },
  {
    id: 'create-session',
    target: '[data-workspace-tour="create-session"]',
    title: 'Start new practice rounds from here',
    description:
      'This button launches a fresh session whenever you want to practice. It is the fastest way to begin a new interview or speaking drill.',
    placement: 'bottom',
  },
  {
    id: 'session-type-modal',
    target: '[data-workspace-tour="session-type-modal"]',
    title: 'Pick the kind of session you want',
    description:
      'Role-specific speaking drills sharpen how you explain technical ideas. Behavioral interviews simulate classic story-based interview questions.',
    placement: 'bottom',
  },
  {
    id: 'library',
    target: '[data-workspace-tour="library"]',
    title: 'Open the library when you need a refresher',
    description:
      'The library gives you study guides, communication playbooks, and reference material before or between practice sessions.',
    placement: 'right',
  },
  {
    id: 'account',
    target: '[data-workspace-tour="account"]',
    title: 'Settings and help live here',
    description:
      'Open your account menu for settings, logout, and Help. You can replay this walkthrough from Help any time you want another pass.',
    placement: 'right',
  },
  {
    id: 'conclusion',
    title: 'You are ready to start',
    description:
      'That is the full workspace. Start a session whenever you are ready, and reopen this walkthrough from Help if you want a quick refresher later.',
  },
]

const getWorkspaceTutorialStorageKey = (email: string) =>
  `${WORKSPACE_TUTORIAL_STORAGE_KEY}:${email.trim().toLowerCase()}`

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
  const [selectedLibrarySectionId, setSelectedLibrarySectionId] = useState<LibrarySectionId>(
    LIBRARY_SECTIONS[0].id
  )
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, loading, setUser } = useAuth()
  const router = useRouter()
  const [loadingInterviews, setLoadingInterviews] = useState(true)
  const [activeModal, setActiveModal] = useState<'settings' | null>(null)
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('account')
  const [themePreference, setThemePreference] = useState<ThemePreference>('system')
  const [resolvedTheme, setResolvedTheme] = useState<Exclude<ThemePreference, 'system'>>('light')
  const [sidebarPreference, setSidebarPreference] = useState<SidebarPreference>('standard')
  const [interviewReminderNotifications, setInterviewReminderNotifications] = useState(true)
  const [emailSummaryNotifications, setEmailSummaryNotifications] = useState(true)
  const [productUpdatesNotifications, setProductUpdatesNotifications] = useState(false)
  const [hasLoadedInterviewHistory, setHasLoadedInterviewHistory] = useState(false)
  const [typedWorkspaceExample, setTypedWorkspaceExample] = useState('')
  const [activeWorkspaceExampleIndex, setActiveWorkspaceExampleIndex] = useState(0)
  const [isDeletingWorkspaceExample, setIsDeletingWorkspaceExample] = useState(false)
  const [createSessionModalOpen, setCreateSessionModalOpen] = useState(false)
  const [profileFormData, setProfileFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    currentpassword: '',
    aureonVoiceId: DEFAULT_AUREON_VOICE_ID,
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileUpdateToast, setProfileUpdateToast] = useState<{
    type: ProfileToastType
    message: string
  } | null>(null)
  const [workspaceToast, setWorkspaceToast] = useState<{
    type: ProfileToastType
    message: string
  } | null>(null)
  const [showAccountEditor, setShowAccountEditor] = useState(false)
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [workspaceTutorialOpen, setWorkspaceTutorialOpen] = useState(false)
  const [workspaceTutorialStepIndex, setWorkspaceTutorialStepIndex] = useState(0)
  const messagePersistQueueRef = useRef<Map<string, Promise<void>>>(new Map())
  const modelMenuRef = useRef<HTMLDivElement | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const workspaceTutorialStorageKey = user?.email
    ? getWorkspaceTutorialStorageKey(user.email)
    : null

  // Handle authentication redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    setProfileFormData((prev) => ({
      ...prev,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      password: '',
      currentpassword: '',
      aureonVoiceId: getAureonVoicePersona(user.aureonVoiceId).id,
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

  useEffect(() => {
    if (!workspaceToast) return
    const timeoutId = window.setTimeout(() => {
      setWorkspaceToast(null)
    }, 4000)

    return () => window.clearTimeout(timeoutId)
  }, [workspaceToast])

  const showWorkspaceToast = useCallback((type: ProfileToastType, message: string) => {
    setWorkspaceToast({ type, message })
  }, [])

  const startWorkspaceTutorial = useCallback(() => {
    setActiveModal(null)
    setShowAccountEditor(false)
    setShowDeleteAccountConfirm(false)
    setProfileUpdateToast(null)
    setWorkspaceToast(null)
    setCurrentInterview(null)
    setActiveLandingView('home')
    setCreateSessionModalOpen(false)
    setModelMenuOpen(false)
    setWorkspaceTutorialStepIndex(0)
    setWorkspaceTutorialOpen(true)
  }, [])

  const closeWorkspaceTutorial = useCallback(() => {
    if (typeof window !== 'undefined' && workspaceTutorialStorageKey) {
      window.localStorage.setItem(workspaceTutorialStorageKey, 'seen')
    }
    setWorkspaceTutorialOpen(false)
    setWorkspaceTutorialStepIndex(0)
    setCreateSessionModalOpen(false)
  }, [workspaceTutorialStorageKey])

  const goToPreviousWorkspaceTutorialStep = useCallback(() => {
    setWorkspaceTutorialStepIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const goToNextWorkspaceTutorialStep = useCallback(() => {
    if (workspaceTutorialStepIndex >= WORKSPACE_TUTORIAL_STEPS.length - 1) {
      closeWorkspaceTutorial()
      return
    }

    setWorkspaceTutorialStepIndex((prev) => prev + 1)
  }, [closeWorkspaceTutorial, workspaceTutorialStepIndex])

  const loadSavedInterviews = useCallback(async () => {
    try {
      setLoadingInterviews(true);
      setHasLoadedInterviewHistory(false);
      setWorkspaceToast(null)
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
      showWorkspaceToast('error', 'Unable to load saved sessions right now.')
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
      setHasLoadedInterviewHistory(true);
    }
  }, [showWorkspaceToast])

  // Load saved interviews when user is authenticated
  useEffect(() => {
    if (user && !loading) {
      const oauthTarget = consumeOAuthHandoffRedirect()
      if (oauthTarget && oauthTarget !== '/interview') {
        router.replace(oauthTarget)
        return
      }

      loadSavedInterviews()
    }
  }, [loadSavedInterviews, loading, router, user])

  const greetingName = user?.firstname || 'there'
  const hasSavedSessions = interviews.length > 0
  const hasResolvedWorkspaceGreeting = hasLoadedInterviewHistory || hasSavedSessions
  const workspaceHeadline =
    !hasResolvedWorkspaceGreeting
      ? `Welcome, ${greetingName}`
      : hasLoadedInterviewHistory && !hasSavedSessions
        ? `Welcome to Knappi, ${greetingName}`
        : `Welcome back, ${greetingName}`

  useEffect(() => {
    if (!createSessionModalOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCreateSessionModalOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [createSessionModalOpen])

  useEffect(() => {
    if (activeLandingView !== 'home' && createSessionModalOpen) {
      setCreateSessionModalOpen(false)
    }
  }, [activeLandingView, createSessionModalOpen])

  useEffect(() => {
    if (typeof window === 'undefined' || loading || !user) return
    if (workspaceTutorialStorageKey && window.localStorage.getItem(workspaceTutorialStorageKey)) {
      return
    }

    startWorkspaceTutorial()
  }, [loading, startWorkspaceTutorial, user, workspaceTutorialStorageKey])

  useEffect(() => {
    if (!workspaceTutorialOpen) return

    setCurrentInterview(null)
    setActiveLandingView('home')
    setActiveModal(null)
    setModelMenuOpen(false)

    const activeTutorialStep = WORKSPACE_TUTORIAL_STEPS[workspaceTutorialStepIndex]
    const shouldOpenCreateSessionModal = activeTutorialStep?.id === 'session-type-modal'
    setCreateSessionModalOpen(shouldOpenCreateSessionModal)
  }, [workspaceTutorialOpen, workspaceTutorialStepIndex])

  useEffect(() => {
    if (!modelMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (!modelMenuRef.current?.contains(event.target as Node)) {
        setModelMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setModelMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [modelMenuOpen])

  useEffect(() => {
    if (activeLandingView !== 'home' || createSessionModalOpen || currentInterview) {
      setModelMenuOpen(false)
    }
  }, [activeLandingView, createSessionModalOpen, currentInterview])

  useEffect(() => {
    if (activeLandingView !== 'home') return

    const currentExample = WORKSPACE_SESSION_EXAMPLE_SUFFIXES[activeWorkspaceExampleIndex]

    if (prefersReducedMotion) {
      setTypedWorkspaceExample(currentExample)
      return
    }

    const hasTypedFullExample = typedWorkspaceExample === currentExample
    const hasDeletedExample = typedWorkspaceExample.length === 0
    const nextDelay = !isDeletingWorkspaceExample
      ? hasTypedFullExample
        ? WORKSPACE_EXAMPLE_PAUSE_MS
        : WORKSPACE_EXAMPLE_TYPING_STEP_MS
      : hasDeletedExample
        ? WORKSPACE_EXAMPLE_RESET_PAUSE_MS
        : WORKSPACE_EXAMPLE_DELETING_STEP_MS

    const timeoutId = window.setTimeout(() => {
      if (!isDeletingWorkspaceExample && hasTypedFullExample) {
        setIsDeletingWorkspaceExample(true)
        return
      }

      if (isDeletingWorkspaceExample && hasDeletedExample) {
        setIsDeletingWorkspaceExample(false)
        setActiveWorkspaceExampleIndex((currentIndex) =>
          (currentIndex + 1) % WORKSPACE_SESSION_EXAMPLE_SUFFIXES.length
        )
        return
      }

      const nextLength = typedWorkspaceExample.length + (isDeletingWorkspaceExample ? -1 : 1)
      setTypedWorkspaceExample(currentExample.slice(0, nextLength))
    }, nextDelay)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    activeLandingView,
    activeWorkspaceExampleIndex,
    isDeletingWorkspaceExample,
    prefersReducedMotion,
    typedWorkspaceExample,
  ])

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

  const openCreateSessionChooser = () => {
    setActiveLandingView('home')
    setCurrentInterview(null)
    setCreateSessionModalOpen(true)
  }

  const openBehavioralSetup = () => {
    setCreateSessionModalOpen(false)
    setActiveLandingView('behavioral')
    setCurrentInterview(null)
  }

  const openCommunicationSetup = () => {
    setCreateSessionModalOpen(false)
    setActiveLandingView('communication')
    setCurrentInterview(null)
  }

  const openTechChatSetup = () => {
    setCreateSessionModalOpen(false)
    setActiveLandingView('tech-chat')
    setCurrentInterview(null)
  }

  const handleSelectLibrarySection = (sectionId: LibrarySectionId) => {
    setSelectedLibrarySectionId(sectionId)
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
    const res = await fetch(`${AI_BASE}/generate_drill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
      throw new Error(`Failed to generate drill (${res.status})`)
    }

    const data = await res.json()
    const rawPrompt =
      data?.prompt && typeof data.prompt === 'object'
        ? (data.prompt as Partial<GeneratedPrompt>)
        : (data as Partial<GeneratedPrompt>)

    const generatedPrompt = normalizeGeneratedPrompt(rawPrompt, fallbackPrompt)

    const coachIntro = buildTechnicalCoachIntro(config, generatedPrompt)
    const now = new Date()
    const introMessage = {
      id: `${Date.now()}-intro`,
      role: 'interviewer' as const,
      content: coachIntro,
      timestamp: now,
      transcription: `[${AUREON_NAME}]: ${coachIntro}`,
      isThinking: false,
    }
    const promptMessage = {
      id: `${Date.now()}-prompt`,
      role: 'interviewer' as const,
      content: `Prompt: ${generatedPrompt.prompt}`,
      timestamp: now,
      transcription: `[${AUREON_NAME}]: Prompt: ${generatedPrompt.prompt}`,
      isThinking: false,
    }
    const messages = [introMessage, promptMessage]

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

    try {
      await interviewService.updateInterviewMessages(Number(newInterview.id), {
        messages: newInterview.messages,
      })
    } catch (error) {
      if (!Number.isNaN(Number(newInterview.id))) {
        await interviewService.deleteInterview(Number(newInterview.id)).catch(() => undefined)
      }
      throw error
    }

    setInterviews((prev) => [newInterview, ...prev])
    setCurrentInterview(newInterview)
    setActiveLandingView('home')
  }

  const handleCreateTechChatSession = async (config: TechChatSessionConfig) => {
    const persona = getTechChatPersona(config.personaId)
    const response = await fetch(`${AI_BASE}/tech_chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify({
        persona_id: config.personaId,
        topic_seed: config.topicSeed,
        surprise_me: config.surpriseMe,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to start Tech Chat (${response.status})`)
    }

    const data = await response.json()
    const opener =
      typeof data?.opener === 'string' && data.opener.trim()
        ? data.opener.trim()
        : `${persona.sampleLine}`
    const topic =
      typeof data?.topic_seed === 'string' && data.topic_seed.trim()
        ? data.topic_seed.trim()
        : config.topicSeed || persona.topicAffinity[0]

    const now = new Date()
    const messages = [
      {
        id: `${Date.now()}-opener`,
        role: 'interviewer' as const,
        content: opener,
        timestamp: now,
        transcription: `[${persona.name}]: ${opener}`,
        isThinking: false,
      },
    ]

    const createRequest = {
      title: `Tech Chat with ${persona.name}`,
      role: 'Tech Chat',
      languages: persona.topicAffinity,
      difficulty: 'mid',
      questions: [],
      sessionType: 'tech-chat' as const,
      practiceMode: null,
      audience: persona.id,
      topic,
      promptContext: serializeTechChatMemoryState(createTechChatMemoryState(persona.archetype)),
      generatedPrompt: null,
    }

    const savedInterview = await interviewService.createInterview(createRequest)
    const newInterview = interviewService.convertToInterview(savedInterview)
    newInterview.messages = messages
    newInterview.currentQuestionIndex = 0
    newInterview.audience = persona.id
    newInterview.topic = topic

    try {
      await interviewService.updateInterviewMessages(Number(newInterview.id), {
        messages: newInterview.messages,
      })
    } catch (error) {
      if (!Number.isNaN(Number(newInterview.id))) {
        await interviewService.deleteInterview(Number(newInterview.id)).catch(() => undefined)
      }
      throw error
    }

    setInterviews((prev) => [newInterview, ...prev])
    setCurrentInterview(newInterview)
    setActiveLandingView('home')
  }

  const handleCreateBehavioralInterview = async (config: InterviewConfig) => {
    const res = await fetch(`${AI_BASE}/generate_questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify({
        role: config.role,
        languages: config.languages,
        difficulty: config.difficulty,
        topic: config.topic,
        additional_context: config.promptContext,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to generate interview questions (${res.status})`)
    }

    const data = await res.json();
    const rawQuestions: string[] = Array.isArray(data?.questions)
      ? data.questions
      : typeof data?.questions === 'string'
        ? data.questions
            .split(/\n|\r/)
            .map((question: string) => question.replace(/^\d+\.|^\d+\)/, '').trim())
            .filter((question: string) => question.length > 0)
        : []

    const aiQuestions = rawQuestions.filter(
      (question): question is string => typeof question === 'string' && question.trim().length > 0
    )

    if (aiQuestions.length === 0) {
      throw new Error('The AI service did not return any interview questions.')
    }

    const focusAreaSummary = config.languages.join(', ')
    const questionCount = aiQuestions.length
    const introCopy = `Welcome to your ${config.role} behavioral interview! I'll be asking you ${questionCount} questions focused on ${focusAreaSummary}. Let's get started!`
    const now = new Date();
    // Add introduction and first question
    const introMessage = {
      id: `${Date.now()}-intro`,
      role: 'interviewer' as const,
      content: introCopy,
      timestamp: now,
      transcription: `[${AUREON_NAME}]: ${introCopy}`,
      isThinking: false,
    };
    const firstQuestionMessage = {
      id: `${Date.now()}-q0`,
      role: 'interviewer' as const,
      content: aiQuestions[0],
      timestamp: now,
      transcription: `[${AUREON_NAME}]: ${aiQuestions[0]}`,
      isThinking: false,
    };
    const messages = [introMessage, firstQuestionMessage];
    
    // Create interview in database
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

    try {
      await interviewService.updateInterviewMessages(Number(newInterview.id), { messages: newInterview.messages });
    } catch (error) {
      if (!Number.isNaN(Number(newInterview.id))) {
        await interviewService.deleteInterview(Number(newInterview.id)).catch(() => undefined)
      }
      throw error
    }

    setInterviews((prev) => [newInterview, ...prev]);
    setCurrentInterview(newInterview);
    setActiveLandingView('home');
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
        showWorkspaceToast('error', 'Session changes could not be saved.')
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
      setInterviews((prev) => prev.filter((i) => i.id !== interviewId));
      if (currentInterview?.id === interviewId) {
        setCurrentInterview(null);
        setActiveLandingView('home')
      }
    } catch (error) {
      console.error('Failed to delete interview from backend:', error);
      showWorkspaceToast('error', 'Unable to delete this session right now.')
      throw error
    }
  }

  const handleRenameInterview = async (interviewId: string, title: string) => {
    const normalizedTitle = title.trim()
    if (!normalizedTitle) return

    if (isNaN(Number(interviewId))) return

    try {
      await interviewService.updateInterviewTitle(Number(interviewId), {
        title: normalizedTitle,
      })
      setInterviews((prev) =>
        prev.map((interview) =>
          interview.id === interviewId ? { ...interview, title: normalizedTitle } : interview
        )
      )

      setCurrentInterview((prev) =>
        prev?.id === interviewId ? { ...prev, title: normalizedTitle } : prev
      )
    } catch (error) {
      console.error('Failed to rename interview:', error)
      showWorkspaceToast('error', 'Unable to rename this session right now.')
      throw error
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

  const handleAureonVoiceSelect = (voiceId: string) => {
    setProfileFormData((prev) => ({ ...prev, aureonVoiceId: getAureonVoicePersona(voiceId).id }))
    setProfileUpdateToast(null)
  }

  const handlePersonalizationSubmit = async () => {
    setProfileUpdateToast(null)
    setProfileLoading(true)

    try {
      const selectedVoice = getAureonVoicePersona(profileFormData.aureonVoiceId)
      const response = await fetch(`${API_BASE}/user/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ aureonVoiceId: selectedVoice.id }),
      })

      if (response.ok) {
        setUser({
          ...user,
          aureonVoiceId: selectedVoice.id,
        })
        showProfileUpdateToast('success', 'Personalization updated successfully.')
      } else {
        showProfileUpdateToast('error', getUserFacingStatusMessage('profileUpdate', response.status))
      }
    } catch (error) {
      showProfileUpdateToast('error', getUserFacingErrorMessage('profileUpdate', error))
    } finally {
      setProfileLoading(false)
    }
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

      const response = await fetch(`${API_BASE}/user/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

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
        showProfileUpdateToast('error', getUserFacingStatusMessage('profileUpdate', response.status))
      }
    } catch (error) {
      showProfileUpdateToast('error', getUserFacingErrorMessage('profileUpdate', error))
    } finally {
      setProfileLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setProfileLoading(true)
    try {
      const response = await fetch(`${API_BASE}/user/delete`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        window.location.href = '/'
      } else {
        showProfileUpdateToast('error', getUserFacingStatusMessage('accountDelete', response.status))
      }
    } catch (error) {
      showProfileUpdateToast('error', getUserFacingErrorMessage('accountDelete', error))
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
      id: 'personalization' as const,
      label: 'Personalization',
      description: 'Choose how Aureon sounds during practice sessions.',
      icon: Volume2,
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
            <InterviewSetup
              onCreateInterview={handleCreateBehavioralInterview}
              resolvedTheme={resolvedTheme}
            />
          ) : activeLandingView === 'tech-chat' ? (
            <TechChatSetup
              onCreateSession={handleCreateTechChatSession}
              resolvedTheme={resolvedTheme}
            />
          ) : (
            <CommunicationSetup
              onCreateSession={handleCreateTechnicalSession}
              resolvedTheme={resolvedTheme}
            />
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
        <section className="relative flex h-1/2 items-center overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={WORKSPACE_HOME_HERO_BACKGROUND_STYLES[resolvedTheme]}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={WORKSPACE_HOME_HERO_OVERLAY_STYLES[resolvedTheme]}
          />
          <div
            className="absolute left-6 top-3 z-10 lg:left-10 lg:top-4"
            ref={modelMenuRef}
          >
            <div className="relative flex justify-start">
              <button
                type="button"
                onClick={() => setModelMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 text-base font-medium text-gray-500 transition-colors hover:text-gray-900"
                aria-haspopup="menu"
                aria-expanded={modelMenuOpen}
              >
                <span>{AUREON_VERSION_LABEL}</span>
                <ChevronDown
                  size={17}
                  className={`transition-transform ${modelMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {modelMenuOpen ? (
                <div className="absolute left-0 top-full z-20 mt-3 w-72 overflow-hidden rounded-[24px] border border-gray-200 bg-white p-2 text-left shadow-[0_24px_70px_-28px_rgba(15,23,42,0.28)]">
                  <div className="px-3 pb-2 pt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500">
                    Model lineup
                  </div>

                  <div className="space-y-1">
                    {AUREON_MODEL_OPTIONS.map((option) => {
                      const isCurrent = option.id === AUREON_MODEL_OPTIONS[0].id

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setModelMenuOpen(false)}
                          disabled={!option.available}
                          className={`flex w-full items-start justify-between gap-3 rounded-[18px] px-3 py-3 text-left transition-colors ${
                            isCurrent
                              ? 'bg-emerald-50 text-emerald-950'
                              : 'text-gray-600'
                          } ${
                            option.available ? 'hover:bg-gray-50' : 'cursor-not-allowed opacity-70'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-semibold">{option.label}</div>
                            <div className="mt-1 text-xs leading-5 text-gray-500">
                              {option.description}
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
                              isCurrent
                                ? 'bg-white text-emerald-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {isCurrent ? 'Current' : 'Soon'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative z-[1] mx-auto flex h-full w-full max-w-5xl flex-col justify-center gap-6 px-6 py-8 lg:-translate-x-12 lg:-translate-y-8 lg:px-10">
            <section className="w-full px-4 pt-8 pb-2 sm:pt-12">
              <div className="mt-6 flex flex-col items-center justify-center text-center">
                <div className="flex h-24 w-24 items-center justify-center">
                  <Image
                    src="/knappi_logo.png"
                    alt="Knappi Logo"
                    width={80}
                    height={80}
                    className="h-20 w-20 object-contain"
                    priority
                  />
                </div>
                <h1
                  aria-label={workspaceHeadline}
                  className="mt-4 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl"
                >
                  {workspaceHeadline}
                </h1>
                <div className="mt-4 max-w-2xl text-center">
                  <p
                    aria-label={`${WORKSPACE_SESSION_EXAMPLE_PREFIX}${WORKSPACE_SESSION_EXAMPLE_SUFFIXES[activeWorkspaceExampleIndex]}`}
                    className="relative text-base leading-7 text-gray-600 sm:text-lg"
                  >
                    <span aria-hidden="true" className="invisible">
                      {`${WORKSPACE_SESSION_EXAMPLE_PREFIX}${LONGEST_WORKSPACE_SESSION_EXAMPLE_SUFFIX}`}
                    </span>
                    <span aria-hidden="true" className="absolute inset-0">
                      <span>{WORKSPACE_SESSION_EXAMPLE_PREFIX}</span>
                      <span>{typedWorkspaceExample}</span>
                      {!prefersReducedMotion ? (
                        <span className="ml-1 inline-block h-[0.9em] w-[2px] translate-y-1 animate-pulse bg-current align-middle" />
                      ) : null}
                    </span>
                  </p>
                </div>
              </div>
            </section>

            <div className="-mt-3 flex justify-center">
              <button
                type="button"
                onClick={openCreateSessionChooser}
                data-workspace-tour="create-session"
                className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-6 py-3 text-sm font-medium text-emerald-950 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-100"
                aria-haspopup="dialog"
                aria-expanded={createSessionModalOpen}
              >
                Create new session
              </button>
            </div>
          </div>
        </section>

        <section className="practice-preview-shell relative flex h-1/2 items-center justify-center overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={WORKSPACE_HOME_HERO_BACKGROUND_STYLES[resolvedTheme]}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={WORKSPACE_HOME_HERO_OVERLAY_STYLES[resolvedTheme]}
          />
          <div className="relative z-[1] flex h-full w-full items-center justify-center">
            {renderPromptPanel()}
          </div>
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
        onStartNew={openCreateSessionChooser}
        onSelectInterview={handleSelectInterview}
        onDeleteInterview={handleDeleteInterview}
        onRenameInterview={handleRenameInterview}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleSidebarToggle}
        userInitial={user.firstname?.charAt(0).toUpperCase() || 'U'}
        userCreatedAt={user.createdAt}
        userName={`${user.firstname} ${user.lastname}`.trim() || user.email}
        userEmail={user.email}
        onOpenSettings={openModal}
        onOpenHelp={startWorkspaceTutorial}
        onSelectLibrarySection={handleSelectLibrarySection}
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
            currentInterview.sessionType === 'tech-chat' ? (
              <TechChatSession
                interview={currentInterview}
                onUpdateInterview={handleUpdate}
                onStartAnother={openTechChatSetup}
                resolvedTheme={resolvedTheme}
              />
            ) : (
              <InterviewChat
                interview={currentInterview}
                onUpdateInterview={handleUpdate}
                resolvedTheme={resolvedTheme}
              />
            )
          ) : activeLandingView === 'notes' ? (
            <Library
              selectedSectionId={selectedLibrarySectionId}
              onSelectSection={setSelectedLibrarySectionId}
            />
          ) : (
            renderPracticeFlow()
          )}
        </div>
      </main>

      <AnimatePresence>
        {createSessionModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] flex items-center justify-center bg-black/10 p-4"
            onClick={() => setCreateSessionModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              data-workspace-tour="session-type-modal"
              className="w-full max-w-md rounded-[28px] border border-emerald-100 bg-white p-6 shadow-[0_28px_80px_-28px_rgba(15,23,42,0.45)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-session-dialog-title"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-700">
                    New session
                  </p>
                  <h2
                    id="create-session-dialog-title"
                    className="mt-3 text-2xl font-semibold text-gray-900"
                  >
                    What do you want to create?
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateSessionModalOpen(false)}
                  className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close create session dialog"
                >
                  <span className="text-sm">✕</span>
                </button>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={openCommunicationSetup}
                  className="flex w-full flex-col rounded-3xl border border-emerald-200 bg-emerald-50/70 px-5 py-4 text-left transition-colors hover:bg-emerald-50"
                >
                  <span className="text-sm font-semibold text-gray-900">
                    Role-specific speaking drill
                  </span>
                  <span className="mt-1 text-sm leading-5 text-gray-600">
                    Practice a technical explanation for a specific role, audience, and topic.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openBehavioralSetup}
                  className="flex w-full flex-col rounded-3xl border border-gray-200 bg-white px-5 py-4 text-left transition-colors hover:bg-gray-50"
                >
                  <span className="text-sm font-semibold text-gray-900">
                    Behavioral interview
                  </span>
                  <span className="mt-1 text-sm leading-5 text-gray-600">
                    Run a story-based interview round with classic behavioral prompts.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openTechChatSetup}
                  className="flex w-full flex-col rounded-3xl border border-gray-200 bg-white px-5 py-4 text-left transition-colors hover:bg-gray-50"
                >
                  <span className="text-sm font-semibold text-gray-900">
                    Tech Chat
                  </span>
                  <span className="mt-1 text-sm leading-5 text-gray-600">
                    Have a casual technical conversation with a colleague-style persona.
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

                    {activeSettingsTab === 'personalization' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">Personalization</h3>
                          <p className="mt-1 text-sm text-gray-600">
                            Set the voice Aureon uses for mock interviews and speaking drills.
                          </p>
                        </div>

                        <div className="grid gap-3">
                          {AUREON_VOICE_OPTIONS.map((voice) => {
                            const selected = getAureonVoicePersona(profileFormData.aureonVoiceId).id === voice.id

                            return (
                              <button
                                key={voice.id}
                                type="button"
                                onClick={() => handleAureonVoiceSelect(voice.id)}
                                className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                                  selected
                                    ? 'border-emerald-300 bg-emerald-50 text-gray-950'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <span
                                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-2 ${voice.avatarClassName}`}
                                >
                                  {voice.initials}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-semibold">{voice.label}</span>
                                  <span className="mt-1 block text-sm text-gray-600">{voice.description}</span>
                                </span>
                                <span
                                  className={`h-3 w-3 rounded-full border ${
                                    selected ? 'border-emerald-600 bg-emerald-500' : 'border-gray-300 bg-white'
                                  }`}
                                />
                              </button>
                            )
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => void handlePersonalizationSubmit()}
                          disabled={profileLoading}
                          className={`rounded-md border border-[#26922c] bg-[#cbf5cd] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#bfeec2] ${
                            profileLoading ? 'cursor-not-allowed opacity-75' : ''
                          }`}
                        >
                          {profileLoading ? 'Saving...' : 'Save Personalization'}
                        </button>
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
        {workspaceToast && (
          <motion.div
            key={workspaceToast.message}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-24 right-4 z-[120] w-[calc(100vw-2rem)] max-w-sm rounded-lg border px-4 py-3 shadow-lg ${
              workspaceToast.type === 'success'
                ? 'border-teal-200 bg-teal-50 text-teal-900'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            <p className="text-sm font-medium">
              {workspaceToast.type === 'success' ? 'Workspace Updated' : 'Workspace Error'}
            </p>
            <p className="mt-1 text-sm">{workspaceToast.message}</p>
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

      <WorkspaceTutorial
        open={workspaceTutorialOpen}
        steps={WORKSPACE_TUTORIAL_STEPS}
        currentStepIndex={workspaceTutorialStepIndex}
        onNext={goToNextWorkspaceTutorialStep}
        onPrevious={goToPreviousWorkspaceTutorialStep}
        onClose={closeWorkspaceTutorial}
        resolvedTheme={resolvedTheme}
      />
    </div>
  )
}
