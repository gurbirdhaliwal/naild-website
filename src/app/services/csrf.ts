import { API_BASE } from './api';

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(name.length + 1));
}

export async function getCsrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Unable to initialize CSRF token (${response.status})`);
  }

  const payload = (await response.json().catch(() => ({}))) as { token?: string };
  const tokenFromCookie = getCookieValue(CSRF_COOKIE_NAME);
  const token = payload.token ?? tokenFromCookie;

  if (!token) {
    throw new Error('CSRF token missing from response and cookies');
  }

  return token;
}
