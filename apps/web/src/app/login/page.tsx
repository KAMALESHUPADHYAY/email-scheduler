'use client';

import React from 'react';
import Link from 'next/link';
import { Send, ArrowLeft, Zap, Database, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { API_BASE_URL } from '../../lib/api';

export default function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-primary-500 selection:text-white transition-colors duration-200">
      {/* Top right theme toggle */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <ThemeToggle />
      </div>

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 group mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/25 group-hover:scale-105 transition-transform">
            <Send className="w-6 h-6 -rotate-12 translate-x-0.5" />
          </div>
        </Link>
        <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
          Welcome to MailPilot
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto">
          High-performance cold email scheduling engine backed by BullMQ, Redis, and PostgreSQL.
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="border border-neutral-200 dark:border-neutral-800 shadow-popover">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Sign in to your account</CardTitle>
            <CardDescription>
              Sign in with your Google account to access your personal dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {/* Real Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl shadow-sm bg-white dark:bg-neutral-800 text-sm font-semibold text-neutral-800 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all active:scale-[0.98]"
            >
              <svg className="w-5 h-5 mr-3 shrink-0" viewBox="0 0 24 24">
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
              <span>Continue with Google</span>
            </button>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
            {/* Architecture Highlights */}
            <div className="w-full space-y-2">
              <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider text-center">
                Multi-User Architecture &amp; Data Isolation
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-neutral-600 dark:text-neutral-400 text-center font-medium">
                <div className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 flex flex-col items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-warning-500" />
                  <span>BullMQ</span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 flex flex-col items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-primary-500" />
                  <span>Isolated DB</span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 flex flex-col items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-success-500" />
                  <span>Per-User Cap</span>
                </div>
              </div>
            </div>

            {/* Return link */}
            <div className="pt-2 text-center">
              <Link
                href="/"
                className="text-xs font-medium text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to landing page
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
