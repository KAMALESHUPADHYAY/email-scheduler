import {
  User,
  UserStats,
  Sender,
  EmailItem,
  Pagination,
  CampaignItem,
  CampaignDetail,
  HealthResponse,
  CampaignCreationResult,
} from '../types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://email-scheduler-api-433g.onrender.com';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Ensure session cookies are sent
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.error || `HTTP ${response.status}: ${response.statusText}`;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('app-toast', {
              detail: { type: 'error', message: errorMsg },
            })
          );
        }
        throw new Error(errorMsg);
      }

      return data as T;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      if (typeof window !== 'undefined' && !message.includes('HTTP')) {
        window.dispatchEvent(
          new CustomEvent('app-toast', {
            detail: { type: 'error', message },
          })
        );
      }
      throw err;
    }
  }

  // Auth endpoints
  async getMe(): Promise<{ success: boolean; user: User; sender: Sender | null }> {
    return this.request('/auth/me');
  }

  async loginWithPassword(email: string, password: string): Promise<{ success: boolean; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async registerWithPassword(
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; user: User }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // System Health
  async getHealth(): Promise<HealthResponse> {
    return this.request('/health');
  }

  // Per-user Stats
  async getStats(): Promise<{ success: boolean; data: UserStats }> {
    return this.request('/stats');
  }

  // Single email fetch
  async getEmail(id: string): Promise<{ success: boolean; data: EmailItem }> {
    return this.request(`/emails/${id}`);
  }

  // Star toggle
  async starEmail(id: string): Promise<{ success: boolean; data: EmailItem }> {
    return this.request(`/emails/${id}/star`, { method: 'PATCH' });
  }

  // Emails list
  async getEmails(
    status: 'scheduled' | 'sent' | 'failed',
    page = 1,
    limit = 20
  ): Promise<{ success: boolean; data: EmailItem[]; pagination: Pagination }> {
    return this.request(`/emails?status=${status}&page=${page}&limit=${limit}`);
  }

  // Search
  async searchEmails(
    query: string,
    status = 'all',
    page = 1,
    limit = 20
  ): Promise<{ success: boolean; data: EmailItem[]; pagination: Pagination; source: string }> {
    return this.request(
      `/search?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&page=${page}&limit=${limit}`
    );
  }

  // Campaigns
  async getCampaigns(): Promise<{ success: boolean; data: CampaignItem[] }> {
    return this.request('/campaigns');
  }

  async getCampaign(id: string): Promise<{ success: boolean; data: CampaignDetail }> {
    return this.request(`/campaigns/${id}`);
  }

  // Create Campaign
  async createCampaign(formData: FormData): Promise<CampaignCreationResult> {
    return this.request('/campaigns', {
      method: 'POST',
      body: formData,
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
