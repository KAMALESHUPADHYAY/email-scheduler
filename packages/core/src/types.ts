export interface AuthenticatedUser {
  id: string;
  google_id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  slack_token?: string | null;
  slack_channel?: string | null;
  created_at: Date;
}

export type EmailStatusType = 'scheduled' | 'sent' | 'failed';

export interface EmailJobData {
  emailId: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
}

export interface CreateCampaignInput {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string; // ISO date string
  delaySeconds: number;
  hourlyLimit?: number;
}

export interface CampaignCreationResult {
  campaignId: string;
  totalProvided: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  scheduledEmails: number;
}

export interface EmailSearchResult {
  id: string;
  campaign_id: string;
  sender_id: string;
  recipient: string;
  subject: string;
  body: string;
  scheduled_at: string;
  sent_at?: string | null;
  status: EmailStatusType;
  preview_url?: string | null;
  error?: string | null;
  created_at: string;
}

export interface EmailSearchResponse {
  total: number;
  emails: EmailSearchResult[];
}
