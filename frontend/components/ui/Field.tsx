'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, className, id, ...props },
  ref,
) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'w-full rounded-md border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-subtle',
          error
            ? 'border-danger focus:ring-2 focus:ring-danger/20'
            : 'border-line focus:border-primary focus:ring-2 focus:ring-primary/20',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger-foreground">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-foreground-subtle">{hint}</p>
      ) : null}
    </div>
  );
});
