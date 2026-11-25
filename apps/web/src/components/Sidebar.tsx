'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  Clock,
  Send,
  Zap,
  Plus,
  ChevronDown,
  LogOut,
  BarChart3,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  X,
  Mail,
  Shield,
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
  campaignsCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  sender,
  scheduledCount = 0,
  sentCount = 0,
  campaignsCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();

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
      label: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
      isActive: pathname === '/dashboard',
    },
    {
      label: 'Campaigns',
      href: '/dashboard/campaigns',
      icon: Layers,
      count: campaignsCount,
      isActive: pathname === '/dashboard/campaigns',
    },
    {
      label: 'Scheduled Queue',
      href: '/dashboard/scheduled',
      icon: Clock,
      count: scheduledCount,
      isActive: pathname === '/dashboard/scheduled',
    },
    {
      label: 'Sent History',
      href: '/dashboard/sent',
      icon: Send,
      count: sentCount,
      isActive: pathname === '/dashboard/sent',
    },
    {
      label: 'Integrations',
      href: '/dashboard/integrations',
      icon: Zap,
      hasDot: user?.has_slack,
      isActive: pathname === '/dashboard/integrations',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full w-full bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 select-none transition-colors">
      {/* 1. Header with MailPilot brand logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Send className="w-4 h-4 -rotate-12 translate-x-0.5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-neutral-900 dark:text-white">
              MailPilot
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
              PRO
            </span>
          </div>
        </Link>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Primary "New Campaign" Button on Top */}
      <div className="p-4 pb-2">
        <Link href="/compose" onClick={onCloseMobile} className="w-full block">
          <Button
            size="sm"
            className="w-full justify-center bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-500/20 font-semibold py-2 rounded-xl transition-all"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Campaign
          </Button>
        </Link>
      </div>

      {/* 3. Navigation Items */}
      <div className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase px-2.5 mb-2">
          MAIN MENU
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                item.isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    item.isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400 dark:text-neutral-500'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.isActive
                      ? 'bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
              {item.hasDot && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Connected" />
              )}
            </Link>
          );
        })}
      </div>

      {/* 4. Sender Footer Card */}
      {sender && (
        <div className="p-3 mx-3 mb-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            <Mail className="w-3 h-3 text-indigo-500" />
            <span>SMTP Sender</span>
          </div>
          <p className="text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300 truncate mt-1" title={sender.email}>
            {sender.email}
          </p>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400">
            <span>Limit: {sender.hourly_limit}/hr</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 min-h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-neutral-950/50 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10 animate-fade-in">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
