'use client';

import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useToastStore } from '@/store/useToastStore';
import { cn } from '@/lib/utils';

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end"
    >
      {toasts.map((toast) => {
        const Icon = toast.tone === 'error' ? AlertCircle : CheckCircle2;
        return (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-2 rounded-lg border p-3 text-sm shadow-lg',
              toast.tone === 'error'
                ? 'border-danger/30 bg-danger-soft text-danger-foreground'
                : 'border-success/30 bg-success-soft text-success-foreground',
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 break-words">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="shrink-0 rounded p-0.5 transition-colors hover:bg-foreground/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
