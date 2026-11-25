import React from 'react';
import { Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'scheduled' | 'sent' | 'failed' | 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  icon?: boolean;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  size = 'md',
  icon = false,
  dot = false,
  ...props
}) => {
  const variants = {
    scheduled: 'bg-scheduled-bg text-scheduled-text border border-scheduled-border',
    sent: 'bg-sent-bg text-sent-text border border-sent-border',
    failed: 'bg-failed-bg text-failed-text border border-failed-border',
    neutral: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700',
    primary: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
    success: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    danger: 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 rounded-pill font-medium gap-1',
    md: 'text-xs px-2.5 py-0.5 rounded-pill font-medium gap-1.5',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center shrink-0 select-none tracking-tight whitespace-nowrap',
          variants[variant],
          sizes[size],
          className
        )
      )}
      {...props}
    >
      {dot && (
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full shrink-0',
            variant === 'success' && 'bg-emerald-500',
            variant === 'warning' && 'bg-amber-500',
            variant === 'danger' && 'bg-rose-500',
            variant === 'primary' && 'bg-indigo-500',
            variant === 'neutral' && 'bg-neutral-400'
          )}
        />
      )}
      {variant === 'scheduled' && icon && <Clock className="w-3 h-3 text-scheduled-text shrink-0" />}
      {children}
    </span>
  );
};
