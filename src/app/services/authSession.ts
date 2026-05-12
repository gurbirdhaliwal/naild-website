import { API_BASE } from './api';
import { clearAuthToken, getAuthHeaders } from './authToken';
import { CSRF_HEADER_NAME, getCsrfToken } from './csrf';
import { getSafeRedirectPath } from './safeRedirect';

export const LOGOUT_BROADCAST_KEY = 'naild:logout';
export const OAUTH_HANDOFF_REDIRECT_KEY = 'naild:oauth_handoff_redirect';
export const SESSION_EXPIRED_BROADCAST_KEY = 'naild:session_expired';
export const SESSION_EXPIRED_EVENT = 'naild:session-expired';

let pendingSessionExpiryCheck: Promise<boolean> | null = null;

export function broadcastLogout(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOGOUT_BROADCAST_KEY, `${Date.now()}`);
}

export function notifySessionExpired(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  window.localStorage.setItem(SESSION_EXPIRED_BROADCAST_KEY, `${Date.now()}`);
}

export async function confirmSessionExpired(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  if (pendingSessionExpiryCheck) {
    return pendingSessionExpiryCheck;
  }

  pendingSessionExpiryCheck = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders(),
        credentials: 'include',
        cache: 'no-store',
      });

      return response.status === 400 || response.status === 401;
    } catch {
      return false;
    } finally {
      pendingSessionExpiryCheck = null;
    }
  })();

  return pendingSessionExpiryCheck;
}

export async function requestLogout(): Promise<void> {
  const csrfToken = await getCsrfToken();
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      [CSRF_HEADER_NAME]: csrfToken,
    },
    credentials: 'include',
  });
  clearAuthToken();
}

export function setOAuthHandoffRedirect(path: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(OAUTH_HANDOFF_REDIRECT_KEY, path);
}

export function getOAuthHandoffRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  const value = window.sessionStorage.getItem(OAUTH_HANDOFF_REDIRECT_KEY);
  return value ? getSafeRedirectPath(value, '/interview') : null;
}

export function consumeOAuthHandoffRedirect(): string | null {
  const target = getOAuthHandoffRedirect();
  if (!target) return null;
  clearOAuthHandoffRedirect();
  return target;
}

export function clearOAuthHandoffRedirect(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(OAUTH_HANDOFF_REDIRECT_KEY);
}
