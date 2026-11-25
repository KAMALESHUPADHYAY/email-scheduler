'use client';

import React, { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Download,
  Calendar,
  Layers,
  Send,
  Loader2,
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { api } from '../lib/api';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Step navigation (1: Write, 2: Recipients, 3: Schedule)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Content
  const [subject, setSubject] = useState('Welcome to our Platform, {{name}}!');
  const [body, setBody] = useState(
    'Hi {{name}},\n\nThank you for checking out MailPilot. We built this high-resiliency dispatch engine with BullMQ and Redis to ensure zero dropped jobs.\n\nBest,\nThe MailPilot Engineering Team'
  );

  // Step 2: Recipients
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validEmails, setValidEmails] = useState<string[]>([]);
  const [invalidRows, setInvalidRows] = useState<{ row: number; value: string; reason: string }[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);

  // Step 3: Schedule
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live interpolated body preview
  const previewBody = useMemo(() => {
    return body.replace(/{{\s*name\s*}}/gi, 'Alex Morgan');
  }, [body]);

  const previewSubject = useMemo(() => {
    return subject.replace(/{{\s*name\s*}}/gi, 'Alex Morgan');
  }, [subject]);

  // Estimated completion duration calculation
  const estimateText = useMemo(() => {
    const count = validEmails.length;
    if (count === 0) return '0 minutes';
    const totalSeconds = (count - 1) * Math.max(1, delaySeconds);
    const minutes = Math.ceil(totalSeconds / 60);
    if (minutes < 60) {
      return `~${minutes} minute${minutes === 1 ? '' : 's'}`;
    }
    const hours = (minutes / 60).toFixed(1);
    return `~${hours} hours`;
  }, [validEmails.length, delaySeconds]);

  // Process raw list of candidates
  const parseCandidates = (candidates: string[]) => {
    const valid: string[] = [];
    const invalid: { row: number; value: string; reason: string }[] = [];
    const seen = new Set<string>();
    let duplicates = 0;

    candidates.forEach((raw, idx) => {
      const clean = raw.trim().toLowerCase();
      if (!clean) return;

      // Skip header words
      if (clean === 'email' || clean === 'recipient' || clean === 'e-mail') return;

      if (!EMAIL_REGEX.test(clean)) {
        invalid.push({ row: idx + 1, value: raw, reason: 'Invalid email syntax (RFC 5322)' });
        return;
      }

      if (seen.has(clean)) {
        duplicates++;
        invalid.push({ row: idx + 1, value: clean, reason: 'Duplicate recipient in dataset' });
      } else {
        seen.add(clean);
        valid.push(clean);
      }
    });

    setValidEmails(valid);
    setInvalidRows(invalid);
    setDuplicateCount(duplicates);
  };

  // Handle CSV file upload
  const handleFileUpload = (file: File) => {
    setSelectedFile(file);
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const flattened: string[] = [];
        results.data.forEach((row: unknown) => {
          if (Array.isArray(row)) {
            flattened.push(...row.map(String));
          } else if (typeof row === 'object' && row !== null) {
            flattened.push(...Object.values(row).map(String));
          }
        });
        parseCandidates(flattened);
      },
      error: () => {
        window.dispatchEvent(
          new CustomEvent('app-toast', {
            detail: { type: 'error', message: 'Failed to read CSV file' },
          })
        );
      },
    });
  };

  // Handle manual textarea input
  const handleManualInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    if (!selectedFile) {
      const parts = text.split(/[\r\n,;\t]+/);
      parseCandidates(parts);
    }
  };

  // Download CSV of invalid and duplicate emails
  const handleDownloadErrorCsv = () => {
    if (invalidRows.length === 0) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Row,Email Value,Error Reason']
        .concat(
          invalidRows.map(
            (r) => `${r.row},"${r.value.replace(/"/g, '""')}","${r.reason}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'mailpilot_validation_errors.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit campaign to API
  const handleSubmit = async () => {
    if (validEmails.length === 0) {
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
        formData.append('recipients', JSON.stringify(validEmails));
      }

      const res = await api.createCampaign(formData);

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            type: 'success',
            message: `Campaign scheduled! ${res.scheduledEmails} emails placed on BullMQ.`,
          },
        })
      );

      onSuccess();
      onClose();
      // Reset form
      setStep(1);
      setSelectedFile(null);
      setRawText('');
      setValidEmails([]);
      setInvalidRows([]);
    } catch (err: unknown) {
      // Error handled by ApiClient app-toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Cold Email Campaign"
      description="Configure email copy, validate recipient CSVs, and schedule atomic delivery."
      maxWidth="max-w-3xl"
    >
      {/* 3-Step Breadcrumb Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              step === 1
                ? 'bg-primary-600 text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 bg-neutral-100 dark:bg-neutral-800'
            }`}
          >
            <span>1</span>
            <span>Write Copy</span>
          </button>

          <span className="text-neutral-300 dark:text-neutral-700">&rarr;</span>

          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              step === 2
                ? 'bg-primary-600 text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 bg-neutral-100 dark:bg-neutral-800'
            }`}
          >
            <span>2</span>
            <span>Recipients &amp; CSV</span>
            {validEmails.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white">
                {validEmails.length}
              </span>
            )}
          </button>

          <span className="text-neutral-300 dark:text-neutral-700">&rarr;</span>

          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              step === 3
                ? 'bg-primary-600 text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 bg-neutral-100 dark:bg-neutral-800'
            }`}
          >
            <span>3</span>
            <span>Schedule &amp; Limits</span>
          </button>
        </div>

        <Badge variant="neutral" size="sm">
          Step {step} of 3
        </Badge>
      </div>

      {/* STEP 1: WRITE EMAIL */}
      {step === 1 && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5 block">
              Email Subject Line
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick question for {{name}}"
              required
            />
            <p className="mt-1 text-[11px] text-neutral-500">
              Supports dynamic interpolation: <code className="text-primary-600">{'{{name}}'}</code>
            </p>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5 block">
              Email Body (Plain Text or Markdown)
            </label>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email body here..."
              className="w-full rounded-lg text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 p-3.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-sans"
              required
            />
          </div>

          {/* Live Render Preview Card */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-500 dark:text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Live Preview (interpolated for Alex Morgan)
              </span>
              <span className="text-[10px] text-neutral-400">Sample recipient</span>
            </div>
            <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700/60 pb-1.5">
              Subject: {previewSubject || '(empty subject)'}
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
              {previewBody || '(empty body)'}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              onClick={() => setStep(2)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Next: Upload Recipients
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: RECIPIENTS & CSV VALIDATION */}
      {step === 2 && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* File Drag and Drop / Picker */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-primary-500 dark:hover:border-primary-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white dark:bg-neutral-900/60"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
            />
            <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950 flex items-center justify-center text-primary-600 mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {selectedFile ? selectedFile.name : 'Upload Recipient CSV or text file'}
            </h4>
            <p className="mt-1 text-xs text-neutral-500">
              Drag &amp; drop or click to browse (up to 10MB)
            </p>
          </div>

          {/* Or Manual Paste */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Or Paste Email Addresses Manually
              </label>
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setValidEmails([]);
                    setInvalidRows([]);
                  }}
                  className="text-xs text-danger-500 hover:underline"
                >
                  Clear uploaded file
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={rawText}
              onChange={handleManualInput}
              disabled={!!selectedFile}
              placeholder="sarah@acme.com, bob@stripe.com, john@gmail.com"
              className="w-full rounded-lg text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 p-3 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
          </div>

          {/* Validation Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-success-200 dark:border-success-900 bg-success-50/50 dark:bg-success-950/40 text-center">
              <div className="flex items-center justify-center gap-1.5 text-success-600 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Valid Emails
              </div>
              <div className="mt-1 text-2xl font-black text-success-700 dark:text-success-300">
                {validEmails.length}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-danger-200 dark:border-danger-900 bg-danger-50/50 dark:bg-danger-950/40 text-center">
              <div className="flex items-center justify-center gap-1.5 text-danger-600 text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                Invalid Format
              </div>
              <div className="mt-1 text-2xl font-black text-danger-700 dark:text-danger-300">
                {invalidRows.filter((r) => !r.reason.includes('Duplicate')).length}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-warning-200 dark:border-warning-900 bg-warning-50/50 dark:bg-warning-950/40 text-center">
              <div className="flex items-center justify-center gap-1.5 text-warning-600 text-xs font-bold">
                <Layers className="w-4 h-4" />
                Duplicates Dropped
              </div>
              <div className="mt-1 text-2xl font-black text-warning-700 dark:text-warning-300">
                {duplicateCount}
              </div>
            </div>
          </div>

          {/* Download Error CSV button if errors exist */}
          {invalidRows.length > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-danger-50 dark:bg-danger-950/60 border border-danger-200 dark:border-danger-800 text-xs text-danger-900 dark:text-danger-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-danger-500 shrink-0" />
                <span>
                  Found {invalidRows.length} invalid or duplicate records. Dropped automatically.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadErrorCsv}
                leftIcon={<Download className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Download Error CSV
              </Button>
            </div>
          )}

          {/* Recipient Preview Chips */}
          {validEmails.length > 0 && (
            <div>
              <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                Sample Verified Recipients (Showing first 6)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {validEmails.slice(0, 6).map((email, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700"
                  >
                    {email}
                  </span>
                ))}
                {validEmails.length > 6 && (
                  <span className="inline-flex items-center px-2 py-1 text-xs text-neutral-500">
                    +{validEmails.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            <Button
              variant="primary"
              disabled={validEmails.length === 0}
              onClick={() => setStep(3)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Next: Schedule &amp; Limits
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: SCHEDULE & HOURLY LIMIT */}
      {step === 3 && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5 block">
                Start Time
              </label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                leftIcon={<Calendar className="w-4 h-4" />}
                required
              />
              <p className="mt-1 text-[11px] text-neutral-500">
                Jobs will begin dispatching from this timestamp.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5 block">
                Delay Between Sends (Seconds)
              </label>
              <Input
                type="number"
                min={1}
                max={300}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Math.max(1, Number(e.target.value)))}
                leftIcon={<Clock className="w-4 h-4" />}
                required
              />
              <p className="mt-1 text-[11px] text-neutral-500">
                Staggers BullMQ jobs to prevent IP reputation flags.
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5 block">
              Max Emails Per Hour (Sender Limit)
            </label>
            <Input
              type="number"
              min={1}
              max={1000}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Math.max(1, Number(e.target.value)))}
              leftIcon={<Clock className="w-4 h-4" />}
              required
            />
            <p className="mt-1 text-[11px] text-neutral-500">
              Jobs exceeding this cap will be atomically shifted to the next hour without dropping.
            </p>
          </div>

          {/* Runtime Estimate Card */}
          <div className="p-4 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/40 space-y-2">
            <div className="flex items-center gap-2 text-primary-700 dark:text-primary-300 text-xs font-bold">
              <Clock className="w-4 h-4" />
              <span>Calculated Dispatch Estimate</span>
            </div>
            <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
              With <strong className="text-primary-600 dark:text-primary-400">{validEmails.length} recipients</strong> and a{' '}
              <strong>{delaySeconds}s delay</strong>, dispatching this campaign will take{' '}
              <strong className="text-primary-600 dark:text-primary-400">{estimateText}</strong> to complete.
            </p>
          </div>

          {/* Submission Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              onClick={handleSubmit}
              leftIcon={<Send className="w-4 h-4" />}
              className="shadow-md shadow-primary-500/25"
            >
              {isSubmitting ? 'Scheduling...' : `Schedule ${validEmails.length} Emails`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
