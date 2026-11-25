import React from 'react';
import { Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'scheduled' | 'sent' | 'failed' | 'neutral' | 'primary';
  size?: 'sm' | 'md';
  icon?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  size = 'md',
  icon = false,
  ...props
}) => {
  const variants = {
    scheduled: 'bg-scheduled-bg text-scheduled-text border border-scheduled-border',
    sent: 'bg-sent-bg text-sent-text border border-sent-border',
    failed: 'bg-failed-bg text-failed-text border border-failed-border',
    neutral: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
    primary: 'bg-primary-light text-primary-800 border border-primary-200',
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
      {variant === 'scheduled' && icon && <Clock className="w-3 h-3 text-scheduled-text shrink-0" />}
      {children}
    </span>
  );
};
