'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { BoardColumn } from '@/features/board/components/BoardColumn';
import { TaskCardView } from '@/features/tasks/components/TaskCard';
import { Skeleton } from '@/components/ui/Surface';
import { ErrorState } from '@/components/ui/ErrorState';
import { COLUMNS } from '@/features/board/constants';
import { useBoardStore } from '@/features/board/store';
import {
  MAX_TASKS_LOADED,
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
} from '@/features/tasks/hooks/useTasks';
import { Alert } from '@/components/ui/Alert';
import { useTaskBroadcast } from '@/features/tasks/hooks/useTaskBroadcast';
import { usePresence } from '@/features/presence/hooks/usePresence';
import { useBoardMembers, useCurrentBoard } from '@/features/board/hooks/useBoards';
import {
  TASK_STATUSES,
  type Task,
  type TaskFilters,
  type TaskStatus,
} from '@/features/tasks/types';

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);
}

export function Board({ filters = {} }: { filters?: TaskFilters }) {
  const router = useRouter();
  const { data: tasks, isLoading, isError, error, refetch, isFetching } = useTasks(filters);
  const { data: users } = useBoardMembers();
  const { data: board } = useCurrentBoard();
  // Viewers can read but not change anything. The API enforces this too; this
  // just stops the UI offering actions that would be refused.
  const readOnly = board?.role === 'viewer';
  const { mutate: createTask } = useCreateTask();
  const { mutate: updateTask } = useUpdateTask();
  const { mutate: deleteTask } = useDeleteTask();

  useTaskBroadcast();
  usePresence();

  const { activeTaskId, setActiveTaskId } = useBoardStore();

  const sensors = useSensors(
    // A short distance threshold keeps a plain tap working as a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const visible = useMemo(() => tasks ?? [], [tasks]);

  const byStatus = useMemo(() => {
    const groups = new Map<TaskStatus, Task[]>(COLUMNS.map((column) => [column.key, []]));
    for (const task of visible) groups.get(task.status)?.push(task);
    return groups;
  }, [visible]);

  const activeTask = activeTaskId ? visible.find((task) => task.id === activeTaskId) : undefined;

  const handleDragStart = (event: DragStartEvent) => setActiveTaskId(Number(event.active.id));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTaskId(null);
    if (!over) return;

    const target = over.id;
    if (!isTaskStatus(target)) return;

    const task = active.data.current?.task as Task | undefined;
    if (readOnly || !task || task.status === target) return;

    updateTask({ id: task.id, input: { status: target } });
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto p-3 sm:p-5">
        {COLUMNS.map((column) => (
          <div key={column.key} className="w-[85vw] shrink-0 space-y-2 sm:w-[300px]">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-[160px] rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load tasks"
        error={error}
        onRetry={() => refetch()}
        className="m-3 sm:m-5"
      />
    );
  }

  const truncated = visible.length >= MAX_TASKS_LOADED;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTaskId(null)}
    >
      {truncated && (
        <div className="px-3 pt-3 sm:px-5 sm:pt-5">
          <Alert tone="error">
            Showing the {MAX_TASKS_LOADED.toLocaleString()} most recent tasks. Use search or the
            assignee filter to find older ones.
          </Alert>
        </div>
      )}
      <div className="flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto p-3 sm:snap-none sm:gap-4 sm:p-5">
        {COLUMNS.map((column) => (
          <BoardColumn
            key={column.key}
            column={column}
            tasks={byStatus.get(column.key) ?? []}
            users={users}
            readOnly={readOnly}
            onCreate={(title, status) => createTask({ title, status })}
            onDelete={(id) => deleteTask(id)}
            onOpen={(id) => router.push(`/tasks/${id}`)}
            onAssigneeChange={(id, assigned_to) => updateTask({ id, input: { assigned_to } })}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? <TaskCardView task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
