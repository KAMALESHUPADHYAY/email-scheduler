import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '../components/ui/Toast';

export const metadata: Metadata = {
  title: 'ReachInbox Email Scheduler | Production Queue Platform',
  description: 'Production-quality scheduled email delivery with Redis, BullMQ, and PostgreSQL',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-brand-500 selection:text-white">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
