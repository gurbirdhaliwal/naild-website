export type TechChatPersonaId =
  | 'curious-generalist'
  | 'skeptical-tech-lead'
  | 'pm-who-doesnt-code'
  | 'systems-thinker'

export interface TechChatPersona {
  id: TechChatPersonaId
  name: string
  archetype: string
  bio: string
  topicAffinity: string[]
  sampleLine: string
  windDownStyle: string
  softTurnLimit: number
  avatarClassName: string
}

export const TECH_CHAT_SOFT_TURN_LIMIT = 16
export const TECH_CHAT_ACTIVE_WINDOW_MESSAGE_COUNT = 12
export const TECH_CHAT_MIN_COMPRESS_MESSAGE_COUNT = 8

export interface TechChatMemoryState {
  type: 'tech-chat-memory'
  version: 1
  personaArchetype: string
  memoryBlock: string
  compressedMessageCount: number
}

export const TECH_CHAT_PERSONAS: TechChatPersona[] = [
  {
    id: 'curious-generalist',
    name: 'Maya',
    archetype: 'Curious generalist',
    bio: 'A senior engineer who connects product ideas, infrastructure, and developer experience.',
    topicAffinity: ['Architecture tradeoffs', 'AI tooling', 'developer workflows', 'product engineering'],
    sampleLine: 'Wait, that reminds me of how teams talk about platform work. Does the same logic apply here?',
    windDownStyle: 'Closes with an appreciative connection to a broader idea from the conversation.',
    softTurnLimit: TECH_CHAT_SOFT_TURN_LIMIT,
    avatarClassName: 'bg-emerald-100 text-emerald-800',
  },
  {
    id: 'skeptical-tech-lead',
    name: 'Dev',
    archetype: 'Skeptical tech lead',
    bio: 'A technically deep lead who pushes for concrete reasoning without turning the chat into an interview.',
    topicAffinity: ['System design', 'backend architecture', 'tradeoffs', 'operational constraints'],
    sampleLine: 'I buy part of that, but why not choose the boring option and avoid the new moving part?',
    windDownStyle: 'Closes by naming the strongest claim and the one assumption still worth pressure-testing.',
    softTurnLimit: TECH_CHAT_SOFT_TURN_LIMIT,
    avatarClassName: 'bg-slate-100 text-slate-800',
  },
  {
    id: 'pm-who-doesnt-code',
    name: 'Leah',
    archetype: "PM who doesn't code",
    bio: 'A sharp product partner who asks for first-principles explanations and user impact.',
    topicAffinity: ['User impact', 'product tradeoffs', 'technical risk', 'launch decisions'],
    sampleLine: 'I think I follow, but what would a user actually notice if we made that change?',
    windDownStyle: 'Closes by translating the conversation back into user or business impact.',
    softTurnLimit: TECH_CHAT_SOFT_TURN_LIMIT,
    avatarClassName: 'bg-sky-100 text-sky-800',
  },
  {
    id: 'systems-thinker',
    name: 'Ravi',
    archetype: 'Systems thinker',
    bio: 'An engineer who naturally looks for edge cases, failure modes, and long-term pressure.',
    topicAffinity: ['Scale', 'reliability', 'distributed systems', 'failure modes'],
    sampleLine: 'That works in the happy path, but what happens when the queue backs up for an hour?',
    windDownStyle: 'Closes with one lingering edge case or systems implication to keep thinking about.',
    softTurnLimit: TECH_CHAT_SOFT_TURN_LIMIT,
    avatarClassName: 'bg-amber-100 text-amber-800',
  },
]

export const getTechChatPersona = (personaId?: string | null) =>
  TECH_CHAT_PERSONAS.find((persona) => persona.id === personaId) ?? TECH_CHAT_PERSONAS[0]

export const createTechChatMemoryState = (
  personaArchetype: string,
  overrides: Partial<Omit<TechChatMemoryState, 'type' | 'version' | 'personaArchetype'>> = {}
): TechChatMemoryState => ({
  type: 'tech-chat-memory',
  version: 1,
  personaArchetype,
  memoryBlock: overrides.memoryBlock ?? '',
  compressedMessageCount: Math.max(0, Math.floor(overrides.compressedMessageCount ?? 0)),
})

export const parseTechChatMemoryState = (
  promptContext: string | null | undefined,
  personaArchetype: string
): TechChatMemoryState => {
  if (!promptContext) return createTechChatMemoryState(personaArchetype)

  try {
    const parsed = JSON.parse(promptContext) as Partial<TechChatMemoryState>
    if (parsed.type !== 'tech-chat-memory') {
      return createTechChatMemoryState(personaArchetype)
    }

    return createTechChatMemoryState(personaArchetype, {
      memoryBlock: typeof parsed.memoryBlock === 'string' ? parsed.memoryBlock : '',
      compressedMessageCount:
        typeof parsed.compressedMessageCount === 'number' ? parsed.compressedMessageCount : 0,
    })
  } catch {
    return createTechChatMemoryState(personaArchetype)
  }
}

export const serializeTechChatMemoryState = (state: TechChatMemoryState) =>
  JSON.stringify(state)
