import React from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  onRemove?: () => void;
  label: string;
}

export const Chip: React.FC<ChipProps> = ({ label, onRemove, className, ...props }) => {
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-xs font-medium border border-primary-700 bg-primary-50 text-primary-900 select-none',
          className
        )
      )}
      {...props}
    >
      <span className="truncate max-w-[200px]">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:bg-primary-200/60 rounded-full p-0.5 text-primary-700 transition-colors focus:outline-none"
          aria-label={`Remove ${label}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
