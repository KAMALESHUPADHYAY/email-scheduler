'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Upload,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { api } from '../../lib/api';
import { User, Sender } from '../../types';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Chip } from '../../components/ui/Chip';
import { Popover } from '../../components/ui/Popover';
import { RichTextEditor } from '../../components/ui/RichTextEditor';

export default function ComposePage() {
  const router = useRouter();

  // User & Sender State
  const [user, setUser] = useState<User | null>(null);
  const [sender, setSender] = useState<Sender | null>(null);

  // Form State
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyPlainText, setBodyPlainText] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(20);

  // Scheduling Date State
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  // CSV Upload Validation State
  const [csvStats, setCsvStats] = useState<{
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
  } | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user on mount
  useEffect(() => {
    api
      .getMe()
      .then((res) => {
        setUser(res.user);
        setSender(res.sender);
        if (res.sender?.hourly_limit) {
          setHourlyLimit(res.sender.hourly_limit);
        }
      })
      .catch(() => {
        router.push('/login');
      });

    // Default scheduled time to 2 minutes from now
    const defaultTime = new Date(Date.now() + 2 * 60 * 1000);
    // Format YYYY-MM-DDTHH:mm for datetime-local input
    const localIso = new Date(defaultTime.getTime() - defaultTime.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setScheduledDate(localIso);
  }, [router]);

  // Handle adding recipient from text input
  const handleAddRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = recipientInput.trim().replace(/,/g, '').toLowerCase();
      if (clean && clean.includes('@') && !recipients.includes(clean)) {
        setRecipients([...recipients, clean]);
        setRecipientInput('');
      }
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  // CSV parsing
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validSet = new Set<string>();
      let invalidCount = 0;
      let duplicateCount = 0;

      for (const line of lines) {
        // Support CSV columns by splitting by comma
        const tokens = line.split(',');
        for (const token of tokens) {
          const trimmed = token.trim().toLowerCase();
          if (!trimmed) continue;
          if (emailRegex.test(trimmed)) {
            if (validSet.has(trimmed) || recipients.includes(trimmed)) {
              duplicateCount++;
            } else {
              validSet.add(trimmed);
            }
          } else {
            invalidCount++;
          }
        }
      }

      const newRecipients = Array.from(validSet);
      setRecipients([...recipients, ...newRecipients]);
      setCsvStats({
        total: lines.length,
        valid: newRecipients.length,
        invalid: invalidCount,
        duplicates: duplicateCount,
      });
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit Schedule Request
  const handleSendLater = async () => {
    setErrorMessage(null);

    if (recipients.length === 0) {
      setErrorMessage('Please add at least one recipient email.');
      return;
    }
    if (!subject.trim()) {
      setErrorMessage('Subject is required.');
      return;
    }
    if (!bodyHtml.trim()) {
      setErrorMessage('Email body cannot be empty.');
      return;
    }

    if (!scheduledDate) {
      setIsTimePickerOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('subject', subject.trim());
      formData.append('body', bodyHtml);
      formData.append('recipients', JSON.stringify(recipients));
      // Convert user's local date input to exact UTC ISO string
      formData.append('start_time', new Date(scheduledDate).toISOString());
      formData.append('delay_seconds', String(delaySeconds || 2));
      formData.append('hourly_limit', String(hourlyLimit || 20));

      await api.createCampaign(formData);
      router.push('/dashboard/scheduled');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to schedule campaign. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Immediate Send Request
  const handleSendNow = async () => {
    setErrorMessage(null);

    if (recipients.length === 0) {
      setErrorMessage('Please add at least one recipient email.');
      return;
    }
    if (!subject.trim()) {
      setErrorMessage('Subject is required.');
      return;
    }
    if (!bodyHtml.trim()) {
      setErrorMessage('Email body cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('subject', subject.trim());
      formData.append('body', bodyHtml);
      formData.append('recipients', JSON.stringify(recipients));
      // Immediate start time: first email scheduled immediately, others staggered
      formData.append('start_time', new Date().toISOString());
      formData.append('delay_seconds', String(delaySeconds || 2));
      formData.append('hourly_limit', String(hourlyLimit || 20));

      await api.createCampaign(formData);
      router.push('/dashboard/scheduled');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send campaign. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 flex flex-col font-sans select-none text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* 1. Full-Page Top Header */}
      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 bg-white dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <IconButton
            aria-label="Back to dashboard"
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 text-neutral-600" />
          </IconButton>
          <h1 className="text-sm sm:text-base font-bold text-neutral-900">
            Compose New Email
          </h1>
        </div>

        {/* Right header controls: Paperclip, Clock, Send Later */}
        <div className="flex items-center gap-2">
          {/* Paperclip (Disabled with tooltip) */}
          <IconButton
            aria-label="Attachments (Coming soon)"
            variant="ghost"
            size="sm"
            disabled
            className="opacity-40"
          >
            <Paperclip className="w-4 h-4 text-neutral-500" />
          </IconButton>

          {/* Clock Popover Date Picker */}
          <Popover
            align="right"
            isOpen={isTimePickerOpen}
            onOpenChange={setIsTimePickerOpen}
            trigger={
              <button
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none"
              >
                <Clock className="w-3.5 h-3.5 text-primary-700" />
                <span className="text-[11px]">
                  {scheduledDate
                    ? new Date(scheduledDate).toLocaleTimeString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'Pick Time'}
                </span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>
            }
          >
            <div className="p-3 w-64 space-y-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
                <Calendar className="w-4 h-4 text-primary-700" />
                <span>Schedule Send Time</span>
              </div>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full text-xs p-2 rounded-input border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-700 outline-none"
              />
              <p className="text-[11px] text-neutral-400">
                Time is stored and scheduled in UTC and dispatched by the BullMQ engine.
              </p>
              <Button
                variant="solid"
                size="xs"
                className="w-full justify-center"
                onClick={() => setIsTimePickerOpen(false)}
              >
                Confirm Time
              </Button>
            </div>
          </Popover>

          {/* Send Later Button (Figma Green Outline Pill) */}
          <Button
            variant="pill"
            size="sm"
            onClick={handleSendLater}
            isLoading={isSubmitting}
            className="px-4 py-1 font-semibold text-xs border-primary-700 text-primary-700 hover:bg-primary-light"
          >
            Send Later
          </Button>

          {/* Send Now Button (Figma Solid Green Pill) */}
          <Button
            variant="solid"
            size="sm"
            onClick={handleSendNow}
            isLoading={isSubmitting}
            className="px-4 py-1 font-semibold text-xs rounded-pill"
          >
            Send now
          </Button>
        </div>
      </header>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Main Compose Form Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Row 1: From */}
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
          <span className="w-20 text-right text-xs font-medium text-neutral-400 shrink-0">
            From:
          </span>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-neutral-100 border border-neutral-200/80 text-xs font-medium text-neutral-800">
            <span>{sender?.email || user?.email || 'Loading sender...'}</span>
            <span className="text-[10px] text-neutral-400">(Ethereal SMTP)</span>
          </div>
        </div>

        {/* Row 2: To */}
        <div className="flex items-start gap-3 border-b border-neutral-100 pb-3">
          <span className="w-20 text-right text-xs font-medium text-neutral-400 shrink-0 pt-1">
            To:
          </span>
          <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[32px]">
            {recipients.map((rec) => (
              <Chip
                key={rec}
                label={rec}
                onRemove={() => handleRemoveRecipient(rec)}
              />
            ))}

            <input
              type="email"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={handleAddRecipient}
              placeholder={recipients.length === 0 ? 'Type email address and press Enter...' : 'Add another...'}
              className="text-xs text-neutral-900 placeholder-neutral-400 bg-transparent outline-none py-1 flex-1 min-w-[180px]"
            />

            {/* Green "Upload List" Link */}
            <div className="ml-auto pl-2 flex items-center gap-2 shrink-0">
              <label className="cursor-pointer text-xs font-semibold text-primary-700 hover:text-primary-800 inline-flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload List</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
              </label>

              {csvStats && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-700 bg-primary-light px-2 py-0.5 rounded-pill">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{csvStats.valid} valid</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Subject */}
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
          <span className="w-20 text-right text-xs font-medium text-neutral-400 shrink-0">
            Subject:
          </span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Campaign subject line"
            className="flex-1 text-xs sm:text-sm font-medium text-neutral-900 placeholder-neutral-400 bg-transparent outline-none py-1"
          />
        </div>

        {/* Row 4: Delay and Hourly Limit */}
        <div className="flex flex-wrap items-center gap-6 border-b border-neutral-100 pb-3 pl-24">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-medium">
              Delay between 2 emails:
            </span>
            <input
              type="number"
              min={1}
              max={300}
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Math.max(1, Number(e.target.value) || 2))}
              placeholder="00"
              className="w-16 p-1.5 text-center text-xs font-semibold bg-neutral-100 border border-neutral-200 rounded-input focus:bg-white focus:border-primary-700 outline-none"
            />
            <span className="text-xs text-neutral-400">sec</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-medium">
              Hourly Limit:
            </span>
            <input
              type="number"
              min={1}
              max={500}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Math.max(1, Number(e.target.value) || 20))}
              placeholder="00"
              className="w-16 p-1.5 text-center text-xs font-semibold bg-neutral-100 border border-neutral-200 rounded-input focus:bg-white focus:border-primary-700 outline-none"
            />
            <span className="text-xs text-neutral-400">emails/hr</span>
          </div>
        </div>

        {/* Row 5: Rich Text Editor */}
        <div className="pt-2">
          <RichTextEditor
            value={bodyHtml}
            onChange={(html, plainText) => {
              setBodyHtml(html);
              setBodyPlainText(plainText);
            }}
            placeholder="Type Your Reply..."
          />
        </div>
      </div>
    </div>
  );
}
