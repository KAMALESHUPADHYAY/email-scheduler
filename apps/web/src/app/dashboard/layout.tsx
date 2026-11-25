'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, Sender, UserStats } from '../../types';
import { api } from '../../lib/api';
import { Sidebar } from '../../components/Sidebar';
import { TopBar } from '../../components/TopBar';

interface DashboardContextType {
  user: User | null;
  sender: Sender | null;
  stats: UserStats | null;
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

  // 2. Fetch live stats
  const refreshStats = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await api.getStats();
      setStats(res.data);
    } catch {
      // Ignored
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
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        refreshStats,
        isRefreshing,
      }}
    >
      <div className="flex h-screen bg-white overflow-hidden text-neutral-900 font-sans">
        {/* Left Sidebar */}
        <Sidebar
          user={user}
          sender={sender}
          scheduledCount={stats?.scheduledCount || 0}
          sentCount={stats?.sentCount || 0}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <TopBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={refreshStats}
            isRefreshing={isRefreshing}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />

          <main className="flex-1 overflow-y-auto bg-white">{children}</main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
