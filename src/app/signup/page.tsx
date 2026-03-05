'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FaGoogle, FaLinkedin, FaGithub, FaArrowLeft } from 'react-icons/fa';
import { API_BASE, API_ORIGIN } from '../services/api';
import { CSRF_HEADER_NAME, getCsrfToken } from '../services/csrf';
import { getSafeRedirectPath } from '../services/safeRedirect';
import { setOAuthHandoffRedirect } from '../services/authSession';

export default function Signup() {
  const searchParams = useSearchParams();
  const redirectPath = getSafeRedirectPath(searchParams.get('redirect'));
  const googleOauthHref = `${API_ORIGIN}/oauth2/authorization/google?redirect=${encodeURIComponent(redirectPath)}`;

  const [step, setStep] = useState<'email' | 'details'>('email');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          firstname: formData.firstName,
          lastname: formData.lastName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json().catch(async () => {
        const fallbackText = await response.text();
        throw new Error(fallbackText || 'Unknown server error.');
      });

      if (response.ok) {
        window.location.href = redirectPath;
      } else {
        setError(data.error || 'Signup failed. Try again.');
      }
    } catch (err: unknown) {
      console.error('❌ Signup error:', err);
      setError(err instanceof Error ? err.message : 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuthStart = () => {
    setOAuthHandoffRedirect(redirectPath);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 px-4 font-inter">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-md p-8"
      >
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Create your account</h2>
          <p className="mt-1 text-sm text-gray-600">Start practicing interviews with AI feedback</p>
        </div>

        {/* EMAIL SIGNUP FLOW */}
        <AnimatePresence mode="wait">
          {step === 'email' ? (
            <motion.form
              key="emailStep"
              onSubmit={handleContinue}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mt-6 space-y-4"
            >
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="rounded-md border border-gray-300 px-3 py-2 shadow-sm w-full focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
              {error && <div className="text-red-600 text-sm text-center">{error}</div>}
              <button
                type="submit"
                className="w-full py-2 px-4 text-white bg-black rounded-md text-sm font-semibold shadow-sm hover:bg-gray-900 transition"
              >
                Continue with email
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="detailsStep"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mt-6 space-y-4"
            >
              {/* Back to email */}
              <div className="w-full flex justify-start">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-500 mb-4"
                >
                  <FaArrowLeft className="w-4 h-4" />
                  <span>Back to edit email</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  name="firstName"
                  type="text"
                  placeholder="First name"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="rounded-md border border-gray-300 px-3 py-2 shadow-sm w-full focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
                <input
                  name="lastName"
                  type="text"
                  placeholder="Last name"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="rounded-md border border-gray-300 px-3 py-2 shadow-sm w-full focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <input
                name="password"
                type="password"
                placeholder="Password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="rounded-md border border-gray-300 px-3 py-2 shadow-sm w-full focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirm password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="rounded-md border border-gray-300 px-3 py-2 shadow-sm w-full focus:outline-none focus:ring-green-500 focus:border-green-500"
              />

              {error && <div className="text-red-600 text-sm text-center">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 px-4 text-white bg-black rounded-md text-sm font-semibold shadow-sm hover:bg-gray-900 transition ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Creating account...' : 'Sign up'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div className="flex items-center justify-center my-6">
          <div className="border-t border-gray-200 w-full" />
          <span className="mx-2 text-sm text-gray-500">OR</span>
          <div className="border-t border-gray-200 w-full" />
        </div>

        {/* SOCIAL SIGNUP */}
        <div className="space-y-3">
          <a
            href={googleOauthHref}
            onClick={handleGoogleOAuthStart}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md py-2 text-sm font-medium bg-white hover:bg-gray-50"
          >
            <FaGoogle />
            Continue with Google
          </a>
          <a
            href="#"
            className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md py-2 text-sm font-medium bg-white hover:bg-gray-50"
          >
            <FaLinkedin />
            Continue with LinkedIn
          </a>
          <a
            href="#"
            className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md py-2 text-sm font-medium bg-white hover:bg-gray-50"
          >
            <FaGithub />
            Continue with GitHub
          </a>
        </div>

        {/* Redirect to login */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
            className="text-green-600 font-medium hover:text-green-500"
          >
            Log in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
