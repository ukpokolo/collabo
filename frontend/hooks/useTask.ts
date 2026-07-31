'use client';

import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api/tasks';
import { usersApi } from '@/lib/api/users';
import { QUERY_KEYS } from '@/lib/constants';

/** A single task, for the detail page. */
export function useTask(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.task(id),
    queryFn: ({ signal }) => tasksApi.get(id, signal),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 30_000,
  });
}

/**
 * Users available for assignment — the roster the assignee filter and the
 * detail page's picker both read from. Rarely changes, so cached generously.
 */
export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: ({ signal }) => usersApi.list(signal),
    staleTime: 5 * 60_000,
  });
}
