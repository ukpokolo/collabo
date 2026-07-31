export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface User {
  id: number;
  name: string;
  email?: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
  assignee: User | null;
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

export interface PresenceMember {
  id: number;
  name: string;
}
