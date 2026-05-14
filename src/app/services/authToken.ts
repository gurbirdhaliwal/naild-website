const AUTH_TOKEN_KEY = 'knappi:auth_token'

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string | null | undefined): void {
  if (typeof window === 'undefined') return

  if (token && token.trim()) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token.trim())
  }
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getOrLoadAuthHeaders(apiBase: string): Promise<Record<string, string>> {
  const existingHeaders = getAuthHeaders()
  if (existingHeaders.Authorization) {
    return existingHeaders
  }

  if (typeof window === 'undefined') {
    return {}
  }

  const response = await fetch(`${apiBase}/auth/me`, {
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => null)

  if (!response?.ok) {
    return {}
  }

  const payload = (await response.json().catch(() => ({}))) as { token?: string }
  setAuthToken(payload.token)
  return getAuthHeaders()
}
