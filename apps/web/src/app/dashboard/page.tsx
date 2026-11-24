'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Send,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { User, Sender, EmailItem } from '../../types';
import { api, API_BASE_URL } from '../../lib/api';
import { DashboardHeader } from '../../components/DashboardHeader';
import { ComposeModal } from '../../components/ComposeModal';
import { Table, Column } from '../../components/ui/Table';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sender, setSender] = useState<Sender | null>(null);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchSource, setSearchSource] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load user profile
  useEffect(() => {
    api
      .getMe()
      .then((res) => {
        setUser(res.user);
        setSender(res.sender);
      })
      .catch(() => {
        router.push('/');
      });
  }, [router]);

  // Fetch emails according to activeTab, search query, and pagination
  const fetchEmails = useCallback(async () => {
    setIsLoading(true);
    try {
      if (debouncedQuery.trim()) {
        const res = await api.searchEmails(debouncedQuery, activeTab, page, 15);
        setEmails(res.data);
        setTotalCount(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
        setSearchSource(res.source);
      } else {
        const res = await api.getEmails(activeTab, page, 15);
        setEmails(res.data);
        setTotalCount(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
        setSearchSource(null);
      }
    } catch {
      // Handled via toast
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, debouncedQuery, page]);

  useEffect(() => {
    if (user) {
      fetchEmails();
    }
  }, [user, fetchEmails]);

  // Auto-refresh scheduled tab every 8 seconds to see real-time updates as worker delivers emails
  useEffect(() => {
    if (activeTab === 'scheduled') {
      const interval = setInterval(() => {
        fetchEmails();
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchEmails]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      router.push('/');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-surface-500">Loading session...</p>
        </div>
      </div>
    );
  }

  // Define Columns for Scheduled Emails
  const scheduledColumns: Column<EmailItem>[] = [
    {
      header: 'Recipient',
      cell: (item) => (
        <span className="font-semibold text-surface-900 dark:text-surface-100">
          {item.recipient}
        </span>
      ),
    },
    {
      header: 'Subject',
      cell: (item) => (
        <div className="max-w-md truncate text-surface-700 dark:text-surface-300">
          {item.subject}
        </div>
      ),
    },
    {
      header: 'Scheduled Time',
      cell: (item) => {
        const date = new Date(item.scheduled_at);
        return (
          <span className="text-xs text-surface-600 dark:text-surface-400 font-mono">
            {date.toLocaleString()}
          </span>
        );
      },
    },
    {
      header: 'Status',
      cell: (item) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <Clock className="w-3 h-3 mr-1" />
          Scheduled
        </span>
      ),
    },
  ];

  // Define Columns for Sent/Failed Emails
  const sentColumns: Column<EmailItem>[] = [
    {
      header: 'Recipient',
      cell: (item) => (
        <span className="font-semibold text-surface-900 dark:text-surface-100">
          {item.recipient}
        </span>
      ),
    },
    {
      header: 'Subject',
      cell: (item) => (
        <div className="max-w-md truncate text-surface-700 dark:text-surface-300">
          {item.subject}
        </div>
      ),
    },
    {
      header: 'Sent Time',
      cell: (item) => {
        const date = item.sent_at ? new Date(item.sent_at) : new Date(item.created_at);
        return (
          <span className="text-xs text-surface-600 dark:text-surface-400 font-mono">
            {date.toLocaleString()}
          </span>
        );
      },
    },
    {
      header: 'Status',
      cell: (item) =>
        item.status === 'sent' ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Send className="w-3 h-3 mr-1" />
            Sent
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </span>
        ),
    },
    {
      header: 'Preview / Action',
      cell: (item) =>
        item.preview_url ? (
          <a
            href={item.preview_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            View Ethereal Email
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        ) : item.error ? (
          <span className="text-xs text-red-500 font-mono" title={item.error}>
            {item.error.slice(0, 30)}...
          </span>
        ) : (
          <span className="text-xs text-surface-400">-</span>
        ),
    },
  ];

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 flex flex-col">
      <DashboardHeader
        user={user}
        sender={sender}
        onOpenCompose={() => setIsComposeOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs & Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-surface-200 dark:border-surface-800">
          {/* Tabs */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setActiveTab('scheduled');
                setPage(1);
              }}
              className={`flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`}
            >
              <Clock className="w-4 h-4 mr-2" />
              Scheduled Emails
            </button>
            <button
              onClick={() => {
                setActiveTab('sent');
                setPage(1);
              }}
              className={`flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'sent'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`}
            >
              <Send className="w-4 h-4 mr-2" />
              Sent Delivery Log
            </button>
          </div>

          {/* Search Box & Refresh */}
          <div className="flex items-center space-x-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Search recipient, subject, body..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEmails()}
              title="Refresh Queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Search Engine Source Indicator */}
        {searchSource && (
          <div className="text-[11px] text-surface-500 flex items-center space-x-1">
            <span>Search backend:</span>
            <span className="font-mono px-1.5 py-0.5 rounded bg-surface-200 dark:bg-surface-800 text-surface-700 dark:text-surface-300">
              {searchSource === 'elasticsearch' ? 'Elasticsearch 8.x' : 'PostgreSQL ILIKE'}
            </span>
          </div>
        )}

        {/* Table View */}
        <Table<EmailItem>
          columns={activeTab === 'scheduled' ? scheduledColumns : sentColumns}
          data={emails}
          isLoading={isLoading}
          rowKey={(item) => item.id}
          emptyState={
            <EmptyState
              icon={<Mail className="w-8 h-8 text-surface-400" />}
              title={
                debouncedQuery
                  ? 'No matching emails found'
                  : activeTab === 'scheduled'
                  ? 'No scheduled emails in queue'
                  : 'No sent emails yet'
              }
              description={
                debouncedQuery
                  ? 'Try broadening your search term or clearing the filter.'
                  : activeTab === 'scheduled'
                  ? 'Compose an email campaign with CSV or email rows to schedule delayed jobs.'
                  : 'Once scheduled emails reach their execution time, they will appear here with Ethereal preview links.'
              }
              action={
                activeTab === 'scheduled' && !debouncedQuery ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsComposeOpen(true)}
                  >
                    Compose First Email
                  </Button>
                ) : undefined
              }
            />
          }
        />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-surface-500">
              Showing page <span className="font-semibold">{page}</span> of{' '}
              <span className="font-semibold">{totalPages}</span> ({totalCount} total)
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => {
          setActiveTab('scheduled');
          setPage(1);
          fetchEmails();
        }}
      />
    </div>
  );
}
