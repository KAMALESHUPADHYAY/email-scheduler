import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'underline';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      className,
      id,
      variant = 'default',
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const variants = {
      default:
        'rounded-input text-xs sm:text-sm bg-white border border-neutral-200 focus:border-primary-700 focus:ring-1 focus:ring-primary-700 py-2',
      filled:
        'rounded-input text-xs sm:text-sm bg-neutral-100 border border-neutral-200/80 focus:bg-white focus:border-primary-700 focus:ring-1 focus:ring-primary-700 py-2',
      underline:
        'rounded-none text-xs sm:text-sm bg-transparent border-b border-neutral-200 focus:border-primary-700 py-2 px-0 shadow-none',
    };

    return (
      <div className="w-full flex flex-col space-y-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-neutral-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-neutral-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={twMerge(
              clsx(
                'w-full text-neutral-900 placeholder-neutral-400 transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed',
                leftIcon ? 'pl-9' : variant === 'underline' ? 'pl-0' : 'pl-3',
                rightIcon ? 'pr-9' : variant === 'underline' ? 'pr-0' : 'pr-3',
                variants[variant],
                error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
                className
              )
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center text-neutral-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-neutral-400">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
