import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'primary' | 'outline' | 'ghost' | 'pill' | 'google' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'solid',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      solid: 'bg-primary-700 text-white hover:bg-primary-hover shadow-subtle rounded-input',
      primary: 'bg-primary-700 text-white hover:bg-primary-hover shadow-subtle rounded-input',
      outline: 'border border-primary-700 bg-transparent text-primary-700 hover:bg-primary-light rounded-input',
      ghost: 'bg-transparent hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 rounded-input',
      pill: 'rounded-pill border border-primary-700 text-primary-700 hover:bg-primary-light bg-transparent font-medium',
      google: 'bg-primary-light border border-primary-200/80 text-primary-900 hover:bg-primary-100/90 rounded-input font-medium shadow-subtle',
      danger: 'bg-failed-bg text-failed-text border border-failed-border hover:bg-red-100 rounded-input font-medium',
    };

    const sizes = {
      xs: 'text-xs px-2.5 py-1 gap-1',
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-5 py-2.5 gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
