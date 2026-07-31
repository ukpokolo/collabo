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
import { BoardColumn } from '@/components/board/BoardColumn';
import { TaskCardView } from '@/components/board/TaskCard';
import { Skeleton } from '@/components/ui/Surface';
import { ErrorState } from '@/components/ui/ErrorState';
import { COLUMNS } from '@/lib/constants';
import { useBoardStore } from '@/store/useBoardStore';
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '@/hooks/useTasks';
import { useTaskBroadcast } from '@/hooks/useTaskBroadcast';
import { usePresence } from '@/hooks/usePresence';
import { useUsers } from '@/hooks/useTask';
import { TASK_STATUSES, type Task, type TaskFilters, type TaskStatus } from '@/lib/types';

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);
}

export function Board({ filters = {} }: { filters?: TaskFilters }) {
  const router = useRouter();
  const { data: tasks, isLoading, isError, error, refetch, isFetching } = useTasks(filters);
  const { data: users } = useUsers();
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
    if (!task || task.status === target) return;

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTaskId(null)}
    >
      <div className="flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto p-3 sm:snap-none sm:gap-4 sm:p-5">
        {COLUMNS.map((column) => (
          <BoardColumn
            key={column.key}
            column={column}
            tasks={byStatus.get(column.key) ?? []}
            users={users}
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
