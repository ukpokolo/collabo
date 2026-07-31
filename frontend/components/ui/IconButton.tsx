'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type IconButtonTone = 'default' | 'danger' | 'onDark';

const TONES: Record<IconButtonTone, string> = {
  default: 'text-foreground-subtle hover:bg-surface-sunken hover:text-foreground',
  danger: 'text-foreground-subtle hover:bg-danger-soft hover:text-danger-foreground',
  onDark: 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground-strong',
};

const SIZES = {
  sm: 'h-6 w-6 [&_svg]:h-3.5 [&_svg]:w-3.5',
  md: 'h-8 w-8 [&_svg]:h-4 [&_svg]:w-4',
  lg: 'h-10 w-10 [&_svg]:h-5 [&_svg]:w-5',
} as const;

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: IconButtonTone;
  size?: keyof typeof SIZES;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, tone = 'default', size = 'md', className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'grid shrink-0 place-items-center rounded-md transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        'disabled:cursor-not-allowed disabled:opacity-60',
        TONES[tone],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
