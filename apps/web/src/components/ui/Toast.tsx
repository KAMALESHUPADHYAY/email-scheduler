'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: 'success' | 'error' | 'info'; message: string }>;
      const { type, message } = customEvent.detail;
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };

    window.addEventListener('app-toast', handleCustomToast);
    return () => window.removeEventListener('app-toast', handleCustomToast);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-start p-4 rounded-xl shadow-xl border text-sm transition-all transform animate-in fade-in slide-in-from-bottom-5 ${
              toast.type === 'error'
                ? 'bg-danger-50 dark:bg-danger-950/90 border-danger-200 dark:border-danger-800 text-danger-900 dark:text-danger-200'
                : toast.type === 'success'
                ? 'bg-success-50 dark:bg-success-950/90 border-success-200 dark:border-success-800 text-success-900 dark:text-success-200'
                : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100'
            }`}
          >
            <div className="mr-3 flex-shrink-0 mt-0.5">
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-danger-500" />}
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-success-500" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-info-500" />}
            </div>
            <div className="flex-1 font-medium">{toast.message}</div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
              className="ml-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
};
