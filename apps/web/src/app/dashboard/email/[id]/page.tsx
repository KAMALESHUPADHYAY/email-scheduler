'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Archive,
  Trash2,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { EmailItem } from '../../../../types';
import { api } from '../../../../lib/api';
import { useDashboard } from '../../layout';
import { Avatar } from '../../../../components/ui/Avatar';
import { IconButton } from '../../../../components/ui/IconButton';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { Badge } from '../../../../components/ui/Badge';

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const emailId = params?.id as string;
  const { user } = useDashboard();

  const [email, setEmail] = useState<EmailItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarred, setIsStarred] = useState(false);

  useEffect(() => {
    if (!emailId) return;
    setIsLoading(true);
    api
      .getEmail(emailId)
      .then((res) => {
        setEmail(res.data);
        setIsStarred(!!res.data.is_starred);
      })
      .catch((err) => {
        setError(err.message || 'Email not found');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [emailId]);

  const handleToggleStar = async () => {
    if (!email) return;
    const nextState = !isStarred;
    setIsStarred(nextState);
    try {
      await api.starEmail(email.id);
    } catch {
      setIsStarred(!nextState);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-6 w-72" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-card mt-6" />
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-red-600 font-medium">{error || 'Email not found.'}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-3 text-xs text-primary-700 font-semibold hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col h-full bg-white dark:bg-neutral-900 select-none">
      {/* 1. Email Header Bar */}
      <div className="h-14 border-b border-neutral-200 dark:border-neutral-800 px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <IconButton
            aria-label="Back to emails list"
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 text-neutral-600" />
          </IconButton>

          <h1 className="text-sm sm:text-base font-bold text-neutral-900 truncate">
            {email.subject}
          </h1>

          {email.status === 'scheduled' ? (
            <Badge variant="scheduled" icon size="sm">
              Scheduled
            </Badge>
          ) : email.status === 'sent' ? (
            <Badge variant="sent" size="sm">
              Sent
            </Badge>
          ) : (
            <Badge variant="failed" size="sm">
              Failed
            </Badge>
          )}
        </div>

        {/* Action icons + user avatar */}
        <div className="flex items-center gap-1 shrink-0">
          <IconButton
            aria-label={isStarred ? 'Unstar email' : 'Star email'}
            variant="ghost"
            size="sm"
            onClick={handleToggleStar}
          >
            <Star
              className={`w-4 h-4 ${
                isStarred ? 'fill-amber-400 text-amber-500' : 'text-neutral-400'
              }`}
            />
          </IconButton>

          <IconButton
            aria-label="Archive (Coming soon)"
            variant="ghost"
            size="sm"
            disabled
            className="opacity-40"
          >
            <Archive className="w-4 h-4 text-neutral-400" />
          </IconButton>

          <IconButton
            aria-label="Delete (Coming soon)"
            variant="ghost"
            size="sm"
            disabled
            className="opacity-40"
          >
            <Trash2 className="w-4 h-4 text-neutral-400" />
          </IconButton>

          <div className="h-5 w-px bg-neutral-200 mx-1" />

          <Avatar
            src={user?.avatarUrl || user?.avatar_url}
            name={user?.name || 'User'}
            size="sm"
          />
        </div>
      </div>

      {/* 2. Sender / Recipient Block */}
      <div className="p-4 sm:p-6 border-b border-neutral-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-800 font-bold flex items-center justify-center text-sm shrink-0 border border-primary-200">
            {email.sender?.email ? email.sender.email[0].toUpperCase() : 'S'}
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-neutral-900">
                {user?.name || 'Outbox Sender'}
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                &lt;{email.sender?.email || 'sender@outbox.test'}&gt;
              </span>
            </div>

            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <span>to {email.recipient}</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-xs font-medium text-neutral-500">
            {formatDate(email.sent_at || email.scheduled_at)}
          </p>
          {email.preview_url && (
            <a
              href={email.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:underline mt-1 bg-primary-light px-2 py-0.5 rounded-pill"
            >
              <span>View Ethereal Preview</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* 3. Sanitized HTML Email Body */}
      <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
        <div
          className="prose prose-sm max-w-none text-neutral-800 text-xs sm:text-sm leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: email.body || '<p class="text-neutral-400 italic">No content</p>',
          }}
        />
      </div>
    </div>
  );
}
