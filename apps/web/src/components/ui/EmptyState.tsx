import React from 'react';
import { MailQuestion } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-500 mb-4">
        {icon || <MailQuestion className="w-7 h-7 text-surface-400" />}
      </div>
      <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 mb-1">
        {title}
      </h3>
      <p className="text-sm text-surface-500 max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
