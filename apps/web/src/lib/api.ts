import { ApiResponse, User, Sender, EmailItem, CampaignCreationResult } from '../types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
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
    } catch (err: any) {
      if (typeof window !== 'undefined' && !err.message.includes('HTTP')) {
        window.dispatchEvent(
          new CustomEvent('app-toast', {
            detail: { type: 'error', message: err.message || 'Network error' },
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

  async logout(): Promise<{ success: boolean; message: string }> {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // Emails list
  async getEmails(
    status: 'scheduled' | 'sent' | 'failed',
    page = 1,
    limit = 20
  ): Promise<{ success: boolean; data: EmailItem[]; pagination: any }> {
    return this.request(`/emails?status=${status}&page=${page}&limit=${limit}`);
  }

  // Search
  async searchEmails(
    query: string,
    status = 'all',
    page = 1,
    limit = 20
  ): Promise<{ success: boolean; data: EmailItem[]; pagination: any; source: string }> {
    return this.request(
      `/search?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&page=${page}&limit=${limit}`
    );
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
