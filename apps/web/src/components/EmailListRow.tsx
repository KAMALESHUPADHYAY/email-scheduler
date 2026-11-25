'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, ExternalLink } from 'lucide-react';
import { EmailItem } from '../types';
import { Badge } from './ui/Badge';

export interface EmailListRowProps {
  email: EmailItem;
  onToggleStar?: (id: string) => void;
  isScheduled?: boolean;
}

export const EmailListRow: React.FC<EmailListRowProps> = ({
  email,
  onToggleStar,
  isScheduled = false,
}) => {
  const router = useRouter();

  const formatScheduledTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      // Format e.g. "Tue 9:15:12 AM" or "Nov 3, 10:23 AM"
      return date.toLocaleDateString([], {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const cleanPreview = (htmlOrText: string) => {
    const text = htmlOrText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 80 ? text.slice(0, 80) + '...' : text;
  };

  return (
    <div
      onClick={() => router.push(`/dashboard/email/${email.id}`)}
      className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-100 hover:bg-neutral-50/80 transition-colors cursor-pointer select-none group text-xs"
    >
      {/* 1. Recipient fixed-width column */}
      <div className="w-36 sm:w-48 shrink-0 font-medium text-neutral-800 truncate">
        To: {email.recipient}
      </div>

      {/* 2. Status Badge */}
      <div className="shrink-0">
        {isScheduled ? (
          <Badge variant="scheduled" icon size="sm">
            {formatScheduledTime(email.scheduled_at)}
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

      {/* 3. Bold Subject & Muted Preview */}
      <div className="flex-1 min-w-0 truncate text-xs">
        <span className="font-semibold text-neutral-900">
          {email.subject}
          {isScheduled ? ' - Scheduled' : ''}
        </span>
        <span className="text-neutral-500"> - {cleanPreview(email.body)}</span>
      </div>

      {/* 4. Sent Preview Link (Ethereal test mail) */}
      {!isScheduled && email.preview_url && (
        <a
          href={email.preview_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-[11px] font-medium text-primary-700 hover:underline flex items-center gap-0.5 px-2 py-0.5 rounded hover:bg-primary-light"
          title="Open rendered Ethereal email preview"
        >
          <span>Preview</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}

      {/* 5. Star / Favourite Icon Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar?.(email.id);
        }}
        className="p-1 rounded text-neutral-400 hover:text-amber-500 transition-colors focus:outline-none shrink-0"
        aria-label={email.is_starred ? 'Unstar email' : 'Star email'}
      >
        <Star
          className={`w-3.5 h-3.5 ${
            email.is_starred ? 'fill-amber-400 text-amber-500' : 'text-neutral-300 group-hover:text-neutral-400'
          }`}
        />
      </button>
    </div>
  );
};
