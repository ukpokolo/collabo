'use client';

import { useEffect, useState } from 'react';

/**
 * Delay a rapidly-changing value.
 *
 * Used so typing in the search box doesn't fire a request per keystroke —
 * the debounced value is what goes into the query key.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
