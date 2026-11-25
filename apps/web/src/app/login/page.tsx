'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api, API_BASE_URL } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err === 'google_not_configured') {
        setError('Google OAuth is not configured on the server yet. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Render.');
      } else if (err === 'access_denied') {
        setError('Google sign-in was canceled or access was denied. If your Google Cloud app is in "Testing" mode, add your Google account to Test Users.');
      } else if (err === 'invalid_grant') {
        setError('Google authorization code has expired or was already used. Please try logging in again.');
      } else if (err === 'google_auth_failed' || err === 'oauth_failed') {
        setError('Google sign-in could not be completed. Please check Google Cloud Console credentials and redirect URIs.');
      } else if (err === 'missing_code') {
        setError('Google authorization was incomplete. Please try again.');
      } else if (err === 'session_expired') {
        setError('Your session has expired. Please log in again.');
      } else if (err) {
        setError(`Authentication error (${err}). Please try again.`);
      }
    }
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError('Please enter your full name');
          setIsLoading(false);
          return;
        }
        await api.registerWithPassword(email, password, name);
      } else {
        await api.loginWithPassword(email, password);
      }
      router.push('/dashboard/scheduled');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4 selection:bg-primary-200">
      {/* 360px centered Figma card */}
      <div className="w-full max-w-[360px] bg-white rounded-card border border-neutral-200 shadow-subtle p-7">
        {/* Title */}
        <h1 className="text-lg font-bold text-neutral-900 text-center mb-6">
          {isSignUp ? 'Create an Account' : 'Login'}
        </h1>

        {/* 1. Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2.5 py-2 px-4 rounded-input bg-primary-light hover:bg-primary-100 border border-primary-200 text-primary-900 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Login with Google</span>
        </button>

        {/* 2. Divider */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="border-t border-neutral-200 w-full" />
          <span className="bg-white px-2.5 text-[11px] text-neutral-400 absolute">
            or sign up through email
          </span>
        </div>

        {/* 3. Email + Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs text-center font-medium">
              {error}
            </div>
          )}

          {isSignUp && (
            <div>
              <label className="block text-xs text-neutral-600 mb-1 font-medium">
                Full Name
              </label>
              <Input
                variant="filled"
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-neutral-600 mb-1 font-medium">
              Email ID
            </label>
            <Input
              variant="filled"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-600 mb-1 font-medium">
              Password
            </label>
            <Input
              variant="filled"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            variant="solid"
            size="md"
            isLoading={isLoading}
            className="w-full bg-primary-700 hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold py-2.5 rounded-input mt-2"
          >
            {isSignUp ? 'Create Account' : 'Login'}
          </Button>
        </form>

        {/* Toggle sign up / login */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs text-neutral-500 hover:text-primary-700 transition-colors"
          >
            {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
