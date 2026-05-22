'use client';

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { FaGoogle } from 'react-icons/fa';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { API_BASE, API_ORIGIN } from '../services/api';
import { setOAuthHandoffRedirect } from '../services/authSession';
import { getUserFacingErrorMessage, getUserFacingStatusMessage } from '../lib/userFacingErrors';

const DEFAULT_REDIRECT = '/interview';

export default function SessionReauthModal() {
  const pathname = usePathname();
  const { sessionExpired, expiredUser, refreshSession } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const redirectPath = useMemo(() => {
    if (typeof window === 'undefined') {
      return pathname || DEFAULT_REDIRECT;
    }

    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    return currentPath || pathname || DEFAULT_REDIRECT;
  }, [pathname]);

  const canUsePasswordReauth =
    !expiredUser?.authProvider || expiredUser.authProvider.toUpperCase() === 'LOCAL';
  const googleOauthHref = `${API_ORIGIN}/oauth2/authorization/google?redirect=${encodeURIComponent(
    redirectPath
  )}`;

  useEffect(() => {
    if (!sessionExpired) {
      setError('');
      setLoading(false);
      setVerificationCode('');
      setVerificationPending(false);
      setFormData((current) => ({ ...current, password: '' }));
      return;
    }

    setFormData({
      email: expiredUser?.email ?? '',
      password: '',
    });
  }, [expiredUser, sessionExpired]);

  useEffect(() => {
    if (!sessionExpired) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sessionExpired]);

  useEffect(() => {
    if (!sessionExpired) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const getFocusableElements = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      dialog.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sessionExpired]);

  if (!sessionExpired) {
    return null;
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/auth/${verificationPending ? 'authenticate/verify' : 'authenticate'}`,
        {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
          body: JSON.stringify(
            verificationPending
              ? { email: formData.email, code: verificationCode }
              : formData
          ),
        }
      );

      if (!response.ok) {
        setError(getUserFacingStatusMessage('reauth', response.status));
        return;
      }

      if (!verificationPending) {
        setVerificationPending(true);
        setVerificationCode('');
        return;
      }

      const refreshedUser = await refreshSession();
      if (!refreshedUser) {
        setError('Your session was refreshed, but we could not restore the app state. Try again.')
      }
    } catch (reauthError) {
      console.error('Session re-sign in failed:', reauthError);
      setError(getUserFacingErrorMessage('reauth', reauthError));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuthStart = () => {
    setOAuthHandoffRedirect(redirectPath);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-3xl border border-white/20 bg-white p-8 shadow-2xl"
      >
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-green-700">
            Session expired
          </p>
          <h2 id="session-expired-title" className="mt-3 text-2xl font-semibold text-gray-900">
            Sign in again to keep using Knappi
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Your authentication token expired while this page was open. The site is locked until
            you sign in again.
          </p>
        </div>

        {canUsePasswordReauth ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              id="session-email"
              name="email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              disabled={verificationPending}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
            />
            {verificationPending ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code sent to {formData.email}.
                </p>
                <input
                  id="session-verification-code"
                  name="verificationCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Verification code"
                  autoComplete="one-time-code"
                  required
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setVerificationPending(false);
                    setVerificationCode('');
                    setError('');
                  }}
                  className="text-sm font-medium text-green-700 hover:text-green-600"
                >
                  Use a different email or password
                </button>
              </div>
            ) : (
              <input
                id="session-password"
                name="password"
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
              />
            )}

            {error ? <p className="text-sm text-center text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-900 ${
                loading ? 'cursor-not-allowed opacity-70' : ''
              }`}
            >
              {loading ? 'Signing in...' : verificationPending ? 'Verify and unlock' : 'Sign in again'}
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-center text-gray-600">
              This account uses {expiredUser?.authProvider ?? 'social login'}. Continue through
              your provider to unlock the site again.
            </p>
            <a
              href={googleOauthHref}
              onClick={handleGoogleOAuthStart}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
            >
              <FaGoogle />
              Continue with Google
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
