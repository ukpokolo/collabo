'use client';

import type { ReactNode } from 'react';
import { useFlag } from '@/features/flags/hooks/useFlag';
import type { FlagName } from '@/features/flags/definitions';

/** Renders its children only when the flag is on. */
export function Gate({
  flag,
  children,
  fallback = null,
}: {
  flag: FlagName;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useFlag(flag) ? <>{children}</> : <>{fallback}</>;
}
