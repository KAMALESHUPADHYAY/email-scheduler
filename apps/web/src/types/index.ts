export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  has_slack: boolean;
  slack_channel?: string | null;
  created_at: string;
}

export interface UserStats {
  scheduledCount: number;
  sentCount: number;
  failedCount: number;
  nextSendTime: string | null;
  usedThisHour: number;
  hourlyLimit: number;
  senderEmail: string | null;
  chartPoints: { timestamp: string; count: number }[];
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
  is_starred?: boolean;
  preview_url?: string | null;
  error?: string | null;
  created_at: string;
  sender?: {
    id: string;
    email: string;
    user_id: string;
  };
  campaign?: {
    id: string;
    subject: string;
    created_at?: string;
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
  worker?: 'online' | 'sleeping' | 'unreachable' | string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: HealthServiceStatus;
  workerHeartbeat?: string | null;
  heartbeatAgeSeconds?: number | null;
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
