'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/http';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Too many requests. Wait a moment and try again.';
    if (error.status === 401) return 'Your session expired. Please sign in again.';
    if (error.status === 403) return "You don't have access to this.";
    if (error.status === 404) return 'That item no longer exists.';
    if (error.status >= 500) return 'The server had a problem. Try again shortly.';
    return error.message;
  }

  if (error instanceof TypeError) return "Couldn't reach the server. Check your connection.";
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

export function ErrorState({
  title = 'Something went wrong',
  error,
  onRetry,
  action,
  className,
  compact,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft',
        compact ? 'p-3' : 'p-4',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-danger-foreground">{title}</p>
        {error !== undefined && (
          <p className="mt-0.5 break-words text-xs text-danger-foreground/80">
            {describeError(error)}
          </p>
        )}
        {(onRetry || action) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {onRetry && (
              <Button size="sm" variant="secondary" onClick={onRetry}>
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </Button>
            )}
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-2 px-4 py-10 text-center', className)}>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-xs text-xs text-foreground-muted">{description}</p>}
      {action}
    </div>
  );
}
