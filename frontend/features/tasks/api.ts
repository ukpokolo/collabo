import { http } from '@/lib/http';
import type {
  CreateTaskInput,
  Task,
  TaskFilters,
  TaskPage,
  UpdateTaskInput,
} from '@/features/tasks/types';

/** Turn the UI's filter state into the query string the API expects. */
export function buildTaskQuery(
  filters: TaskFilters,
  paging: { cursor?: string | null; limit?: number } = {},
): string {
  const params = new URLSearchParams();

  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.assignees?.length) params.set('assigned_to', filters.assignees.join(','));
  if (filters.status) params.set('status', filters.status);
  if (paging.limit) params.set('limit', String(paging.limit));
  if (paging.cursor) params.set('cursor', paging.cursor);

  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * Task endpoints. List and create hang off a board; show, update and delete
 * address the task directly. This is the only module that knows about URLs.
 */
export const tasksApi = {
  list: (
    boardId: number,
    filters: TaskFilters = {},
    paging: { cursor?: string | null; limit?: number } = {},
    signal?: AbortSignal,
  ) => http<TaskPage>(`/api/boards/${boardId}/tasks${buildTaskQuery(filters, paging)}`, { signal }),

  get: (id: number, signal?: AbortSignal) => http<Task>(`/api/tasks/${id}`, { signal }),

  create: (boardId: number, input: CreateTaskInput) =>
    http<Task>(`/api/boards/${boardId}/tasks`, { method: 'POST', body: input }),

  update: (id: number, input: UpdateTaskInput) =>
    http<Task>(`/api/tasks/${id}`, { method: 'PUT', body: input }),

  remove: (id: number) => http<{ message: string }>(`/api/tasks/${id}`, { method: 'DELETE' }),
};
