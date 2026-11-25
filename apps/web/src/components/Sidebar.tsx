'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Clock,
  Send,
  Plus,
  ChevronDown,
  LogOut,
  BarChart3,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  X,
} from 'lucide-react';
import { User, Sender } from '../types';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { api, API_BASE_URL } from '../lib/api';

export interface SidebarProps {
  user: User | null;
  sender: Sender | null;
  scheduledCount?: number;
  sentCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  sender,
  scheduledCount = 0,
  sentCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // We can use window.location.pathname in client components safely
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await api.logout();
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  const navItems = [
    {
      label: 'Scheduled',
      href: '/dashboard/scheduled',
      icon: Clock,
      count: scheduledCount,
      isActive: currentPath.includes('/dashboard/scheduled') || currentPath === '/dashboard',
    },
    {
      label: 'Sent',
      href: '/dashboard/sent',
      icon: Send,
      count: sentCount,
      isActive: currentPath.includes('/dashboard/sent'),
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full w-full bg-white select-none">
      {/* 1. Header with ONB pixel logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-100">
        <Link href="/dashboard/scheduled" className="flex items-center gap-2 group">
          <div className="w-7 h-7 bg-neutral-900 text-white rounded flex items-center justify-center font-mono font-black text-xs tracking-wider group-hover:bg-primary-700 transition-colors">
            ONB
          </div>
          <span className="font-mono font-bold text-sm tracking-tight text-neutral-900">
            Outbox
          </span>
        </Link>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. User Card with Popover Menu */}
      <div className="relative px-3 py-3 border-b border-neutral-100">
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-neutral-50 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
          aria-expanded={isMenuOpen}
        >
          <Avatar
            src={user?.avatarUrl || user?.avatar_url}
            name={user?.name || 'User'}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-900 truncate">
              {user ? user.name : 'Loading...'}
            </p>
            <p className="text-[11px] text-neutral-400 truncate">
              {user ? user.email : ''}
            </p>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
              isMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* User Dropdown Menu */}
        {isMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsMenuOpen(false)}
            />
            <div className="absolute left-3 right-3 top-full mt-1 z-40 bg-white rounded-card border border-neutral-200 shadow-popover p-1.5 space-y-0.5 animate-fade-in text-xs">
              <a
                href={`${API_BASE_URL}/auth/slack`}
                className="flex items-center justify-between px-2.5 py-2 rounded text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Slack Alerts</span>
                </div>
                {user?.has_slack ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-primary-700 bg-primary-light px-1.5 py-0.5 rounded-pill">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                    Connect <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                )}
              </a>

              <Link
                href="/insights"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 px-2.5 py-2 rounded text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <BarChart3 className="w-3.5 h-3.5 text-neutral-500" />
                <span>Queue Insights</span>
              </Link>

              <div className="h-px bg-neutral-100 my-1" />

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* 3. Compose Outline Button */}
      <div className="p-3">
        <Link href="/compose" className="w-full block">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center border-primary-700 text-primary-700 hover:bg-primary-light font-medium py-1.5"
            leftIcon={<Plus className="w-3.5 h-3.5 text-primary-700" />}
          >
            Compose
          </Button>
        </Link>
      </div>

      {/* 4. Navigation Section */}
      <div className="flex-1 px-3 py-1 space-y-0.5">
        <div className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase px-2 mb-1.5">
          CORE
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                item.isActive
                  ? 'bg-primary-light text-primary-700 font-semibold'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    item.isActive ? 'text-primary-700' : 'text-neutral-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-pill ${
                    item.isActive
                      ? 'bg-primary-200/80 text-primary-900'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* 5. Sender Footer */}
      {sender && (
        <div className="p-3 border-t border-neutral-100 bg-neutral-50/50">
          <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
            SMTP SENDER
          </p>
          <p className="text-[11px] font-mono text-neutral-600 truncate mt-0.5" title={sender.email}>
            {sender.email}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:flex w-52 shrink-0 border-r border-neutral-200 min-h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-modal z-10 animate-fade-in">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
