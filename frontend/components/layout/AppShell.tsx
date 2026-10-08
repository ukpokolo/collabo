import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ConnectionBanner } from '@/features/realtime/components/ConnectionBanner';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ConnectionBanner />
        {children}
      </div>
    </div>
  );
}
