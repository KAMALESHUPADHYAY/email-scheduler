'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { api, API_BASE_URL } from '../../lib/api';
import { User, Sender, UserStats, HealthResponse } from '../../types';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';

export default function InsightsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sender, setSender] = useState<Sender | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getMe().catch(() => null),
      api.getStats().catch(() => null),
      api.getHealth().catch(() => null),
    ])
      .then(([meRes, statsRes, healthRes]) => {
        if (!meRes) {
          router.push('/login');
          return;
        }
        setUser(meRes.user);
        setSender(meRes.sender);
        if (statsRes) setStats(statsRes.data);
        if (healthRes) setHealth(healthRes);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  const maxVal = Math.max(
    1,
    ...(stats?.chartPoints.map((p) => p.count) || [1])
  );

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans select-none text-neutral-900">
      {/* Header */}
      <header className="h-14 border-b border-neutral-200 bg-white px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconButton
            aria-label="Back to dashboard"
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/scheduled')}
          >
            <ArrowLeft className="w-4 h-4 text-neutral-600" />
          </IconButton>
          <h1 className="text-sm sm:text-base font-bold text-neutral-900">
            Queue Insights & Telemetry
          </h1>
        </div>

        <a
          href={`${API_BASE_URL}/admin/queues`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          <span>Bull Board Dashboard</span>
          <ExternalLink className="w-3 h-3 text-neutral-400" />
        </a>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-card bg-white border border-neutral-200 shadow-subtle">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Scheduled
            </span>
            <p className="text-2xl font-bold text-neutral-900 mt-1">
              {stats?.scheduledCount ?? 0}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Pending in BullMQ</p>
          </div>

          <div className="p-4 rounded-card bg-white border border-neutral-200 shadow-subtle">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Sent Today
            </span>
            <p className="text-2xl font-bold text-primary-700 mt-1">
              {stats?.sentCount ?? 0}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Delivered via SMTP</p>
          </div>

          <div className="p-4 rounded-card bg-white border border-neutral-200 shadow-subtle">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Failed
            </span>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {stats?.failedCount ?? 0}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Errored deliveries</p>
          </div>

          <div className="p-4 rounded-card bg-white border border-neutral-200 shadow-subtle">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Hourly Limit
            </span>
            <p className="text-2xl font-bold text-neutral-900 mt-1">
              {stats?.usedThisHour ?? 0} / {stats?.hourlyLimit ?? 20}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Used this hour</p>
          </div>
        </div>

        {/* 12-Hour Throughput Chart */}
        <div className="p-5 rounded-card bg-white border border-neutral-200 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                12-Hour Email Dispatch Throughput
              </h3>
              <p className="text-xs text-neutral-400">
                Hourly delivered email count for {user?.email}
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-pill bg-primary-light text-primary-700">
              Live Redis Counters
            </span>
          </div>

          {/* Hourly Bar Columns */}
          <div className="h-40 flex items-end gap-2 pt-6 pb-2 border-b border-neutral-100">
            {stats?.chartPoints.map((point, idx) => {
              const heightPct = Math.max(8, Math.round((point.count / maxVal) * 100));
              const label = new Date(point.timestamp).toLocaleTimeString([], {
                hour: 'numeric',
              });
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[28px] bg-primary-700/80 group-hover:bg-primary-700 rounded-t transition-all relative"
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      {point.count}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* System & Worker Status */}
        <div className="p-5 rounded-card bg-white border border-neutral-200 shadow-subtle">
          <h3 className="text-sm font-bold text-neutral-900 mb-3">
            Infrastructure Health Status
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
              <span className="text-neutral-600 font-medium">BullMQ Worker</span>
              <span className="font-semibold text-primary-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {health?.services?.worker === 'sleeping' ? 'Render Sleep' : 'Active'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
              <span className="text-neutral-600 font-medium">Upstash Redis</span>
              <span className="font-semibold text-primary-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {health?.services?.redis || 'OK'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
              <span className="text-neutral-600 font-medium">Neon PostgreSQL</span>
              <span className="font-semibold text-primary-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {health?.services?.database || 'OK'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
