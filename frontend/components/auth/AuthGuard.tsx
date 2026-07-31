'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { hasToken } from '@/lib/auth/token';

/**
 * Convenience gate, not the security boundary — every protected endpoint sits
 * behind auth:sanctum, so bypassing this yields an empty shell and 401s.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useSession();
  const tokenPresent = hasToken();

  useEffect(() => {
    if (!tokenPresent) router.replace('/login');
  }, [tokenPresent, router]);

  useEffect(() => {
    if (tokenPresent && !isLoading && !isAuthenticated) router.replace('/login');
  }, [tokenPresent, isLoading, isAuthenticated, router]);

  if (!tokenPresent || isLoading || !isAuthenticated) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your board…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
