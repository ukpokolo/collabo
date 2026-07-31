import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn('font-medium text-primary transition-colors hover:underline', className)}
    >
      {children}
    </Link>
  );
}

export function TextButton({
  onClick,
  disabled,
  children,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'font-medium text-primary transition-colors hover:underline disabled:opacity-60',
        className,
      )}
    >
      {children}
    </button>
  );
}
