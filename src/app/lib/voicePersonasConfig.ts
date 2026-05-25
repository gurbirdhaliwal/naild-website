import { AUREON_NAME } from './modelConfig'
import type { TechChatPersonaId } from './techChatConfig'

export type AISessionState = 'idle' | 'listening' | 'thinking' | 'speaking'

export type VoicePersonaId =
  | 'aureon-calm'
  | 'aureon-bright'
  | 'aureon-deep'
  | 'maya-curious'
  | 'dev-skeptical'
  | 'leah-product'
  | 'ravi-systems'

export interface VoicePersona {
  id: VoicePersonaId
  name: string
  label: string
  description: string
  initials: string
  avatarClassName: string
  browserVoiceHints: string[]
  rate: number
  pitch: number
  volume: number
}

export const DEFAULT_AUREON_VOICE_ID: VoicePersonaId = 'aureon-calm'

export const AUREON_VOICE_OPTIONS: VoicePersona[] = [
  {
    id: 'aureon-calm',
    name: AUREON_NAME,
    label: 'Calm Coach',
    description: 'Measured, steady, and easy to follow.',
    initials: 'A',
    avatarClassName: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    browserVoiceHints: ['Samantha', 'Google US English', 'Microsoft Aria', 'Daniel', 'Alex'],
    rate: 0.95,
    pitch: 0.98,
    volume: 1,
  },
  {
    id: 'aureon-bright',
    name: AUREON_NAME,
    label: 'Bright Coach',
    description: 'Clearer and a little more energetic.',
    initials: 'A',
    avatarClassName: 'bg-teal-100 text-teal-800 ring-teal-200',
    browserVoiceHints: ['Google UK English Female', 'Microsoft Jenny', 'Samantha', 'Karen'],
    rate: 1.02,
    pitch: 1.08,
    volume: 1,
  },
  {
    id: 'aureon-deep',
    name: AUREON_NAME,
    label: 'Grounded Coach',
    description: 'Lower, slower, and more deliberate.',
    initials: 'A',
    avatarClassName: 'bg-slate-100 text-slate-800 ring-slate-200',
    browserVoiceHints: ['Google UK English Male', 'Microsoft Guy', 'Daniel', 'Alex'],
    rate: 0.9,
    pitch: 0.88,
    volume: 1,
  },
]

export const TECH_CHAT_VOICE_PERSONAS: Record<TechChatPersonaId, VoicePersona> = {
  'curious-generalist': {
    id: 'maya-curious',
    name: 'Maya',
    label: 'Curious Generalist',
    description: 'Warm, curious, and conversational.',
    initials: 'M',
    avatarClassName: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    browserVoiceHints: ['Samantha', 'Google US English', 'Microsoft Aria', 'Karen'],
    rate: 1,
    pitch: 1.06,
    volume: 1,
  },
  'skeptical-tech-lead': {
    id: 'dev-skeptical',
    name: 'Dev',
    label: 'Skeptical Tech Lead',
    description: 'Crisp, direct, and technical.',
    initials: 'D',
    avatarClassName: 'bg-slate-100 text-slate-800 ring-slate-200',
    browserVoiceHints: ['Google UK English Male', 'Microsoft Guy', 'Daniel', 'Alex'],
    rate: 0.96,
    pitch: 0.9,
    volume: 1,
  },
  'pm-who-doesnt-code': {
    id: 'leah-product',
    name: 'Leah',
    label: 'Product Partner',
    description: 'Plain-spoken, bright, and user-focused.',
    initials: 'L',
    avatarClassName: 'bg-sky-100 text-sky-800 ring-sky-200',
    browserVoiceHints: ['Google UK English Female', 'Microsoft Jenny', 'Samantha', 'Victoria'],
    rate: 1.03,
    pitch: 1.1,
    volume: 1,
  },
  'systems-thinker': {
    id: 'ravi-systems',
    name: 'Ravi',
    label: 'Systems Thinker',
    description: 'Even, grounded, and slightly slower.',
    initials: 'R',
    avatarClassName: 'bg-amber-100 text-amber-800 ring-amber-200',
    browserVoiceHints: ['Google US English', 'Microsoft Guy', 'Daniel', 'Alex'],
    rate: 0.92,
    pitch: 0.94,
    volume: 1,
  },
}

export const getAureonVoicePersona = (voiceId?: string | null) =>
  AUREON_VOICE_OPTIONS.find((voice) => voice.id === voiceId) ?? AUREON_VOICE_OPTIONS[0]

export const getTechChatVoicePersona = (personaId?: string | null) =>
  TECH_CHAT_VOICE_PERSONAS[(personaId as TechChatPersonaId) ?? 'curious-generalist'] ??
  TECH_CHAT_VOICE_PERSONAS['curious-generalist']
