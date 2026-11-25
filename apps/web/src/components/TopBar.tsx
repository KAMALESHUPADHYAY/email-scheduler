'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  BarChart3,
  Plus,
  ChevronDown,
  LogOut,
  Zap,
  ExternalLink,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { User, Sender } from '../types';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { ThemeToggle } from './ui/ThemeToggle';
import { api, API_BASE_URL } from '../lib/api';

export interface TopBarProps {
  user: User | null;
  sender: Sender | null;
  onOpenMobileMenu?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  sender,
  onOpenMobileMenu,
  onRefresh,
  isRefreshing = false,
}) => {
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Derive title from current path
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Overview';
    if (pathname.includes('/campaigns')) return 'Campaigns';
    if (pathname.includes('/scheduled')) return 'Scheduled Queue';
    if (pathname.includes('/sent')) return 'Sent History';
    if (pathname.includes('/integrations')) return 'Integrations';
    if (pathname.includes('/email/')) return 'Email Details';
    return 'Dashboard';
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await api.logout();
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <header className="h-16 border-b border-neutral-200/80 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-30 transition-colors">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
            {getPageTitle()}
          </h1>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors rounded"
              title="Refresh live metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls: ThemeToggle, Bull Board, Compose, User Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Dark/Light Theme Toggle */}
        <ThemeToggle />

        {/* Bull Board Admin Button */}
        <a
          href={`${API_BASE_URL}/admin/queues`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200/80 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Bull Board</span>
          <ExternalLink className="w-3 h-3 text-neutral-400" />
        </a>

        {/* Compose Button */}
        <Link href="/compose">
          <Button
            size="sm"
            className="hidden sm:inline-flex bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-sm font-semibold rounded-lg py-1.5 px-3 text-xs"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Compose
          </Button>
        </Link>

        {/* User Menu Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-expanded={isUserMenuOpen}
          >
            <Avatar
              src={user?.avatarUrl || user?.avatar_url}
              name={user?.name || user?.email || 'User'}
              size="sm"
            />
            <div className="hidden lg:block text-left max-w-[130px]">
              <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate leading-tight">
                {user ? user.name : 'Loading...'}
              </p>
              <p className="text-[10px] text-neutral-400 truncate leading-tight">
                {user ? user.email : ''}
              </p>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                isUserMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* User Popover Menu */}
          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 z-50 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl p-1.5 space-y-0.5 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                {/* Header User Details */}
                <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 mb-1">
                  <p className="font-semibold text-neutral-900 dark:text-white truncate">
                    {user?.name || 'MailPilot User'}
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate">
                    {user?.email}
                  </p>
                </div>

                <Link
                  href="/dashboard/integrations"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Integrations &amp; Alerts</span>
                </Link>

                <a
                  href={`${API_BASE_URL}/admin/queues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
                    <span>BullMQ Admin</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-neutral-400" />
                </a>

                <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
