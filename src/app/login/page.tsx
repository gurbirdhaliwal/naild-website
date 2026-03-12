'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { FaGoogle, FaLinkedin, FaGithub } from "react-icons/fa";
import { API_BASE, API_ORIGIN } from '../services/api';
import { CSRF_HEADER_NAME, getCsrfToken } from '../services/csrf';
import { getSafeRedirectPath } from '../services/safeRedirect';
import { setOAuthHandoffRedirect } from '../services/authSession';

export default function Login() {
  const searchParams = useSearchParams();
  const redirectPath = getSafeRedirectPath(searchParams.get('redirect'));
  const googleOauthHref = `${API_ORIGIN}/oauth2/authorization/google?redirect=${encodeURIComponent(redirectPath)}`;

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`${API_BASE}/auth/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      await response.json().catch(err => {
        throw err;
      });

      if (response.ok) {
        window.location.href = redirectPath;
      } else {
        setError('Login failed. Check your credentials.');
      }
    } catch (err) {
      console.error('❌ Login error', err);
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuthStart = () => {
    setOAuthHandoffRedirect(redirectPath);
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
          <h2 className="text-2xl font-semibold text-gray-900">naild.</h2>
          <p className="mt-1 text-sm text-gray-600">Log in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none"
          />
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none"
          />
          <div className="flex justify-end">
            <Link
              href={`/forgot-password?redirect=${encodeURIComponent(redirectPath)}`}
              className="text-sm font-medium text-green-700 hover:text-green-600"
            >
              Forgot password?
            </Link>
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 text-white bg-black rounded-md text-sm font-semibold shadow-sm hover:bg-gray-900 transition ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Logging in...' : 'Continue with email'}
          </button>
        </form>

        <div className="flex items-center justify-center my-4">
          <div className="border-t border-gray-200 w-full" />
          <span className="mx-2 text-sm text-gray-500">OR</span>
          <div className="border-t border-gray-200 w-full" />
        </div>

        <div className="space-y-3">
          <a
            href={googleOauthHref}
            onClick={handleGoogleOAuthStart}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md py-2 text-sm font-medium bg-white hover:bg-gray-50"
          >
            <FaGoogle />
            Continue with Google
          </a>

          {/* Additional providers */}
          <a
            href="#"
            className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md py-2 text-sm font-medium bg-white hover:bg-gray-50"
          >
            <FaLinkedin className='ml-2'/>
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

        <div className="mt-6 text-center text-sm text-gray-600">
          Don’t have an account?{' '}
          <Link
            href={`/signup?redirect=${encodeURIComponent(redirectPath)}`}
            className="text-green-600 font-medium hover:text-green-500"
          >
            Sign up
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
