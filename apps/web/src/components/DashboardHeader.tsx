'use client';

import React from 'react';
import { Mail, Plus, Slack, LogOut, ExternalLink, Activity } from 'lucide-react';
import { User, Sender } from '../types';
import { Button } from './ui/Button';
import { API_BASE_URL, api } from '../lib/api';

interface DashboardHeaderProps {
  user: User;
  sender: Sender | null;
  onOpenCompose: () => void;
  onLogout: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  sender,
  onOpenCompose,
  onLogout,
}) => {
  const handleConnectSlack = () => {
    window.location.href = `${API_BASE_URL}/auth/slack`;
  };

  return (
    <header className="border-b border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Brand & Sender Details */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-surface-900 dark:text-surface-100">
                  MailPilot
                </h1>
                <span className="text-[10px] font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 px-2 py-0.5 rounded-full">
                  Production Queue
                </span>
              </div>
              {sender && (
                <p className="text-xs text-surface-500 flex items-center mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Sender: <code className="ml-1 text-surface-700 dark:text-surface-300">{sender.email}</code>
                </p>
              )}
            </div>
          </div>

          {/* User profile & action controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Bull Board link */}
            <a
              href={`${API_BASE_URL}/admin/queues`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs font-medium px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 mr-1.5 text-brand-500" />
              Bull Board
              <ExternalLink className="w-3 h-3 ml-1 text-surface-400" />
            </a>

            {/* Slack integration button */}
            {user.has_slack ? (
              <span className="inline-flex items-center text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                Slack Connected
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnectSlack}
                leftIcon={<Slack className="w-4 h-4 text-emerald-500" />}
              >
                Connect Slack
              </Button>
            )}

            {/* Compose Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenCompose}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Compose New Email
            </Button>

            {/* User Avatar & Logout */}
            <div className="flex items-center pl-2 border-l border-surface-200 dark:border-surface-700 space-x-2.5">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-surface-200 dark:border-surface-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden lg:block text-left text-xs">
                <p className="font-semibold text-surface-900 dark:text-surface-100 leading-tight">
                  {user.name}
                </p>
                <p className="text-surface-400 text-[11px] leading-tight">{user.email}</p>
              </div>
              <button
                onClick={onLogout}
                title="Logout"
                className="p-1.5 text-surface-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
