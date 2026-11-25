'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight,
  ExternalLink,
  Plus,
  Upload,
  RefreshCw,
  Server,
  Database,
  Search,
  Sparkles,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useDashboard } from './layout';
import { api } from '../../lib/api';
import { CampaignItem, CampaignDetail, EmailItem } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Drawer } from '../../components/ui/Drawer';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

export default function DashboardOverviewPage() {
  const router = useRouter();
  const { user, sender, stats, health, refreshStats, isRefreshing } = useDashboard();

  // Campaigns list state
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);

  // Campaign Detail Drawer state
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignDetail, setCampaignDetail] = useState<CampaignDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Load user campaigns
  const loadCampaigns = async (silent = false) => {
    if (!silent) setIsLoadingCampaigns(true);
    try {
      const res = await api.getCampaigns();
      setCampaigns(res.data || []);
    } catch {
      // Ignored for non-blocking
    } finally {
      if (!silent) setIsLoadingCampaigns(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
    const timer = setInterval(() => loadCampaigns(true), 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch campaign details on selection
  const handleOpenCampaign = async (id: string) => {
    setSelectedCampaignId(id);
    setIsLoadingDetail(true);
    try {
      const res = await api.getCampaign(id);
      setCampaignDetail(res.data);
    } catch {
      // Ignored
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Format local timestamps nicely
  const formatLocalTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Check if completely empty
  const isZeroData = useMemo(() => {
    if (!stats) return false;
    return stats.scheduledCount === 0 && stats.sentCount === 0 && stats.failedCount === 0 && campaigns.length === 0;
  }, [stats, campaigns]);

  // Chart coordinate calculations (smooth SVG cubic bezier)
  const chartData = useMemo(() => {
    const rawPoints = stats?.chartPoints || [];
    // Ensure 12 points
    const points = rawPoints.length > 0 ? rawPoints : Array.from({ length: 12 }).map((_, i) => ({
      timestamp: new Date(Date.now() - (11 - i) * 3600000).toISOString(),
      count: 0,
    }));

    const maxCount = Math.max(...points.map((p) => p.count), 5);
    const width = 600;
    const height = 150;
    const stepX = width / (points.length - 1 || 1);

    const coords = points.map((p, idx) => ({
      x: idx * stepX,
      y: height - 20 - (p.count / maxCount) * (height - 40),
      count: p.count,
      label: new Date(p.timestamp).toLocaleTimeString([], { hour: 'numeric' }),
    }));

    // Generate smooth cubic bezier SVG path
    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cx1 = p0.x + (p1.x - p0.x) / 2;
      const cy1 = p0.y;
      const cx2 = p0.x + (p1.x - p0.x) / 2;
      const cy2 = p1.y;
      pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p1.x} ${p1.y}`;
    }

    const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

    return { coords, pathD, areaD, maxCount };
  }, [stats?.chartPoints]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Greeting & Quick Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Welcome back, {user ? user.name.split(' ')[0] : 'there'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Real-time delivery telemetry, rate-limit utilization, and dispatch queue state.
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2.5">
          <Link href="/compose">
            <Button
              size="sm"
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-md shadow-indigo-500/20 text-xs py-2 px-3.5 rounded-xl"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Campaign
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshStats()}
            disabled={isRefreshing}
            className="border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs py-2 px-3 rounded-xl"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* 2. Four Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Scheduled in queue */}
        <Card className="rounded-2xl border-neutral-200/80 dark:border-neutral-800/80 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Scheduled in Queue
              </p>
              <div className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white mt-1">
                {stats ? stats.scheduledCount : <Skeleton className="h-8 w-16" />}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                Emails queued for delivery
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Sent successfully */}
        <Card className="rounded-2xl border-neutral-200/80 dark:border-neutral-800/80 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Sent Successfully
              </p>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {stats ? stats.sentCount : <Skeleton className="h-8 w-16" />}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                Delivered via SMTP
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Failed / dead-letter */}
        <Card className="rounded-2xl border-neutral-200/80 dark:border-neutral-800/80 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Failed / Dead-Letter
              </p>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {stats ? stats.failedCount : <Skeleton className="h-8 w-16" />}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                Exhausted retries or rejected
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Next send time */}
        <Card className="rounded-2xl border-neutral-200/80 dark:border-neutral-800/80 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Next Send Time
              </p>
              <div className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white mt-1 truncate">
                {stats ? (
                  stats.nextSendTime ? (
                    formatLocalTime(stats.nextSendTime)
                  ) : (
                    'Queue idle'
                  )
                ) : (
                  <Skeleton className="h-8 w-24" />
                )}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 truncate">
                {stats?.nextSendTime ? 'Automated BullMQ dispatch' : 'No upcoming delayed jobs'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-xs shrink-0">
              <Send className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Middle Section: Sender Hourly Limit & Sent per Hour Area Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (1 span): Sender Hourly Limit Card */}
        <Card className="rounded-2xl border-neutral-200/80 dark:border-neutral-800/80 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <CardTitle className="text-sm font-bold">Sender Hourly Limit</CardTitle>
              </div>
              <Badge variant="neutral" size="sm">
                Active Cap
              </Badge>
            </div>
            <CardDescription className="text-xs mt-1">
              Atomic Redis INCR token bucket per sender
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Sender Address */}
            <div className="p-2.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60">
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                Target Sender
              </span>
              <p className="text-xs font-mono font-semibold text-neutral-800 dark:text-neutral-200 truncate mt-0.5" title={sender?.email || stats?.senderEmail || ''}>
                {sender?.email || stats?.senderEmail || 'Provisioning Ethereal Sender...'}
              </p>
            </div>

            {/* Limit Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-neutral-600 dark:text-neutral-400">
                  {stats?.usedThisHour ?? 0} / {stats?.hourlyLimit ?? 20} sent this hour
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                  {Math.round(((stats?.usedThisHour ?? 0) / (stats?.hourlyLimit || 20)) * 100)}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(((stats?.usedThisHour ?? 0) / (stats?.hourlyLimit || 20)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Info Note: Rollover guarantee */}
            <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 text-[11px] text-indigo-950 dark:text-indigo-200 leading-relaxed">
              <p className="font-semibold text-indigo-800 dark:text-indigo-300 mb-0.5">
                🛡️ Zero-Drop Guarantee
              </p>
              When the hourly limit is reached, jobs automatically roll over into the next available hour in chronological order — zero drops or double sends.
            </div>
          </CardContent>
        </Card>

        {/* Right Column (2 spans): Emails Sent per Hour Smooth Area Chart */}
        <Card className="rounded-2xl border-neutral-200/80 dark:border-neutral-800/80 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Emails Sent per Hour</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Last 12 hours delivery activity in your local timezone
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live 10s auto-refresh
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="relative w-full h-40">
              <svg viewBox="0 0 600 150" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line x1="0" y1="35" x2="600" y2="35" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />
                <line x1="0" y1="75" x2="600" y2="75" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />
                <line x1="0" y1="115" x2="600" y2="115" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />

                {/* Area Gradient Fill */}
                <path d={chartData.areaD} fill="url(#areaGradient)" />

                {/* Smooth Curve Stroke */}
                <path
                  d={chartData.pathD}
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points with Tooltips */}
                {chartData.coords.map((pt, i) => (
                  <g key={i} className="group cursor-pointer">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      className="fill-white dark:fill-neutral-900 stroke-indigo-600 stroke-2 group-hover:r-6 transition-all"
                    />
                    {/* Hover text label */}
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      textAnchor="middle"
                      className="text-[10px] font-mono fill-indigo-600 dark:fill-indigo-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {pt.count} sent
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* X-axis Hour Labels */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
              {chartData.coords.map((pt, i) => (
                <span key={i} className={i % 2 === 0 ? 'inline' : 'hidden sm:inline'}>
                  {pt.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Bottom Section: Recent Campaigns, Queue Engine Health, Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2 spans): Recent Campaigns */}
        <Card className="rounded-2xl border-neutral-200/80 dark:border-neutral-800/80 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">Recent Campaigns</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Staggered execution and delivery progress
              </CardDescription>
            </div>
            <Link
              href="/dashboard/campaigns"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 inline-flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>

          <CardContent className="p-0">
            {isLoadingCampaigns ? (
              <div className="p-5 space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Layers className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  No campaigns yet
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                  Create your first email campaign to begin staggered, rate-limited delivery with live queue monitoring.
                </p>
                <Link href="/compose" className="mt-4 inline-block">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs py-1.5 px-3">
                    Create Campaign
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {campaigns.slice(0, 5).map((camp) => (
                  <div
                    key={camp.id}
                    onClick={() => handleOpenCampaign(camp.id)}
                    className="p-4 sm:px-6 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-white truncate">
                          {camp.subject}
                        </span>
                        <Badge
                          variant={
                            camp.status === 'completed'
                              ? 'sent'
                              : camp.status === 'scheduled'
                              ? 'scheduled'
                              : 'primary'
                          }
                          size="sm"
                        >
                          {camp.status || 'Active'}
                        </Badge>
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-[11px] text-neutral-400 dark:text-neutral-500">
                        <span>Created {formatLocalTime(camp.created_at)}</span>
                        <span>&bull;</span>
                        <span>{camp.total} recipients</span>
                        <span>&bull;</span>
                        <span>{camp.delay_seconds}s stagger delay</span>
                      </div>
                    </div>

                    {/* Progress Bar & Open Chevron */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 sm:w-32 hidden sm:block">
                        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                          <span className="text-neutral-500 dark:text-neutral-400">
                            {camp.sent}/{camp.total}
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                            {camp.progress}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                            style={{ width: `${camp.progress}%` }}
                          />
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column (1 span): Queue Engine Health & Quick Actions */}
        <div className="space-y-5">
          {/* Queue Health Card */}
          <Card className="rounded-2xl border-neutral-200/80 dark:border-neutral-800/80 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Queue Health</CardTitle>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                  Telemetry
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {/* Worker */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 text-xs">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-500" />
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    BullMQ Worker
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {health?.services?.worker === 'online' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Sleeping
                    </span>
                  )}
                </div>
              </div>

              {/* Upstash Redis */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 text-xs">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    Upstash Redis TLS
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>

              {/* Database Neon */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 text-xs">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    Neon Postgres
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>

              {/* Elasticsearch */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 text-xs">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    Search Index
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                  Elastic / DB
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="rounded-2xl border-neutral-200/80 dark:border-neutral-800/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <Link href="/compose" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs rounded-xl border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  leftIcon={<Plus className="w-3.5 h-3.5 text-indigo-600" />}
                >
                  Create New Campaign
                </Button>
              </Link>
              <Link href="/compose" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs rounded-xl border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  leftIcon={<Upload className="w-3.5 h-3.5 text-purple-600" />}
                >
                  Upload CSV Recipient List
                </Button>
              </Link>
              <Link href="/dashboard/integrations" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs rounded-xl border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  leftIcon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
                >
                  Configure Slack Webhooks
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 5. Campaign Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedCampaignId)}
        onClose={() => {
          setSelectedCampaignId(null);
          setCampaignDetail(null);
        }}
        title={campaignDetail?.subject || 'Campaign Details'}
        description={
          campaignDetail
            ? `Created ${formatLocalTime(campaignDetail.created_at)} &bull; ${campaignDetail.total} recipients`
            : 'Loading campaign details...'
        }
      >
        {isLoadingDetail || !campaignDetail ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 text-center">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Total</span>
                <p className="text-lg font-black text-neutral-900 dark:text-white">{campaignDetail.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-600">Sent</span>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{campaignDetail.sent}</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 text-center">
                <span className="text-[10px] uppercase font-bold text-indigo-600">Pending</span>
                <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">{campaignDetail.scheduled}</p>
              </div>
            </div>

            {/* Email Body Preview */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Email Content
              </span>
              <div
                className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-xs text-neutral-800 dark:text-neutral-200 max-h-48 overflow-y-auto prose dark:prose-invert prose-xs"
                dangerouslySetInnerHTML={{ __html: campaignDetail.body }}
              />
            </div>

            {/* Recipient Emails List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Recipient Dispatch Queue ({campaignDetail.emails?.length || 0})
                </span>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-800 max-h-72 overflow-y-auto">
                {campaignDetail.emails && campaignDetail.emails.length > 0 ? (
                  campaignDetail.emails.map((em) => (
                    <div
                      key={em.id}
                      onClick={() => router.push(`/dashboard/email/${em.id}`)}
                      className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                          {em.recipient}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {em.status === 'sent' ? `Sent at ${formatLocalTime(em.sent_at || em.scheduled_at)}` : `Scheduled for ${formatLocalTime(em.scheduled_at)}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={
                            em.status === 'sent'
                              ? 'sent'
                              : em.status === 'scheduled'
                              ? 'scheduled'
                              : 'failed'
                          }
                          size="sm"
                        >
                          {em.status}
                        </Badge>
                        {em.preview_url && (
                          <a
                            href={em.preview_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-indigo-600 hover:text-indigo-800"
                            title="Preview Ethereal email"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-xs text-neutral-400 text-center">No individual recipient records found.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
