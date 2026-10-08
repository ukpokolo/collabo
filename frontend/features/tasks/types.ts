import type { User } from '@/features/users/types';

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: number;
  board_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
  assignee: User | null;
}

/** One page of GET /api/boards/{id}/tasks (keyset-paged on id, newest id first). */
export interface TaskPage {
  data: Task[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  assigned_to?: number | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  assigned_to?: number | null;
}

/**
 * On a 'deleted' event the row is already gone, so the API sends only `{ id }`.
 * Narrow on `type` before reading any other field.
 */
export type TaskUpdatedEvent =
  | { type: 'created'; task: Task }
  | { type: 'updated'; task: Task }
  | { type: 'deleted'; task: Pick<Task, 'id'> };

export interface TaskFilters {
  search?: string;
  assignees?: Array<number | 'unassigned'>;
  status?: TaskStatus;
}
