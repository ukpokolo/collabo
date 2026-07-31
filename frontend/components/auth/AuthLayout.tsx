import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Surface';

interface AuthLayoutProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-surface-muted px-4 py-8 sm:py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-base font-bold text-primary-foreground">
            C
          </span>
          <span className="text-lg font-semibold text-foreground">Collabo</span>
        </div>

        <Card className="p-5 sm:p-6">
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-foreground-muted">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </Card>

        {footer && (
          <div className="mt-4 text-center text-sm text-foreground-muted">{footer}</div>
        )}
      </div>
    </div>
  );
}
