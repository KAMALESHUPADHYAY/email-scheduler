'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  LayoutDashboard,
  Layers,
  Inbox,
  CheckCheck,
  Settings2,
  Plus,
  Search,
  ExternalLink,
  Copy,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Slack,
  Database,
  Server,
  Activity,
  BarChart3,
  Calendar,
  Sparkles,
  ArrowUpDown,
  X,
  RefreshCw,
  Mail,
} from 'lucide-react';
import {
  User,
  Sender,
  EmailItem,
  CampaignItem,
  CampaignDetail,
  HealthResponse,
} from '../../types';
import { api, API_BASE_URL } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Drawer } from '../../components/ui/Drawer';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton, TableSkeleton } from '../../components/ui/Skeleton';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { ComposeModal } from '../../components/ComposeModal';

type NavTab = 'overview' | 'campaigns' | 'scheduled' | 'sent' | 'integrations';

export default function DashboardPage() {
  const router = useRouter();

  // User & System State
  const [user, setUser] = useState<User | null>(null);
  const [sender, setSender] = useState<Sender | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');

  // Emails Table State
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [allEmailsCache, setAllEmailsCache] = useState<EmailItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoadingEmails, setIsLoadingEmails] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchSource, setSearchSource] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'scheduled_at' | 'recipient' | 'subject'>('scheduled_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFilter, setDateFilter] = useState('');

  // Campaigns State
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);

  // Modals & Drawers
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignDetail, setCampaignDetail] = useState<CampaignDetail | null>(null);
  const [isLoadingCampaignDetail, setIsLoadingCampaignDetail] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load User & Sender profile
  useEffect(() => {
    api
      .getMe()
      .then((res) => {
        setUser(res.user);
        setSender(res.sender);
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  // Poll Health endpoint every 15s
  useEffect(() => {
    const fetchHealth = () => {
      api
        .getHealth()
        .then((res) => setHealth(res))
        .catch(() => {});
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Emails
  const fetchEmails = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setIsLoadingEmails(true);
      else setIsRefreshing(true);

      try {
        const tableStatus = activeTab === 'sent' ? 'sent' : 'scheduled';
        if (debouncedQuery.trim()) {
          const res = await api.searchEmails(debouncedQuery, tableStatus, page, 15);
          setEmails(res.data);
          setTotalCount(res.pagination?.total || 0);
          setTotalPages(res.pagination?.totalPages || 1);
          setSearchSource(res.source);
        } else {
          const res = await api.getEmails(tableStatus, page, 15);
          setEmails(res.data);
          setTotalCount(res.pagination?.total || 0);
          setTotalPages(res.pagination?.totalPages || 1);
          setSearchSource(null);
        }
      } catch {
        // Error handled via custom toast event in api client
      } finally {
        setIsLoadingEmails(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, debouncedQuery, page]
  );

  // Fetch Campaigns
  const fetchCampaigns = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoadingCampaigns(true);
    try {
      const res = await api.getCampaigns();
      setCampaigns(res.data);
    } catch {
      // Ignored
    } finally {
      setIsLoadingCampaigns(false);
    }
  }, []);

  // Fetch All Emails for Overview Stats
  const fetchOverviewData = useCallback(async () => {
    try {
      const [schedRes, sentRes] = await Promise.all([
        api.getEmails('scheduled', 1, 100),
        api.getEmails('sent', 1, 100),
      ]);
      setAllEmailsCache([...schedRes.data, ...sentRes.data]);
    } catch {
      // Ignored
    }
  }, []);

  // Primary Data Loading effect
  useEffect(() => {
    if (!user) return;

    if (activeTab === 'overview') {
      fetchOverviewData();
      fetchCampaigns(true);
    } else if (activeTab === 'campaigns') {
      fetchCampaigns();
    } else if (activeTab === 'scheduled' || activeTab === 'sent') {
      fetchEmails();
    }
  }, [user, activeTab, fetchEmails, fetchCampaigns, fetchOverviewData]);

  // Silent Auto-refresh every 10 seconds without UI flicker
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (activeTab === 'overview') {
        fetchOverviewData();
        fetchCampaigns(true);
      } else if (activeTab === 'campaigns') {
        fetchCampaigns(true);
      } else if (activeTab === 'scheduled' || activeTab === 'sent') {
        fetchEmails(true);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [user, activeTab, fetchEmails, fetchCampaigns, fetchOverviewData]);

  // Fetch Campaign Detail when ID is selected
  useEffect(() => {
    if (!selectedCampaignId) {
      setCampaignDetail(null);
      return;
    }
    setIsLoadingCampaignDetail(true);
    api
      .getCampaign(selectedCampaignId)
      .then((res) => setCampaignDetail(res.data))
      .catch(() => {})
      .finally(() => setIsLoadingCampaignDetail(false));
  }, [selectedCampaignId]);

  // Logout handler
  const handleLogout = async () => {
    try {
      await api.logout();
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  // Copy Preview URL with Toast
  const handleCopyPreview = (url: string) => {
    navigator.clipboard.writeText(url);
    window.dispatchEvent(
      new CustomEvent('app-toast', {
        detail: { type: 'success', message: 'Ethereal preview URL copied to clipboard!' },
      })
    );
  };

  // Overview Statistics Calculations
  const overviewStats = useMemo(() => {
    const scheduled = allEmailsCache.filter((e) => e.status === 'scheduled');
    const sent = allEmailsCache.filter((e) => e.status === 'sent');
    const failed = allEmailsCache.filter((e) => e.status === 'failed');

    // Find next send time
    const sortedScheduled = [...scheduled].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
    const nextSend = sortedScheduled.length > 0 ? sortedScheduled[0].scheduled_at : null;

    // Sent in the last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const sentThisHour = sent.filter((e) => e.sent_at && new Date(e.sent_at).getTime() > oneHourAgo).length;

    // Hourly distribution for pure SVG chart
    const hoursMap: { [hour: string]: number } = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.now() - i * 3600 * 1000);
      const label = d.getHours() + ':00';
      hoursMap[label] = 0;
    }

    sent.forEach((e) => {
      if (e.sent_at) {
        const d = new Date(e.sent_at);
        const label = d.getHours() + ':00';
        if (hoursMap[label] !== undefined) {
          hoursMap[label]++;
        }
      }
    });

    const chartPoints = Object.entries(hoursMap).map(([hour, count]) => ({ hour, count }));

    return {
      scheduledCount: scheduled.length,
      sentCount: sent.length,
      failedCount: failed.length,
      nextSendTime: nextSend,
      sentThisHour,
      chartPoints,
    };
  }, [allEmailsCache]);

  // Filtered & Sorted Emails
  const displayEmails = useMemo(() => {
    let result = [...emails];

    if (dateFilter) {
      result = result.filter((e) => e.scheduled_at.startsWith(dateFilter));
    }

    result.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'scheduled_at') {
        valA = new Date(a.scheduled_at).getTime();
        valB = new Date(b.scheduled_at).getTime();
      } else if (sortField === 'recipient') {
        valA = a.recipient.toLowerCase();
        valB = b.recipient.toLowerCase();
      } else if (sortField === 'subject') {
        valA = a.subject.toLowerCase();
        valB = b.subject.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [emails, dateFilter, sortField, sortOrder]);

  const toggleSort = (field: 'scheduled_at' | 'recipient' | 'subject') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white animate-spin">
            <RefreshCw className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-neutral-500 tracking-wider uppercase">
            Loading MailPilot Engine...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex transition-colors duration-200">
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 border-r border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/70 backdrop-blur-md flex flex-col justify-between shrink-0 hidden md:flex z-30">
        <div>
          {/* Brand Logo */}
          <div className="h-16 px-6 border-b border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-500 flex items-center justify-center text-white shadow-sm shadow-primary-500/25">
                <Send className="w-4 h-4 -rotate-12 translate-x-0.5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-neutral-900 dark:text-white">
                  MailPilot
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300">
                  SaaS
                </span>
              </div>
            </Link>
          </div>

          {/* Quick Action Compose */}
          <div className="p-4">
            <Button
              variant="primary"
              size="md"
              className="w-full shadow-sm shadow-primary-500/20"
              onClick={() => setIsComposeOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Campaign
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-primary-50 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 font-bold shadow-subtle'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('campaigns')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'campaigns'
                  ? 'bg-primary-50 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 font-bold shadow-subtle'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4" />
                <span>Campaigns</span>
              </div>
              {campaigns.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {campaigns.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('scheduled')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-primary-50 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 font-bold shadow-subtle'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary-500" />
                <span>Scheduled Queue</span>
              </div>
              {overviewStats.scheduledCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300">
                  {overviewStats.scheduledCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sent')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'sent'
                  ? 'bg-primary-50 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 font-bold shadow-subtle'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCheck className="w-4 h-4 text-emerald-500" />
                <span>Sent History</span>
              </div>
              {overviewStats.sentCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {overviewStats.sentCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('integrations')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'integrations'
                  ? 'bg-primary-50 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 font-bold shadow-subtle'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>Integrations</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: Queue Health Widget */}
        <div className="p-4 border-t border-neutral-200/80 dark:border-neutral-800/80 space-y-3">
          <div className="p-3 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Queue Health
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-primary-500" />
                  PostgreSQL
                </span>
                <span className="font-semibold text-emerald-600 text-[11px]">
                  {health?.services.database === 'healthy' ? 'Connected' : 'Online'}
                </span>
              </div>

              <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Server className="w-3 h-3 text-amber-500" />
                  Upstash Redis
                </span>
                <span className="font-semibold text-emerald-600 text-[11px]">
                  {health?.services.redis === 'healthy' ? 'Connected' : 'Online'}
                </span>
              </div>

              <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-emerald-500" />
                  Worker Daemon
                </span>
                <span
                  className={`font-semibold text-[11px] ${
                    health?.services.worker === 'online'
                      ? 'text-emerald-600'
                      : 'text-amber-500'
                  }`}
                >
                  {health?.services.worker === 'online'
                    ? 'Online'
                    : health?.services.worker || 'Active'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between">
              <a
                href={`${API_BASE_URL}/admin/queues`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <Activity className="w-3 h-3" />
                Bull Board Admin
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20">
          {/* Active Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-neutral-900 dark:text-white capitalize">
              {activeTab === 'overview'
                ? 'Telemetry Overview'
                : activeTab === 'campaigns'
                ? 'Active Campaigns'
                : activeTab === 'scheduled'
                ? 'Scheduled Delivery Queue'
                : activeTab === 'sent'
                ? 'Sent History & Delivery Telemetry'
                : 'Integrations & SMTP'}
            </h1>
            {isRefreshing && (
              <span className="text-[11px] text-neutral-400 flex items-center gap-1 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin text-primary-500" />
                Syncing...
              </span>
            )}
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Bull Board link for quick access */}
            <a
              href={`${API_BASE_URL}/admin/queues`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-primary-500" />
              <span>Bull Board</span>
            </a>

            {/* Compose CTA */}
            <Button
              variant="primary"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setIsComposeOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Compose
            </Button>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-3 border-l border-neutral-200 dark:border-neutral-800">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-700 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-bold text-xs flex items-center justify-center">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden lg:block text-left text-xs leading-tight">
                <div className="font-bold text-neutral-800 dark:text-neutral-200 truncate max-w-[120px]">
                  {user.name}
                </div>
                <div className="text-[10px] text-neutral-400 truncate max-w-[120px]">
                  {user.email}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                aria-label="Logout"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/40 transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {(['overview', 'campaigns', 'scheduled', 'sent', 'integrations'] as NavTab[]).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'bg-primary-600 text-white'
                    : 'text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            )
          )}
        </div>

        {/* View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW                                          */}
          {/* ======================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Scheduled in Queue
                    </CardTitle>
                    <Clock className="w-4 h-4 text-primary-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-neutral-900 dark:text-white">
                      {overviewStats.scheduledCount}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      BullMQ delayed jobs awaiting dispatch
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Sent Successfully
                    </CardTitle>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      {overviewStats.sentCount}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Delivered with Ethereal SMTP telemetry
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Failed / Dead-Letter
                    </CardTitle>
                    <AlertTriangle className="w-4 h-4 text-danger-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-neutral-900 dark:text-white">
                      {overviewStats.failedCount}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      {overviewStats.failedCount === 0 ? 'Zero delivery dropouts' : 'Requires inspection'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Next Send Time
                    </CardTitle>
                    <Calendar className="w-4 h-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white truncate">
                      {overviewStats.nextSendTime
                        ? new Date(overviewStats.nextSendTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : 'Queue Idle'}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1 truncate">
                      {overviewStats.nextSendTime
                        ? new Date(overviewStats.nextSendTime).toLocaleDateString()
                        : 'No pending items'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Rate Limit Gauge & Hourly Activity Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hourly Rate Limit Progress Bar Card */}
                <Card className="lg:col-span-1 flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Sender Hourly Limit</CardTitle>
                      <Badge variant="scheduled" size="sm">
                        Redis Token Bucket
                      </Badge>
                    </div>
                    <CardDescription>
                      Atomic rate limit protecting sender reputation
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-neutral-600 dark:text-neutral-400">
                          {sender ? sender.email : user.email}
                        </span>
                        <span className="text-primary-600 dark:text-primary-400">
                          {overviewStats.sentThisHour} / {sender?.hourly_limit || 50} this hour
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-600 to-primary-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (overviewStats.sentThisHour / (sender?.hourly_limit || 50)) * 100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      <strong className="text-neutral-900 dark:text-white">Atomic shifting:</strong> When
                      limit is reached, jobs automatically delay to the start of the next hour plus
                      staggered offsets without failing.
                    </div>
                  </CardContent>
                </Card>

                {/* Pure Lightweight Responsive SVG Chart */}
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Emails Sent per Hour</CardTitle>
                      <CardDescription>
                        Delivery velocity distribution across the last 12 hours
                      </CardDescription>
                    </div>
                    <Badge variant="sent" size="sm">
                      Live Telemetry
                    </Badge>
                  </CardHeader>

                  <CardContent>
                    <div className="w-full h-48 sm:h-56 relative flex flex-col justify-end">
                      <svg
                        viewBox="0 0 600 160"
                        className="w-full h-full overflow-visible"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Chart Area Fill and Stroke */}
                        {(() => {
                          const points = overviewStats.chartPoints;
                          const max = Math.max(...points.map((p) => p.count), 5);
                          const stepX = 600 / (points.length - 1 || 1);

                          const coords = points.map((p, idx) => ({
                            x: idx * stepX,
                            y: 140 - (p.count / max) * 110,
                            count: p.count,
                            hour: p.hour,
                          }));

                          const pathD = coords.reduce(
                            (acc, pt, idx) =>
                              idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`,
                            ''
                          );

                          const areaD = `${pathD} L 600 150 L 0 150 Z`;

                          return (
                            <>
                              <path d={areaD} fill="url(#chartGradient)" />
                              <path
                                d={pathD}
                                fill="none"
                                stroke="#6366f1"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              {coords.map((pt, i) => (
                                <g key={i}>
                                  <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r="4"
                                    className="fill-white dark:fill-neutral-900 stroke-primary-600 stroke-2"
                                  />
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>

                      {/* X-Axis Hour Labels */}
                      <div className="flex justify-between pt-2 text-[10px] text-neutral-400 font-mono border-t border-neutral-200 dark:border-neutral-800">
                        {overviewStats.chartPoints.map((p, i) => (
                          <span key={i} className={i % 2 === 0 ? 'inline' : 'hidden sm:inline'}>
                            {p.hour}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions & Recent Campaigns */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Recent Campaigns
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('campaigns')}
                  >
                    View All Campaigns &rarr;
                  </Button>
                </div>

                {isLoadingCampaigns ? (
                  <TableSkeleton rows={3} />
                ) : campaigns.length === 0 ? (
                  <Card>
                    <EmptyState
                      icon={<Layers className="w-8 h-8 text-neutral-400" />}
                      title="No Campaigns Scheduled Yet"
                      description="Create your first campaign to begin dispatching staggered cold emails."
                      actionLabel="New Campaign"
                      onAction={() => setIsComposeOpen(true)}
                    />
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campaigns.slice(0, 3).map((camp) => (
                      <Card
                        key={camp.id}
                        className="hover:border-primary-500/50 cursor-pointer transition-all p-5 space-y-3"
                        onClick={() => setSelectedCampaignId(camp.id)}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold truncate max-w-[180px]">
                            {camp.subject}
                          </h4>
                          <Badge
                            variant={camp.progress === 100 ? 'sent' : 'scheduled'}
                            size="sm"
                          >
                            {camp.progress}% Done
                          </Badge>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full bg-primary-600 rounded-full"
                            style={{ width: `${camp.progress}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-neutral-500">
                          <span>{camp.total} recipients</span>
                          <span>Delay: {camp.delay_seconds}s</span>
                          <span>Limit: {camp.hourly_limit}/hr</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: CAMPAIGNS                                         */}
          {/* ======================================================== */}
          {activeTab === 'campaigns' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold">Cold Email Campaigns</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Manage multi-recipient campaigns, track progress, and inspect email logs.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsComposeOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Create Campaign
                </Button>
              </div>

              {isLoadingCampaigns ? (
                <TableSkeleton rows={5} />
              ) : campaigns.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={<Layers className="w-8 h-8 text-neutral-400" />}
                    title="No Campaigns Created"
                    description="You have not created any cold email campaigns yet. Click below to start sending."
                    actionLabel="Create First Campaign"
                    onAction={() => setIsComposeOpen(true)}
                  />
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {campaigns.map((camp) => (
                    <Card
                      key={camp.id}
                      className="hover:border-primary-500/60 transition-all flex flex-col justify-between"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant={
                              camp.progress === 100
                                ? 'sent'
                                : camp.failed > 0
                                ? 'danger'
                                : 'scheduled'
                            }
                            size="sm"
                            dot
                          >
                            {camp.progress === 100
                              ? 'Delivered'
                              : camp.progress > 0
                              ? 'Dispatching'
                              : 'Scheduled'}
                          </Badge>
                          <span className="text-[11px] font-mono text-neutral-400">
                            {new Date(camp.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <CardTitle className="text-base font-bold mt-2 truncate">
                          {camp.subject}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {camp.body}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Progress Bar & Percentage */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-neutral-500">Progress</span>
                            <span className="text-primary-600 dark:text-primary-400">
                              {camp.sent} / {camp.total} sent ({camp.progress}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary-600 to-primary-500 rounded-full"
                              style={{ width: `${camp.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Metadata Pills */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                          <div>
                            <div className="text-[10px] text-neutral-400 uppercase font-semibold">
                              Delay
                            </div>
                            <div className="font-bold text-neutral-700 dark:text-neutral-300">
                              {camp.delay_seconds}s
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-neutral-400 uppercase font-semibold">
                              Cap
                            </div>
                            <div className="font-bold text-neutral-700 dark:text-neutral-300">
                              {camp.hourly_limit}/hr
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-neutral-400 uppercase font-semibold">
                              Failed
                            </div>
                            <div className="font-bold text-neutral-700 dark:text-neutral-300">
                              {camp.failed}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setSelectedCampaignId(camp.id)}
                        >
                          View Details &amp; Recipient Emails
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3 & 4: SCHEDULED & SENT TABLES                      */}
          {/* ======================================================== */}
          {(activeTab === 'scheduled' || activeTab === 'sent') && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Search, Filter & Date Bar */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                {/* Search Box */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${activeTab} emails via Elasticsearch...`}
                    className="w-full pl-9 pr-8 py-2 rounded-lg text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-neutral-100"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Elasticsearch Source Pill */}
                  {searchSource && (
                    <Badge variant="primary" size="sm">
                      Source: {searchSource}
                    </Badge>
                  )}

                  {/* Date Filter Input */}
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />

                  {dateFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDateFilter('')}
                      className="text-xs"
                    >
                      Clear Date
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchEmails(false)}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Emails Table */}
              <Card>
                {isLoadingEmails ? (
                  <TableSkeleton rows={6} />
                ) : displayEmails.length === 0 ? (
                  <EmptyState
                    icon={<Inbox className="w-8 h-8 text-neutral-400" />}
                    title={
                      debouncedQuery
                        ? 'No Emails Match Your Search'
                        : `No ${activeTab} Emails Found`
                    }
                    description={
                      debouncedQuery
                        ? `Elasticsearch found 0 matches for "${debouncedQuery}". Try a different keyword.`
                        : `There are currently no ${activeTab} emails in the system.`
                    }
                    actionLabel={debouncedQuery ? 'Clear Search' : 'Schedule New Email'}
                    onAction={
                      debouncedQuery
                        ? () => setSearchQuery('')
                        : () => setIsComposeOpen(true)
                    }
                  />
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            className="cursor-pointer select-none"
                            onClick={() => toggleSort('recipient')}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Recipient</span>
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer select-none"
                            onClick={() => toggleSort('subject')}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Subject</span>
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer select-none"
                            onClick={() => toggleSort('scheduled_at')}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{activeTab === 'sent' ? 'Sent At' : 'Scheduled At'}</span>
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayEmails.map((item) => (
                          <TableRow
                            key={item.id}
                            className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40"
                          >
                            <TableCell className="font-mono text-xs font-semibold">
                              {item.recipient}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate font-medium">
                              {item.subject}
                            </TableCell>
                            <TableCell className="text-xs text-neutral-500 whitespace-nowrap">
                              {activeTab === 'sent' && item.sent_at
                                ? new Date(item.sent_at).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })
                                : new Date(item.scheduled_at).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  item.status === 'sent'
                                    ? 'sent'
                                    : item.status === 'failed'
                                    ? 'failed'
                                    : 'scheduled'
                                }
                                size="sm"
                                dot
                              >
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {item.preview_url && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyPreview(item.preview_url!)}
                                      title="Copy Ethereal preview link"
                                      className="p-1.5 rounded text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <a
                                      href={item.preview_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Open preview in new tab"
                                      className="p-1.5 rounded text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedEmail(item)}
                                  className="text-xs px-2 py-1"
                                >
                                  Details
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination Bar */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
                      <div>
                        Showing <strong>{displayEmails.length}</strong> of{' '}
                        <strong>{totalCount}</strong> emails
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                        >
                          Prev
                        </Button>
                        <span className="font-semibold px-2">
                          {page} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => p + 1)}
                          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: INTEGRATIONS                                      */}
          {/* ======================================================== */}
          {activeTab === 'integrations' && (
            <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
              <div>
                <h2 className="text-base font-bold">Connected Integrations</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Configure OAuth providers, Slack notifications, and Ethereal SMTP test credentials.
                </p>
              </div>

              {/* Slack Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-emerald-500">
                      <Slack className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Slack Alerts &amp; Notifications</CardTitle>
                      <CardDescription>
                        Receive delivery failure and rate limit alert webhooks in your Slack workspace.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={user.has_slack ? 'sent' : 'neutral'} dot>
                    {user.has_slack ? 'Connected' : 'Not Connected'}
                  </Badge>
                </CardHeader>

                <CardContent className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                  {user.has_slack ? (
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        Channel:{' '}
                        <strong className="text-neutral-800 dark:text-neutral-200">
                          {user.slack_channel || '#email-scheduler'}
                        </strong>
                      </div>
                      <a
                        href={`${API_BASE_URL}/auth/slack`}
                        className="text-primary-600 hover:underline font-semibold"
                      >
                        Reconnect Slack
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-neutral-500">
                        Connect a channel to receive alerts on failed dispatches.
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          window.location.href = `${API_BASE_URL}/auth/slack`;
                        }}
                        leftIcon={<Slack className="w-3.5 h-3.5" />}
                      >
                        Connect Slack
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Google OAuth Account Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Google Identity</CardTitle>
                  <CardDescription>Authenticated user profile via Google OAuth 2.0</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                  <div className="flex items-center gap-3">
                    {user.avatar_url && (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="w-12 h-12 rounded-full border border-neutral-200 dark:border-neutral-700"
                      />
                    )}
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-neutral-900 dark:text-neutral-100">
                        {user.name}
                      </div>
                      <div className="text-neutral-500">{user.email}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">ID: {user.id}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ethereal Fake SMTP Sender Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Ethereal SMTP Sandbox</CardTitle>
                    <CardDescription>
                      Safe testing inbox with deterministic email preview links
                    </CardDescription>
                  </div>
                  <a
                    href="https://ethereal.email/messages"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
                  >
                    Open Ethereal Inbox
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </CardHeader>
                <CardContent className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                      <span className="text-[10px] uppercase font-bold text-neutral-400">
                        Active Sender Email
                      </span>
                      <div className="font-mono font-bold mt-0.5">
                        {sender ? sender.email : user.email}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                      <span className="text-[10px] uppercase font-bold text-neutral-400">
                        Hourly Rate Cap
                      </span>
                      <div className="font-mono font-bold mt-0.5">
                        {sender ? `${sender.hourly_limit} emails / hr` : '50 emails / hr'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* ======================================================== */}
      {/* DRAWERS: EMAIL DETAIL & CAMPAIGN DETAIL                   */}
      {/* ======================================================== */}

      {/* 1. Email Detail Drawer */}
      <Drawer
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        title="Email Dispatch Details"
        description="Inspect delivery status, headers, and preview link."
      >
        {selectedEmail && (
          <div className="space-y-5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <span className="font-bold text-neutral-500 uppercase tracking-wider">
                Current Status
              </span>
              <Badge
                variant={
                  selectedEmail.status === 'sent'
                    ? 'sent'
                    : selectedEmail.status === 'failed'
                    ? 'failed'
                    : 'scheduled'
                }
                size="md"
                dot
              >
                {selectedEmail.status}
              </Badge>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400">
                  Recipient
                </span>
                <div className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100 mt-0.5">
                  {selectedEmail.recipient}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400">
                  Subject
                </span>
                <div className="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                  {selectedEmail.subject}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-400">
                    Scheduled At
                  </span>
                  <div className="font-mono mt-0.5">
                    {new Date(selectedEmail.scheduled_at).toLocaleString()}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-400">
                    Sent At
                  </span>
                  <div className="font-mono mt-0.5">
                    {selectedEmail.sent_at
                      ? new Date(selectedEmail.sent_at).toLocaleString()
                      : 'Pending dispatch'}
                  </div>
                </div>
              </div>

              {selectedEmail.preview_url && (
                <div className="p-3.5 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/40 space-y-2">
                  <div className="font-bold text-primary-700 dark:text-primary-300">
                    Ethereal Sandbox Preview
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleCopyPreview(selectedEmail.preview_url!)}
                      leftIcon={<Copy className="w-3.5 h-3.5" />}
                    >
                      Copy Link
                    </Button>
                    <a
                      href={selectedEmail.preview_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary-300 dark:border-primary-700 hover:bg-primary-100 dark:hover:bg-primary-900"
                    >
                      Open Email
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {selectedEmail.error && (
                <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-950/60 border border-danger-200 text-danger-700 text-xs">
                  <span className="font-bold">Error:</span> {selectedEmail.error}
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400">
                  Email Body Content
                </span>
                <div className="mt-1 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed font-sans">
                  {selectedEmail.body}
                </div>
              </div>

              <div className="pt-2 text-[10px] font-mono text-neutral-400 space-y-1">
                <div>Email ID: {selectedEmail.id}</div>
                <div>Campaign ID: {selectedEmail.campaign_id}</div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* 2. Campaign Detail Drawer */}
      <Drawer
        isOpen={!!selectedCampaignId}
        onClose={() => setSelectedCampaignId(null)}
        title={campaignDetail ? campaignDetail.subject : 'Campaign Details'}
        description="Inspect campaign recipient status breakdown and scheduled items."
        width="max-w-2xl"
      >
        {isLoadingCampaignDetail ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <TableSkeleton rows={4} />
          </div>
        ) : campaignDetail ? (
          <div className="space-y-6 text-xs">
            {/* Progress Card */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-700 dark:text-neutral-300">
                  Delivery Progress
                </span>
                <span className="font-bold text-primary-600">
                  {campaignDetail.sent} / {campaignDetail.total} delivered ({campaignDetail.progress}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                <div
                  className="h-full bg-primary-600 rounded-full"
                  style={{ width: `${campaignDetail.progress}%` }}
                />
              </div>

              <div className="grid grid-cols-4 gap-2 text-center pt-2 text-[11px]">
                <div className="p-2 rounded bg-white dark:bg-neutral-900 border">
                  <div className="text-neutral-400">Total</div>
                  <div className="font-bold mt-0.5">{campaignDetail.total}</div>
                </div>
                <div className="p-2 rounded bg-white dark:bg-neutral-900 border">
                  <div className="text-neutral-400">Scheduled</div>
                  <div className="font-bold text-primary-600 mt-0.5">
                    {campaignDetail.scheduled}
                  </div>
                </div>
                <div className="p-2 rounded bg-white dark:bg-neutral-900 border">
                  <div className="text-neutral-400">Sent</div>
                  <div className="font-bold text-emerald-600 mt-0.5">{campaignDetail.sent}</div>
                </div>
                <div className="p-2 rounded bg-white dark:bg-neutral-900 border">
                  <div className="text-neutral-400">Failed</div>
                  <div className="font-bold text-danger-600 mt-0.5">{campaignDetail.failed}</div>
                </div>
              </div>
            </div>

            {/* Campaign Emails List Table */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                Recipient Emails ({campaignDetail.emails.length})
              </div>
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Scheduled Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Preview</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignDetail.emails.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">{e.recipient}</TableCell>
                        <TableCell className="text-xs text-neutral-500 whitespace-nowrap">
                          {new Date(e.scheduled_at).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              e.status === 'sent'
                                ? 'sent'
                                : e.status === 'failed'
                                ? 'failed'
                                : 'scheduled'
                            }
                            size="sm"
                            dot
                          >
                            {e.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {e.preview_url ? (
                            <a
                              href={e.preview_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:underline font-semibold"
                            >
                              Inspect
                            </a>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* 3. Compose Campaign Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => {
          fetchEmails();
          fetchCampaigns();
          fetchOverviewData();
        }}
      />
    </div>
  );
}
