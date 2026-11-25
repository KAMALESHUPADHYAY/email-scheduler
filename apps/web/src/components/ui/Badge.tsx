import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'scheduled' | 'sent' | 'failed' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  ...props
}) => {
  const variants = {
    scheduled:
      'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800/60',
    sent:
      'bg-success-50 dark:bg-success-950/60 text-success-700 dark:text-success-300 border-success-200 dark:border-success-800/60',
    failed:
      'bg-danger-50 dark:bg-danger-950/60 text-danger-700 dark:text-danger-300 border-danger-200 dark:border-danger-800/60',
    success:
      'bg-success-50 dark:bg-success-950/60 text-success-700 dark:text-success-300 border-success-200 dark:border-success-800/60',
    warning:
      'bg-warning-50 dark:bg-warning-950/60 text-warning-700 dark:text-warning-300 border-warning-200 dark:border-warning-800/60',
    danger:
      'bg-danger-50 dark:bg-danger-950/60 text-danger-700 dark:text-danger-300 border-danger-200 dark:border-danger-800/60',
    info:
      'bg-info-50 dark:bg-info-950/60 text-info-700 dark:text-info-300 border-info-200 dark:border-info-800/60',
    neutral:
      'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700',
    primary:
      'bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-200 border-primary-200 dark:border-primary-800',
  };

  const dotColors = {
    scheduled: 'bg-primary-500 animate-pulse',
    sent: 'bg-success-500',
    failed: 'bg-danger-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    info: 'bg-info-500',
    neutral: 'bg-neutral-400',
    primary: 'bg-primary-500',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 rounded-full border leading-none font-medium',
          variants[variant],
          sizes[size],
          className
        )
      )}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
