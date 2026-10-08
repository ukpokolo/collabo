'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

const LENGTH = 6;

export function OtpInput({ value, onChange, error, disabled }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');

    if (!digits) {
      const chars = value.split('');
      chars[index] = '';
      onChange(chars.join(''));
      return;
    }

    if (digits.length > 1) {
      onChange(digits.slice(0, LENGTH));
      refs.current[Math.min(digits.length, LENGTH - 1)]?.focus();
      return;
    }

    const chars = value.padEnd(index, ' ').split('');
    chars[index] = digits;
    onChange(chars.join('').replace(/ /g, '').slice(0, LENGTH));
    if (index < LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !value[index] && index > 0) refs.current[index - 1]?.focus();
    if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < LENGTH - 1) refs.current[index + 1]?.focus();
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-1.5 sm:gap-2" role="group" aria-label="Verification code">
        {Array.from({ length: LENGTH }).map((_, index) => (
          <input
            key={index}
            ref={(element) => {
              refs.current[index] = element;
            }}
            value={value[index] ?? ''}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            disabled={disabled}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={LENGTH}
            aria-label={`Digit ${index + 1}`}
            aria-invalid={error ? true : undefined}
            className={cn(
              'h-11 w-full min-w-0 rounded-md border bg-surface text-center text-lg font-semibold text-foreground outline-none transition-colors disabled:opacity-60 sm:h-12',
              error
                ? 'border-danger focus:ring-2 focus:ring-danger/20'
                : 'border-line focus:border-primary focus:ring-2 focus:ring-primary/20',
            )}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
