'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { User, Sender, UserStats, HealthResponse } from '../../types';
import { api } from '../../lib/api';
import { Sidebar } from '../../components/Sidebar';
import { TopBar } from '../../components/TopBar';

interface DashboardContextType {
  user: User | null;
  sender: Sender | null;
  stats: UserStats | null;
  health: HealthResponse | null;
  campaignsCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  refreshStats: () => Promise<void>;
  isRefreshing: boolean;
}

const DashboardContext = createContext<DashboardContextType>({
  user: null,
  sender: null,
  stats: null,
  health: null,
  campaignsCount: 0,
  searchQuery: '',
  setSearchQuery: () => {},
  statusFilter: 'all',
  setStatusFilter: () => {},
  refreshStats: async () => {},
  isRefreshing: false,
});

export const useDashboard = () => useContext(DashboardContext);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sender, setSender] = useState<Sender | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [campaignsCount, setCampaignsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 1. Initial auth check & session token capture from OAuth callback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sessionFromUrl = params.get('session');
      if (sessionFromUrl) {
        localStorage.setItem('session_token', sessionFromUrl);
        document.cookie = `session_token=${sessionFromUrl}; path=/; max-age=604800; SameSite=Lax; Secure`;
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }

    api
      .getMe()
      .then((res) => {
        setUser(res.user);
        setSender(res.sender);
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  // 2. Fetch live stats, health, and campaigns count
  const refreshStats = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [statsRes, healthRes, campRes] = await Promise.allSettled([
        api.getStats(),
        api.getHealth(),
        api.getCampaigns(),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }
      if (healthRes.status === 'fulfilled') {
        setHealth(healthRes.value);
      }
      if (campRes.status === 'fulfilled') {
        setCampaignsCount(campRes.value.data?.length || 0);
      }
    } catch {
      // Ignored for non-blocking telemetry
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshStats();
    // Auto-refresh stats every 10s without flicker
    const timer = setInterval(refreshStats, 10000);
    return () => clearInterval(timer);
  }, [refreshStats]);

  return (
    <DashboardContext.Provider
      value={{
        user,
        sender,
        stats,
        health,
        campaignsCount,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        refreshStats,
        isRefreshing,
      }}
    >
      <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950 overflow-hidden text-neutral-900 dark:text-neutral-100 font-sans transition-colors">
        {/* Left Sidebar */}
        <Sidebar
          user={user}
          sender={sender}
          scheduledCount={stats?.scheduledCount || 0}
          sentCount={stats?.sentCount || 0}
          campaignsCount={campaignsCount}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <TopBar
            user={user}
            sender={sender}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            onRefresh={refreshStats}
            isRefreshing={isRefreshing}
          />

          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
