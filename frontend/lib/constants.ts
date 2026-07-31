import type { TaskStatus } from '@/lib/types';

export interface ColumnConfig {
  key: TaskStatus;
  label: string;
  dot: string;
  dropTint: string;
}

export const COLUMNS: readonly ColumnConfig[] = [
  {
    key: 'todo',
    label: 'To Do',
    dot: 'bg-slate-400',
    dropTint: 'bg-slate-500/5 ring-slate-400/40',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    dot: 'bg-blue-500',
    dropTint: 'bg-blue-500/5 ring-blue-400/40',
  },
  {
    key: 'done',
    label: 'Complete',
    dot: 'bg-emerald-500',
    dropTint: 'bg-emerald-500/5 ring-emerald-400/40',
  },
] as const;

export const BOARD_ID = 1;

export const CHANNELS = {
  board: `board.${BOARD_ID}`,
  presence: `board.${BOARD_ID}`,
} as const;

export const QUERY_KEYS = {
  tasks: ['tasks'] as const,
  tasksFiltered: (filters: unknown) => ['tasks', 'list', filters] as const,
  // Rooted at 'task', not 'tasks': a prefix match on ['tasks'] would otherwise
  // hand a single object to the list updaters in useTasks.
  task: (id: number) => ['task', id] as const,
  users: ['users'] as const,
  session: ['session'] as const,
};
