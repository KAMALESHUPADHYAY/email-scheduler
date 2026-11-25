'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { EmailItem } from '../../../types';
import { api } from '../../../lib/api';
import { useDashboard } from '../layout';
import { EmailListRow } from '../../../components/EmailListRow';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function SentPage() {
  const router = useRouter();
  const { searchQuery, refreshStats } = useDashboard();
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEmails = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      if (searchQuery.trim()) {
        const res = await api.searchEmails(searchQuery.trim(), 'sent', page, 30);
        setEmails(res.data);
        setTotalPages(res.pagination.totalPages);
      } else {
        const res = await api.getEmails('sent', page, 30);
        setEmails(res.data);
        setTotalPages(res.pagination.totalPages);
      }
    } catch {
      // Ignored
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [searchQuery, page]);

  useEffect(() => {
    fetchEmails(false);
  }, [fetchEmails]);

  // Auto-refresh emails every 10s without flicker
  useEffect(() => {
    const timer = setInterval(() => {
      fetchEmails(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [fetchEmails]);

  const handleToggleStar = async (id: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, is_starred: !e.is_starred } : e))
    );
    try {
      await api.starEmail(id);
    } catch {
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, is_starred: !e.is_starred } : e))
      );
    }
  };

  return (
    <div className="w-full flex flex-col min-h-full">
      {isLoading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-neutral-100">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-16 rounded-pill" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
          ))}
        </div>
      ) : emails.length === 0 ? (
        <EmptyState
          icon={<Send className="w-6 h-6 text-neutral-400" />}
          title="No sent emails"
          description={
            searchQuery
              ? `No sent emails matching "${searchQuery}".`
              : 'Delivered messages will appear here with live preview links.'
          }
          actionLabel="Compose New Email"
          onAction={() => router.push('/compose')}
        />
      ) : (
        <div className="divide-y divide-neutral-100">
          {emails.map((email) => (
            <EmailListRow
              key={email.id}
              email={email}
              isScheduled={false}
              onToggleStar={handleToggleStar}
            />
          ))}

          {totalPages > 1 && page < totalPages && (
            <div className="p-4 text-center">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="text-xs text-primary-700 font-semibold hover:underline"
              >
                Load more emails...
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
