type UserErrorContext =
  | 'signup'
  | 'login'
  | 'forgotPassword'
  | 'resetPassword'
  | 'profileUpdate'
  | 'accountDelete'
  | 'reauth'
  | 'microphoneAccess'
  | 'recordingProcessing'
  | 'transcription'
  | 'drillEvaluation'
  | 'interviewProgress'
  | 'interviewGrading'

const getStatusCode = (error: unknown): number | null => {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return null
  }

  const candidate = (error as { status?: unknown }).status
  return typeof candidate === 'number' ? candidate : null
}

const getErrorName = (error: unknown): string | null => {
  if (!error || typeof error !== 'object' || !('name' in error)) {
    return null
  }

  const candidate = (error as { name?: unknown }).name
  return typeof candidate === 'string' ? candidate : null
}

export const getUserFacingStatusMessage = (
  context: UserErrorContext,
  status: number | null | undefined
): string => {
  switch (context) {
    case 'signup':
      if (status === 409) {
        return 'An account with that email already exists. Try logging in instead.'
      }
      if (status === 400) {
        return 'We could not create your account with those details. Check the form and try again.'
      }
      if (status === 401 || status === 403) {
        return 'Your session expired. Refresh the page and try again.'
      }
      return 'We could not create your account right now. Please try again.'

    case 'login':
    case 'reauth':
      if (status === 400 || status === 401 || status === 403) {
        return 'Incorrect email or password. Try again.'
      }
      return 'We could not sign you in right now. Please try again.'

    case 'forgotPassword':
      if (status === 401 || status === 403) {
        return 'Your session expired. Refresh the page and try again.'
      }
      return 'We could not send a reset link right now. Please try again.'

    case 'resetPassword':
      if (status === 400 || status === 404 || status === 410) {
        return 'This reset link is invalid, expired, or already used. Request a new one and try again.'
      }
      if (status === 401 || status === 403) {
        return 'Your session expired. Refresh the page and try again.'
      }
      return 'We could not reset your password right now. Please try again.'

    case 'profileUpdate':
      if (status === 400) {
        return 'We could not update your profile. Review your changes and try again.'
      }
      if (status === 401 || status === 403) {
        return 'Your session expired. Sign in again and try once more.'
      }
      return 'We could not update your profile right now. Please try again.'

    case 'accountDelete':
      if (status === 401 || status === 403) {
        return 'Your session expired. Sign in again and try once more.'
      }
      return 'We could not delete your account right now. Please try again.'

    case 'microphoneAccess':
      return 'We could not access your microphone.'

    case 'recordingProcessing':
      return 'We could not process that recording. Please try again.'

    case 'transcription':
      return 'We could not transcribe your recording. Please try again.'

    case 'drillEvaluation':
      return 'We could not evaluate this answer right now. Please try again.'

    case 'interviewProgress':
      return 'We could not continue the interview right now. Please try again.'

    case 'interviewGrading':
      return 'We could not grade this interview right now. Please try again.'

    default:
      return 'Something went wrong. Please try again.'
  }
}

export const getUserFacingErrorMessage = (
  context: UserErrorContext,
  error: unknown
): string => {
  if (context === 'microphoneAccess') {
    const errorName = getErrorName(error)

    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      return 'Microphone access is blocked. Allow microphone permissions and try again.'
    }

    if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
      return 'No microphone was found. Connect one and try again.'
    }
  }

  return getUserFacingStatusMessage(context, getStatusCode(error))
}
