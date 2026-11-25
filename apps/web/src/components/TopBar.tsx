'use client';

import React, { useState } from 'react';
import { SlidersHorizontal, RefreshCw, Menu } from 'lucide-react';
import { SearchBar } from './ui/SearchBar';
import { IconButton } from './ui/IconButton';
import { Popover } from './ui/Popover';

export interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onOpenMobileMenu?: () => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
  isRefreshing = false,
  onOpenMobileMenu,
  statusFilter = 'all',
  onStatusFilterChange,
}) => {
  return (
    <header className="h-14 border-b border-neutral-200 bg-white px-4 flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2 flex-1 max-w-lg">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-1.5 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Debounced SearchBar */}
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search by recipient, subject, or content..."
        />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Filter Popover */}
        <Popover
          align="right"
          trigger={
            <IconButton aria-label="Filter emails" variant="ghost" size="sm">
              <SlidersHorizontal className="w-4 h-4 text-neutral-600" />
            </IconButton>
          }
        >
          <div className="p-2 w-48 text-xs space-y-2">
            <p className="font-semibold text-neutral-900 uppercase tracking-wider text-[10px]">
              Filter By Status
            </p>
            <div className="space-y-1">
              {['all', 'scheduled', 'sent', 'failed'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onStatusFilterChange?.(s)}
                  className={`w-full text-left px-2 py-1.5 rounded capitalize transition-colors ${
                    statusFilter === s
                      ? 'bg-primary-light text-primary-700 font-semibold'
                      : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Popover>

        {/* Refresh Button */}
        <IconButton
          aria-label="Refresh list"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`w-4 h-4 text-neutral-600 ${
              isRefreshing ? 'animate-spin text-primary-700' : ''
            }`}
          />
        </IconButton>
      </div>
    </header>
  );
};
