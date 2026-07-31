import type { Metadata } from 'next';
import { AppProviders } from '@/providers/AppProviders';
import './globals.css';

export const metadata: Metadata = {
  title: 'Collabo — Real-time Kanban',
  description: 'Laravel + Reverb + Next.js real-time kanban board',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
