'use client';

import React from 'react';
import {
  Zap,
  Mail,
  Database,
  Search,
  Server,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Shield,
  Copy,
} from 'lucide-react';
import { useDashboard } from '../layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { API_BASE_URL } from '../../../lib/api';

export default function IntegrationsPage() {
  const { user, sender, health } = useDashboard();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
          Integrations &amp; Telemetry
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Connect third-party webhook services and inspect underlying cloud infrastructure components.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Slack OAuth / Webhook Alerts */}
        <Card className="rounded-2xl border-neutral-200/80 dark:border-neutral-800/80 shadow-sm flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Slack Alerts Integration</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Real-time hourly limit alerts &amp; failure notifications
                  </CardDescription>
                </div>
              </div>

              {user?.has_slack ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <Badge variant="neutral" size="sm">
                  Disconnected
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Receive automated Slack messages whenever your email campaigns hit 80% or 100% of their hourly limit, or if individual jobs fail delivery retries.
            </p>

            {user?.has_slack ? (
              <div className="p-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 text-xs">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Connected Channel
                </span>
                <p className="font-mono font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                  {user.slack_channel || '#email-scheduler-alerts'}
                </p>
              </div>
            ) : null}

            <a href={`${API_BASE_URL}/auth/slack`} className="block">
              <Button
                size="sm"
                className="w-full justify-center bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs py-2 shadow-sm font-semibold"
                rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                {user?.has_slack ? 'Reconnect Slack Workspace' : 'Connect Slack Workspace'}
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* 2. SMTP Sender Configuration */}
        <Card className="rounded-2xl border-neutral-200/80 dark:border-neutral-800/80 shadow-sm flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">SMTP Sender Configuration</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Isolated Ethereal test SMTP credentials
                  </CardDescription>
                </div>
              </div>
              <Badge variant="sent" size="sm">
                Active
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Sender Email Address
                </span>
                <p className="font-mono font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5 truncate" title={sender?.email}>
                  {sender?.email || 'Provisioning on first login...'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/50 dark:border-neutral-700/50">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">Hourly Cap</span>
                  <p className="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">{sender?.hourly_limit || 20} emails/hr</p>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/50 dark:border-neutral-700/50">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">Protocol</span>
                  <p className="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">SMTP (TLS Port 587)</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-[11px] text-indigo-900 dark:text-indigo-200">
              Each user account is automatically assigned an isolated test sender with generated preview links for safe development.
            </div>
          </CardContent>
        </Card>

        {/* 3. BullMQ Redis Engine */}
        <Card className="rounded-2xl border-neutral-200/80 dark:border-neutral-800/80 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/80 text-red-600 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Upstash Redis &bull; BullMQ</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Delayed job queuing, concurrency locks &amp; rate counters
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <span className="text-neutral-600 dark:text-neutral-400">Connection</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> TLS rediss://
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <span className="text-neutral-600 dark:text-neutral-400">Worker Status</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {health?.services?.worker === 'online' ? 'Online (Heartbeat Active)' : 'Standby / Sleeping'}
              </span>
            </div>
            <a
              href={`${API_BASE_URL}/admin/queues`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 pt-1"
            >
              <span>Open Bull Board Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </CardContent>
        </Card>

        {/* 4. Neon PostgreSQL & Search */}
        <Card className="rounded-2xl border-neutral-200/80 dark:border-neutral-800/80 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">PostgreSQL &bull; Elasticsearch</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Relational ACID storage and full-text search indexing
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <span className="text-neutral-600 dark:text-neutral-400">Database Engine</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Neon Serverless PG
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <span className="text-neutral-600 dark:text-neutral-400">Search Engine</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                Elasticsearch Index + DB ILIKE Fallback
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 text-[11px] text-neutral-500 dark:text-neutral-400">
              Campaigns and recipient batches are created within atomic database transactions, ensuring zero orphaned records during network dropouts.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
