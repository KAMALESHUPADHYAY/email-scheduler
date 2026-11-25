import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search by recipient, subject, or content...',
  className,
}) => {
  const [innerVal, setInnerVal] = useState(value);

  useEffect(() => {
    setInnerVal(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(innerVal);
    }, 300);
    return () => clearTimeout(timer);
  }, [innerVal, onChange]);

  return (
    <div className={twMerge(clsx('relative flex items-center w-full max-w-md', className))}>
      <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 pointer-events-none" />
      <input
        type="text"
        value={innerVal}
        onChange={(e) => setInnerVal(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-neutral-100 hover:bg-neutral-100/80 focus:bg-white text-xs text-neutral-800 placeholder-neutral-400 rounded-pill pl-8 pr-8 py-1.5 border border-neutral-200 transition-all outline-none focus:border-primary-700 focus:ring-1 focus:ring-primary-700"
      />
      {innerVal && (
        <button
          type="button"
          onClick={() => {
            setInnerVal('');
            onChange('');
          }}
          className="absolute right-2.5 p-0.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 focus:outline-none"
          aria-label="Clear search"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
