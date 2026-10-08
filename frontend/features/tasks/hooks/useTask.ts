'use client';

import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/features/tasks/api';
import { taskKeys } from '@/features/tasks/keys';

/** A single task, for the detail page. */
export function useTask(id: number) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: ({ signal }) => tasksApi.get(id, signal),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 30_000,
  });
}
