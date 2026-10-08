import type { TaskStatus } from '@/features/tasks/types';

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
