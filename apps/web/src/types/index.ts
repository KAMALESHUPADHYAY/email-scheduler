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
  source?: string;
}

export interface CampaignItem {
  id: string;
  subject: string;
  body: string;
  start_time: string;
  delay_seconds: number;
  hourly_limit: number;
  created_at: string;
  total: number;
  sent: number;
  scheduled: number;
  failed: number;
  progress: number;
}

export interface CampaignDetail extends CampaignItem {
  emails: EmailItem[];
}

export interface HealthServiceStatus {
  database: 'healthy' | 'unhealthy';
  redis: 'healthy' | 'unhealthy';
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: HealthServiceStatus;
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

export interface HourlyChartPoint {
  hour: string;
  count: number;
}
