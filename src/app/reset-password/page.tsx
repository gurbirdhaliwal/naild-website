'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { API_BASE } from '../services/api';
import { getUserFacingErrorMessage, getUserFacingStatusMessage } from '../lib/userFacingErrors';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('This reset link is invalid or incomplete.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          token,
          password,
        }),
      });

      if (!response.ok) {
        setError(getUserFacingStatusMessage('resetPassword', response.status));
        return;
      }

      setMessage('Password reset successfully. You can now log in with your new password.')
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('❌ Reset password error', err);
      setError(getUserFacingErrorMessage('resetPassword', err));
    } finally {
      setLoading(false);
    }
  };

  const missingToken = !token;

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-md p-8"
      >
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Choose a new password</h1>
          <p className="mt-1 text-sm text-gray-600">
            Set a new password for your Knappi account. This link can only be used once.
          </p>
        </div>

        {missingToken ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              This reset link is missing a token. Request a new password reset email and try again.
            </div>
            <Link
              href="/forgot-password"
              className="block w-full rounded-md bg-black px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-gray-900"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              id="password"
              name="password"
              type="password"
              placeholder="New password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none"
            />
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
              {loading ? 'Updating password...' : 'Reset password'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-green-700 hover:text-green-600">
            Back to login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-green-50" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
