'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    api
      .getMe()
      .then(() => {
        router.replace('/dashboard/scheduled');
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono font-bold text-neutral-500 tracking-wider">
          OUTBOX LABS
        </span>
      </div>
    </div>
  );
}
