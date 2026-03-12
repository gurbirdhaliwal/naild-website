'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { API_BASE } from '../services/api';
import { CSRF_HEADER_NAME, getCsrfToken } from '../services/csrf';
import { getSafeRedirectPath } from '../services/safeRedirect';

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const redirectPath = getSafeRedirectPath(searchParams.get('redirect'));

  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(typeof data?.message === 'string' ? data.message : 'Unable to send reset link right now.');
        return;
      }

      setMessage(
        typeof data?.message === 'string'
          ? data.message
          : 'If an account exists for that email, a password reset link has been sent.'
      );
    } catch (err) {
      console.error('❌ Forgot password error', err);
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-md p-8"
      >
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-600">
            Enter the email address tied to your Naild account and we&apos;ll send a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none"
          />

          {error && <div className="text-sm text-center text-red-500">{error}</div>}
          {message && <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-900 ${
              loading ? 'cursor-not-allowed opacity-70' : ''
            }`}
          >
            {loading ? 'Sending reset link...' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Remembered it?{' '}
          <Link
            href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
            className="font-medium text-green-700 hover:text-green-600"
          >
            Back to login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
