const AUTH_TOKEN_KEY = 'naild:auth_token'

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
