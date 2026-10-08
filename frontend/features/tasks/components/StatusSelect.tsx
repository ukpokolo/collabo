'use client';

import { COLUMNS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/lib/types';

interface StatusSelectProps {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
  disabled?: boolean;
}

export function StatusSelect({ value, onChange, disabled }: StatusSelectProps) {
  return (
    <div role="radiogroup" aria-label="Status" className="flex flex-wrap gap-1.5">
      {COLUMNS.map((column) => {
        const active = column.key === value;
        return (
          <button
            key={column.key}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(column.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
              active
                ? 'border-primary/40 bg-primary-soft text-primary'
                : 'border-line text-foreground-muted hover:bg-surface-muted',
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', column.dot)} />
            {column.label}
          </button>
        );
      })}
    </div>
  );
}
