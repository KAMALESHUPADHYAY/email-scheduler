'use client';

import React from 'react';
import { Mail, ShieldCheck, Zap, Database, Search, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { API_BASE_URL } from '../lib/api';

export default function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const handleDevLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/dev-login`;
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-xl shadow-brand-500/25 mb-4">
          <Mail className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-surface-900 dark:text-surface-100 tracking-tight">
          Email Scheduler
        </h2>
        <p className="mt-2 text-sm text-surface-500 max-w-sm mx-auto">
          Miniature ReachInbox queue engine built with BullMQ, Redis AOF, PostgreSQL, and Elasticsearch.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-surface-900 py-8 px-6 shadow-xl sm:rounded-2xl border border-surface-200 dark:border-surface-800 space-y-6">
          <div className="space-y-3">
            {/* Real Google OAuth Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center px-4 py-3 border border-surface-300 dark:border-surface-700 rounded-xl shadow-sm bg-white dark:bg-surface-800 text-sm font-semibold text-surface-800 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
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
              Sign in with Google
            </button>

            {/* Quick Demo Login Button for Instant Interview/Placement Evaluation */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-200 dark:border-surface-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-surface-900 px-2 text-surface-400 font-medium">
                  Instant Test Login
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="w-full text-xs"
              onClick={handleDevLogin}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign in as Demo Candidate (1-Click)
            </Button>
          </div>

          {/* Architecture Feature Badges */}
          <div className="pt-4 border-t border-surface-100 dark:border-surface-800 space-y-2.5">
            <h4 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
              System Architecture Highlights
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-surface-600 dark:text-surface-400">
              <div className="flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>BullMQ Delayed Queue</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-blue-500" />
                <span>Redis AOF Persistence</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Hourly Rate Rescheduler</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Search className="w-3.5 h-3.5 text-purple-500" />
                <span>Elasticsearch Search</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
