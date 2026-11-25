'use client';

import React from 'react';
import Link from 'next/link';
import {
  Send,
  ShieldCheck,
  Zap,
  Database,
  Search,
  ArrowRight,
  Server,
  Cpu,
  Clock,
  Layers,
  CheckCircle2,
  Lock,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { API_BASE_URL } from '../lib/api';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 selection:bg-primary-500 selection:text-white transition-colors duration-200">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-500 flex items-center justify-center text-white shadow-md shadow-primary-500/25 group-hover:scale-105 transition-transform">
              <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
                MailPilot
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                v2.4
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600 dark:text-neutral-300">
            <a href="#how-it-works" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              How It Works
            </a>
            <a href="#platform" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              Architecture
            </a>
            <a href="#reliability" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              Reliability
            </a>
            <a href="#capabilities" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              Capabilities
            </a>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Launch App
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
        {/* Subtle Background Glow */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none"
        >
          <div className="w-[600px] h-[350px] bg-primary-500/10 dark:bg-primary-600/15 rounded-full blur-[120px] transform -translate-y-12" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Engineering Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 border border-primary-200/80 dark:border-primary-800/80 mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            BullMQ Queue Orchestration &bull; Neon Postgres &bull; Upstash Redis
          </div>

          {/* Value Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-neutral-900 dark:text-white max-w-4xl mx-auto leading-[1.12]">
            High-Precision Cold Email Scheduling at Cloud Scale
          </h1>

          <p className="mt-5 text-base sm:text-lg md:text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            Engineered for bulletproof delivery. Guarantees zero double-sends, atomic hourly sender limits,
            and restart-safe persistence with separate worker processes.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary-500/25" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Start Sending Free
              </Button>
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                See How It Works
              </Button>
            </a>
          </div>

          {/* Live Mock Dispatch Terminal */}
          <div className="mt-14 max-w-4xl mx-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 shadow-2xl overflow-hidden text-left">
            <div className="h-10 px-4 bg-neutral-100 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-danger-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-warning-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-success-500/80 inline-block" />
                <span className="ml-2 text-xs font-mono text-neutral-500 dark:text-neutral-400">
                  mailpilot-worker-telemetry ~ bullmq-delayed-queue
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm" dot>
                  Worker Online
                </Badge>
              </div>
            </div>

            <div className="p-6 font-mono text-xs sm:text-sm space-y-3 bg-neutral-950 text-neutral-200">
              <div className="flex items-center justify-between text-neutral-400 border-b border-neutral-800 pb-2">
                <span>[DISPATCH LOG]</span>
                <span className="text-primary-400">Concurrency: 5 &bull; Rate Limit: 50/hr</span>
              </div>
              <div className="text-emerald-400 flex items-center gap-2">
                <span>✓</span>
                <span className="text-neutral-300">
                  [QUEUE INGEST] 150 recipients verified. 0 syntax errors, 0 duplicates.
                </span>
              </div>
              <div className="text-primary-400 flex items-center gap-2">
                <span>⚡</span>
                <span className="text-neutral-300">
                  [ATOMIC STAGGER] BullMQ delayed jobs registered (jobId = email.id, delay = +2400ms).
                </span>
              </div>
              <div className="text-amber-400 flex items-center gap-2">
                <span>🛡</span>
                <span className="text-neutral-300">
                  [RATE LIMITER] Redis key `rl:snd_89a0:2026-11-25T14` atomic INCR count = 14/50.
                </span>
              </div>
              <div className="text-emerald-400 flex items-center gap-2">
                <span>✉</span>
                <span className="text-neutral-300">
                  [SENT] Delivered to <span className="text-white font-bold">alex@acme.corp</span> via Ethereal SMTP &bull; preview URL generated.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: How It Works */}
      <section id="how-it-works" className="py-20 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-100/50 dark:bg-neutral-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold tracking-widest uppercase text-primary-600 dark:text-primary-400">
              Workflow Architecture
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Three Steps from CSV to Staggered Delivery
            </p>
            <p className="mt-3 text-base text-neutral-600 dark:text-neutral-400">
              Every job is scheduled idempotently. No cron polling, no setInterval, zero double-sends.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="rounded-2xl p-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-card hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-950 flex items-center justify-center text-primary-600 dark:text-primary-400 font-black text-lg mb-4">
                01
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Write &amp; Personalize
              </h3>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Draft subject and email copy with live variable interpolation like{' '}
                <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-primary-600">
                  {'{{name}}'}
                </code>
                . Inspect real-time rendering before scheduling.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl p-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-card hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-950 flex items-center justify-center text-primary-600 dark:text-primary-400 font-black text-lg mb-4">
                02
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                CSV Ingest &amp; Deduplication
              </h3>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Upload recipient lists. Client-side validation catches RFC-compliant syntax errors and
                duplicates instantly, providing a downloadable error report.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl p-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-card hover:shadow-card-hover transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-950 flex items-center justify-center text-primary-600 dark:text-primary-400 font-black text-lg mb-4">
                03
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                BullMQ Staggered Execution
              </h3>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Jobs are inserted into PostgreSQL in one atomic transaction, then placed on BullMQ as
                delayed jobs staggered by delay seconds. No double-sends, even during worker restarts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Platform Architecture */}
      <section id="platform" className="py-20 border-t border-neutral-200/80 dark:border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold tracking-widest uppercase text-primary-600 dark:text-primary-400">
              Stack Architecture
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Engineered with Enterprise Separation of Concerns
            </p>
            <p className="mt-3 text-base text-neutral-600 dark:text-neutral-400">
              API and Worker processes run isolated on separate containers with distinct scaling profiles.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/80 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                Next.js App Router
              </h4>
              <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                High-performance React frontend hosted on Vercel Edge with zero CORS latency and 100% type safety.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                <Server className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                Express REST API
              </h4>
              <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Stateless API handling Google/Slack OAuth, CSV parsing, campaign transactions, and Bull Board UI.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                Independent Worker
              </h4>
              <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Dedicated Node.js daemon consuming BullMQ queues with concurrency controls and rate limiting.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                Upstash &amp; Neon
              </h4>
              <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                PostgreSQL with migrations for relational consistency, and Upstash Redis with noeviction for queue state.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Reliability Guarantees */}
      <section id="reliability" className="py-20 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-100/50 dark:bg-neutral-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold tracking-widest uppercase text-primary-600 dark:text-primary-400">
              Reliability Standards
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Engineered for Failure-Proof Resiliency
            </p>
            <p className="mt-3 text-base text-neutral-600 dark:text-neutral-400">
              Critical invariants tested under simulated network dropouts and worker crashes.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-card flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-success-50 dark:bg-success-950 flex items-center justify-center text-success-600 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                  Restart Safety &amp; Zero Dropped Jobs
                </h4>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Worker processes can be killed with SIGKILL or SIGTERM mid-queue. BullMQ and Redis retain
                  every delayed job, and jobs pick up immediately upon restart without duplicates.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-card flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950 flex items-center justify-center text-primary-600 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                  Guaranteed No Double-Sends
                </h4>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Every worker checks the DB email status right before SMTP dispatch. If state is not
                  strictly &apos;scheduled&apos;, the job exits immediately, preventing double delivery under any concurrency race.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-card flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-warning-50 dark:bg-warning-950 flex items-center justify-center text-warning-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                  Atomic Hourly Limit Token Bucket
                </h4>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Rate keys use atomic Redis INCR (<code className="text-xs">rl:{'{sender}'}:{'{hour}'}</code>).
                  If a limit is reached, jobs are smoothly delayed to the start of the next hour plus
                  order-preserving offsets.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-card flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 shrink-0">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                  Elasticsearch Full-Text Search with Fallback
                </h4>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Fast sub-millisecond search across recipient, subject, and body text. If Elasticsearch is
                  offline or indexing fails, the system automatically falls back to PostgreSQL ILIKE queries.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Live Capabilities */}
      <section id="capabilities" className="py-20 border-t border-neutral-200/80 dark:border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xs font-bold tracking-widest uppercase text-primary-600 dark:text-primary-400">
            System Metrics
          </h2>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
            Built for High-Throughput Accuracy
          </p>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
              <div className="text-3xl sm:text-4xl font-black text-primary-600 dark:text-primary-400">
                100%
              </div>
              <div className="mt-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Idempotent Job IDs
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
              <div className="text-3xl sm:text-4xl font-black text-success-600 dark:text-success-400">
                0
              </div>
              <div className="mt-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Double-Send Window
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
              <div className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white">
                50/hr
              </div>
              <div className="mt-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Default Sender Cap
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
              <div className="text-3xl sm:text-4xl font-black text-amber-500">
                &lt; 5ms
              </div>
              <div className="mt-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Search Latency
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-16 bg-gradient-to-b from-transparent to-primary-500/10 dark:to-primary-950/30 border-t border-neutral-200/80 dark:border-neutral-800/80">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold text-neutral-900 dark:text-white sm:text-4xl">
            Experience Placement-Grade Cold Email Resiliency
          </h2>
          <p className="mt-3 text-base text-neutral-600 dark:text-neutral-400">
            Sign in with Google OAuth or test instantly using the 1-click candidate demo session.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary-500/25" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Get Started with MailPilot
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <footer className="border-t border-neutral-200/80 dark:border-neutral-800/80 py-8 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-primary-600" />
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              MailPilot
            </span>
            <span className="text-xs text-neutral-400 ml-2">
              &copy; {new Date().getFullYear()} MailPilot Platform. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-neutral-500 dark:text-neutral-400">
            <a
              href={`${API_BASE_URL}/health`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-600 flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success-500" />
              API Health
            </a>
            <a
              href={`${API_BASE_URL}/admin/queues`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-600 flex items-center gap-1"
            >
              <BarChart3 className="w-3.5 h-3.5 text-primary-500" />
              Bull Board Admin
            </a>
            <a
              href="https://github.com/KAMALESHUPADHYAY/email-scheduler"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-600 flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
