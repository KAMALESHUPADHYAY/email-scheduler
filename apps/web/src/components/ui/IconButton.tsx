import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  variant?: 'ghost' | 'outline' | 'subtle';
  size?: 'xs' | 'sm' | 'md';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      children,
      className,
      variant = 'ghost',
      size = 'sm',
      disabled,
      'aria-label': ariaLabel,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 disabled:opacity-40 disabled:pointer-events-none text-neutral-600 hover:text-neutral-900';

    const variants = {
      ghost: 'bg-transparent hover:bg-neutral-100',
      outline: 'border border-neutral-200 bg-white hover:bg-neutral-50 shadow-subtle',
      subtle: 'bg-neutral-100 hover:bg-neutral-200',
    };

    const sizes = {
      xs: 'w-6 h-6 p-1 text-xs',
      sm: 'w-8 h-8 p-1.5 text-sm',
      md: 'w-9 h-9 p-2 text-base',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
