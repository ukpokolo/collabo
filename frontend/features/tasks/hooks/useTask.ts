'use client';

import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/features/tasks/api';
import { usersApi } from '@/features/users/api';
import { taskKeys } from '@/features/tasks/keys';
import { userKeys } from '@/features/users/keys';

/** A single task, for the detail page. */
export function useTask(id: number) {
  return useQuery({
    queryKey: taskKeys.detail(id),
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
    queryKey: userKeys.all,
    queryFn: ({ signal }) => usersApi.list(signal),
    staleTime: 5 * 60_000,
  });
}
