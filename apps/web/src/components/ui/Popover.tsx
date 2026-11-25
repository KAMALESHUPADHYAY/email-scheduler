import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  children,
  align = 'left',
  className,
  isOpen: controlledIsOpen,
  onOpenChange,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const popoverRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    const next = !isOpen;
    if (onOpenChange) onOpenChange(next);
    else setInternalIsOpen(next);
  };

  const close = () => {
    if (onOpenChange) onOpenChange(false);
    else setInternalIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        close();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const alignments = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div ref={popoverRef} className="relative inline-block text-left">
      <div onClick={toggle} className="cursor-pointer inline-flex">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={twMerge(
            clsx(
              'absolute z-50 mt-1 min-w-[200px] bg-white rounded-card border border-neutral-200 shadow-popover p-2 focus:outline-none animate-fade-in',
              alignments[align],
              className
            )
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};
