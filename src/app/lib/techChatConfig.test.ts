import { describe, expect, it } from 'vitest'

import {
  createTechChatMemoryState,
  parseTechChatMemoryState,
  serializeTechChatMemoryState,
} from './techChatConfig'

describe('Tech Chat memory state', () => {
  it('round-trips serialized memory state', () => {
    const state = createTechChatMemoryState('Curious generalist', {
      memoryBlock: '[SESSION MEMORY]\nEarlier in this conversation: The user compared monoliths and services.\n[END SESSION MEMORY]',
      compressedMessageCount: 8,
    })

    expect(parseTechChatMemoryState(serializeTechChatMemoryState(state), 'Curious generalist')).toEqual(state)
  })

  it('falls back safely when prompt context is not Tech Chat memory', () => {
    expect(parseTechChatMemoryState('plain drill context', 'Skeptical tech lead')).toEqual(
      createTechChatMemoryState('Skeptical tech lead')
    )
  })
})
