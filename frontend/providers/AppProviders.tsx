'use client';

import { useState, type ReactNode } from 'react';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/Toaster';
import { describeError } from '@/components/ui/ErrorState';
import { ApiError } from '@/lib/api/http';
import { toast } from '@/store/useToastStore';

export function AppProviders({ children }: { children: ReactNode }) {
  // Created in state so each browser session gets its own client. A
  // module-level instance would be shared across server-rendered requests.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Every failed mutation reports itself. Without this, optimistic
        // rollback looks identical to nothing having happened.
        mutationCache: new MutationCache({
          onError: (error) => {
            // Field validation is rendered inline by the forms that own it.
            if (error instanceof ApiError && error.status === 422) return;
            toast.error(describeError(error));
          },
        }),
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
