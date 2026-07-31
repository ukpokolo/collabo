import { http } from '@/lib/api/http';
import type { CreateTaskInput, Task, TaskFilters, UpdateTaskInput } from '@/lib/types';

/** Turn the UI's filter state into the query string the API expects. */
export function buildTaskQuery(filters: TaskFilters): string {
  const params = new URLSearchParams();

  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.assignees?.length) params.set('assigned_to', filters.assignees.join(','));
  if (filters.status) params.set('status', filters.status);

  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * Task endpoints. One function per route on the Laravel apiResource — this is
 * the only module that knows about URLs, so components and hooks never build
 * one themselves.
 */
export const tasksApi = {
  list: (filters: TaskFilters = {}, signal?: AbortSignal) =>
    http<Task[]>(`/api/tasks${buildTaskQuery(filters)}`, { signal }),

  get: (id: number, signal?: AbortSignal) => http<Task>(`/api/tasks/${id}`, { signal }),

  create: (input: CreateTaskInput) => http<Task>('/api/tasks', { method: 'POST', body: input }),

  update: (id: number, input: UpdateTaskInput) =>
    http<Task>(`/api/tasks/${id}`, { method: 'PUT', body: input }),

  remove: (id: number) => http<{ message: string }>(`/api/tasks/${id}`, { method: 'DELETE' }),
};
