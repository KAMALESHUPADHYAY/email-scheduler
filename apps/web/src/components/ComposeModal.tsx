'use client';

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { UploadCloud, CheckCircle, AlertTriangle, Calendar, Clock, Gauge } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { api } from '../lib/api';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualRecipients, setManualRecipients] = useState('');
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processEmailList = (candidates: string[]) => {
    let valid = 0;
    let invalid = 0;
    const cleanList: string[] = [];
    const seen = new Set<string>();

    for (const raw of candidates) {
      const email = raw.trim().toLowerCase();
      if (!email || email.includes('email')) continue;

      if (EMAIL_REGEX.test(email)) {
        if (!seen.has(email)) {
          seen.add(email);
          cleanList.push(email);
          valid++;
        }
      } else {
        invalid++;
      }
    }

    setParsedEmails(cleanList);
    setValidCount(valid);
    setInvalidCount(invalid);
  };

  const handleFileUpload = (file: File) => {
    setSelectedFile(file);
    Papa.parse(file, {
      complete: (results) => {
        const flattened: string[] = [];
        results.data.forEach((row: any) => {
          if (Array.isArray(row)) {
            flattened.push(...row.map(String));
          } else if (typeof row === 'object' && row !== null) {
            flattened.push(...Object.values(row).map(String));
          }
        });
        processEmailList(flattened);
      },
      error: () => {
        window.dispatchEvent(
          new CustomEvent('app-toast', {
            detail: { type: 'error', message: 'Failed to parse CSV file' },
          })
        );
      },
    });
  };

  const handleManualTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setManualRecipients(text);
    if (!selectedFile) {
      const parts = text.split(/[\n,;\s]+/);
      processEmailList(parts);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: { type: 'error', message: 'Subject and body are required' },
        })
      );
      return;
    }

    if (validCount === 0) {
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: { type: 'error', message: 'Please provide at least one valid recipient' },
        })
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('body', body);
      formData.append('start_time', new Date(startTime).toISOString());
      formData.append('delay_seconds', String(delaySeconds));
      formData.append('hourly_limit', String(hourlyLimit));

      if (selectedFile) {
        formData.append('file', selectedFile);
      } else {
        formData.append('recipients', JSON.stringify(parsedEmails));
      }

      const result = await api.createCampaign(formData);

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            type: 'success',
            message: `Successfully scheduled ${result.scheduledEmails} emails!`,
          },
        })
      );

      // Reset
      setSubject('');
      setBody('');
      setSelectedFile(null);
      setManualRecipients('');
      setParsedEmails([]);
      setValidCount(0);
      setInvalidCount(0);

      onSuccess();
      onClose();
    } catch (err: any) {
      // Error handled by api client toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compose Email Campaign"
      description="Schedule asynchronous emails with staggered delays and rate limits."
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email Subject"
          placeholder="e.g. Catch up over coffee / Product feedback"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
            Email Body
          </label>
          <textarea
            rows={5}
            placeholder="Write your email template message here..."
            className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </div>

        {/* Recipients input: CSV or Manual */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
            Recipients (CSV Upload or Paste)
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File drop area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-surface-300 dark:border-surface-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-surface-50/50 dark:bg-surface-800/30"
            >
              <UploadCloud className="w-8 h-8 text-surface-400 mb-2" />
              <p className="text-xs font-semibold text-surface-800 dark:text-surface-200">
                {selectedFile ? selectedFile.name : 'Click to upload CSV file'}
              </p>
              <p className="text-[11px] text-surface-500 mt-0.5">
                Supports .csv, .txt with email addresses
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
              />
            </div>

            {/* Manual paste area */}
            <div>
              <textarea
                rows={3}
                placeholder="Or paste email addresses separated by commas or lines..."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 h-full resize-none"
                value={manualRecipients}
                onChange={handleManualTextChange}
                disabled={!!selectedFile}
              />
            </div>
          </div>

          {/* Live Validation Counter */}
          {(validCount > 0 || invalidCount > 0) && (
            <div className="flex items-center space-x-3 text-xs pt-1">
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle className="w-4 h-4 mr-1" />
                {validCount} Valid Recipient{validCount !== 1 ? 's' : ''}
              </span>
              {invalidCount > 0 && (
                <span className="inline-flex items-center text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {invalidCount} Invalid Skipped
                </span>
              )}
            </div>
          )}
        </div>

        {/* Schedule & Queue Settings */}
        <div className="p-4 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-200 dark:border-surface-700/60 space-y-4">
          <h4 className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
            Queue & Scheduling Parameters
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-surface-400" /> Start Time
              </label>
              <input
                type="datetime-local"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-brand-500"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 text-surface-400" /> Stagger Delay (sec)
              </label>
              <input
                type="number"
                min={1}
                max={300}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-brand-500"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center">
                <Gauge className="w-3.5 h-3.5 mr-1 text-surface-400" /> Hourly Limit
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-brand-500"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-surface-200 dark:border-surface-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting || validCount === 0}
          >
            {isSubmitting ? 'Scheduling Jobs...' : `Schedule ${validCount} Email${validCount !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
