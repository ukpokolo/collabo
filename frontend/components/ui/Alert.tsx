import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertTone = 'error' | 'success';

const TONES: Record<AlertTone, string> = {
  error: 'border-danger/30 bg-danger-soft text-danger-foreground',
  success: 'border-success/30 bg-success-soft text-success-foreground',
};

export function Alert({
  tone,
  children,
  className,
}: {
  tone: AlertTone;
  children: ReactNode;
  className?: string;
}) {
  const Icon = tone === 'error' ? AlertCircle : CheckCircle2;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2 rounded-md border p-3 text-sm', TONES[tone], className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}
