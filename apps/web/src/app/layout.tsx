import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '../components/ui/Toast';
import { ThemeProvider } from '../components/ThemeProvider';

export const metadata: Metadata = {
  title: 'MailPilot | High-Performance Cold Email Dispatch & Queue Engine',
  description:
    'Reliable, restart-safe cold email scheduler with BullMQ queue orchestration, atomic rate limits, and live delivery telemetry.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('mailpilot_theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="antialiased selection:bg-primary-500 selection:text-white bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 min-h-screen">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
