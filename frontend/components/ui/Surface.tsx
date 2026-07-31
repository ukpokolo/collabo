import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-line bg-surface shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-foreground-muted',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success-foreground',
  danger: 'bg-danger-soft text-danger-foreground',
  warning: 'bg-warning-soft text-warning-foreground',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-sunken', className)} />;
}

export function SectionLabel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <h2
      className={cn(
        'text-xs font-semibold uppercase tracking-wide text-foreground-muted',
        className,
      )}
    >
      {children}
    </h2>
  );
}
