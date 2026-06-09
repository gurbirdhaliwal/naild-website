import { AI_BASE } from './api'
import { getAudioUploadFilename } from './audioUpload'
import { getAuthHeaders } from './authToken'

type ErrorPayload = {
  detail?: unknown
  error?: unknown
}

const getResponseErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as ErrorPayload
    const message = payload.detail ?? payload.error

    if (typeof message === 'string' && message.trim()) {
      return message.trim()
    }
  } catch {
    // Fall back to the generic message below when the server response is not JSON.
  }

  return 'Failed to process voice input.'
}

export const transcribeAudioBlob = async (audioBlob: Blob, basename: string) => {
  const formData = new FormData()
  formData.append('audio', audioBlob, getAudioUploadFilename(audioBlob, basename))

  const response = await fetch(`${AI_BASE}/transcription`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response))
  }

  const result = await response.json()
  if (result.error) throw new Error(result.error)

  if (typeof result.user_input !== 'string') {
    throw new Error('No transcription was returned.')
  }

  return result.user_input
}
