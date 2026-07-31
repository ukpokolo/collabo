'use client';

import { useDroppable } from '@dnd-kit/core';
import { MoreHorizontal, Plus } from 'lucide-react';
import { TaskCard } from '@/components/board/TaskCard';
import { AddTaskComposer } from '@/components/board/AddTaskComposer';
import { Badge } from '@/components/ui/Surface';
import { IconButton } from '@/components/ui/IconButton';
import { useBoardStore } from '@/store/useBoardStore';
import { cn } from '@/lib/utils';
import type { ColumnConfig } from '@/lib/constants';
import type { Task, TaskStatus, User } from '@/lib/types';

interface BoardColumnProps {
  column: ColumnConfig;
  tasks: Task[];
  users?: User[];
  onCreate: (title: string, status: TaskStatus) => void;
  onDelete: (id: number) => void;
  onOpen: (id: number) => void;
  onAssigneeChange?: (id: number, assigned_to: number | null) => void;
}

export function BoardColumn({
  column,
  tasks,
  users,
  onCreate,
  onDelete,
  onOpen,
  onAssigneeChange,
}: BoardColumnProps) {
  const openComposer = useBoardStore((state) => state.openComposer);

  // The only drop target on the board. Its id IS the status, so onDragEnd
  // needs no lookup.
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <section
      className="flex w-[85vw] shrink-0 snap-start flex-col sm:w-[300px]"
      aria-label={column.label}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', column.dot)} />
          <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            {column.label}
          </h2>
          <Badge>{tasks.length}</Badge>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            label={`Add task to ${column.label}`}
            size="sm"
            onClick={() => openComposer(column.key)}
          >
            <Plus />
          </IconButton>
          <IconButton label={`${column.label} options`} size="sm">
            <MoreHorizontal />
          </IconButton>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[160px] flex-1 flex-col gap-2 rounded-xl bg-surface-muted p-2 ring-2 ring-transparent transition-colors',
          isOver && column.dropTint,
        )}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            users={users}
            onDelete={onDelete}
            onOpen={onOpen}
            onAssigneeChange={onAssigneeChange}
          />
        ))}

        {tasks.length === 0 && (
          <p className="pointer-events-none px-2 py-6 text-center text-xs text-foreground-subtle">
            Drop tasks here
          </p>
        )}

        <AddTaskComposer status={column.key} onCreate={onCreate} />
      </div>
    </section>
  );
}
