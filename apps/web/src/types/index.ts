export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  has_slack: boolean;
  slack_channel?: string | null;
  created_at: string;
}

export interface Sender {
  id: string;
  email: string;
  ethereal_user: string;
  hourly_limit: number;
}

export type EmailStatus = 'scheduled' | 'sent' | 'failed';

export interface EmailItem {
  id: string;
  campaign_id: string;
  sender_id: string;
  recipient: string;
  subject: string;
  body: string;
  scheduled_at: string;
  sent_at?: string | null;
  status: EmailStatus;
  preview_url?: string | null;
  error?: string | null;
  created_at: string;
  campaign?: {
    id: string;
    subject: string;
  };
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: Pagination;
}

export interface CampaignCreationResult {
  success: boolean;
  campaign: {
    id: string;
    subject: string;
    start_time: string;
    delay_seconds: number;
    hourly_limit: number;
  };
  totalProvided: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  scheduledEmails: number;
}
