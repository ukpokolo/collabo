'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { TextLink } from '@/components/ui/TextLink';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background px-4">
      <div className="w-full max-w-md">
        <ErrorState
          title="This page hit an error"
          error={error}
          onRetry={reset}
          action={
            <Button variant="ghost" size="sm" onClick={() => window.location.assign('/')}>
              Go to board
            </Button>
          }
        />
        {error.digest && (
          <p className="mt-3 text-center font-mono text-[11px] text-foreground-subtle">
            Reference: {error.digest}
          </p>
        )}
        <p className="mt-4 text-center text-sm text-foreground-muted">
          Still stuck? <TextLink href="/login">Sign in again</TextLink>
        </p>
      </div>
    </div>
  );
}
