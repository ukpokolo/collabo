'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/features/tasks/api';
import type {
  CreateTaskInput,
  Task,
  TaskFilters,
  TaskStatus,
  UpdateTaskInput,
} from '@/features/tasks/types';
import type { BoardMember } from '@/features/board/types';
import { taskKeys } from '@/features/tasks/keys';
import { boardKeys } from '@/features/board/keys';
import { useBoardId } from '@/features/board/context';

function applyPatch(task: Task, input: UpdateTaskInput, users: BoardMember[] | undefined): Task {
  const next: Task = { ...task, ...input };

  // `assigned_to` is an id but the UI renders `assignee`, so resolve the
  // nested object too or the avatar lags behind until the server replies.
  if ('assigned_to' in input) {
    next.assignee =
      input.assigned_to == null
        ? null
        : (users?.find((user) => user.id === input.assigned_to) ?? task.assignee);
  }

  return next;
}

export function useTasks(filters: TaskFilters = {}) {
  const boardId = useBoardId();

  return useQuery({
    queryKey: taskKeys.filtered(boardId, filters),
    queryFn: ({ signal }) => tasksApi.list(boardId, filters, signal),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });
}

function patchLists(client: QueryClient, boardId: number, update: (tasks: Task[]) => Task[]) {
  // setQueriesData matches on key prefix, so guard against anything that
  // isn't a list being handed to a list updater.
  client.setQueriesData<Task[]>({ queryKey: taskKeys.board(boardId) }, (current) =>
    Array.isArray(current) ? update(current) : current,
  );
}

export function useCreateTask() {
  const client = useQueryClient();
  const boardId = useBoardId();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksApi.create(boardId, input),

    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: taskKeys.board(boardId) });
      const snapshot = client.getQueriesData<Task[]>({ queryKey: taskKeys.board(boardId) });

      const optimistic: Task = {
        id: -Date.now(),
        board_id: boardId,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? 'todo',
        assigned_to: input.assigned_to ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignee: null,
      };

      patchLists(client, boardId, (tasks) => [optimistic, ...tasks]);
      return { snapshot, optimisticId: optimistic.id };
    },

    onSuccess: (created, _input, context) => {
      patchLists(client, boardId, (tasks) =>
        tasks.map((task) => (task.id === context?.optimisticId ? created : task)),
      );
    },

    onError: (_error, _input, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
    },
  });
}

export function useUpdateTask() {
  const client = useQueryClient();
  const boardId = useBoardId();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTaskInput }) =>
      tasksApi.update(id, input),

    onMutate: async ({ id, input }) => {
      await client.cancelQueries({ queryKey: taskKeys.board(boardId) });
      const snapshot = client.getQueriesData<Task[]>({ queryKey: taskKeys.board(boardId) });
      const previousDetail = client.getQueryData<Task>(taskKeys.detail(id));
      const users = client.getQueryData<BoardMember[]>(boardKeys.members(boardId));

      patchLists(client, boardId, (tasks) =>
        tasks.map((task) => (task.id === id ? applyPatch(task, input, users) : task)),
      );

      if (previousDetail) {
        client.setQueryData<Task>(taskKeys.detail(id), applyPatch(previousDetail, input, users));
      }

      return { snapshot, previousDetail };
    },

    onSuccess: (updated) => {
      client.setQueryData<Task>(taskKeys.detail(updated.id), updated);
      patchLists(client, boardId, (tasks) =>
        tasks.map((task) => (task.id === updated.id ? updated : task)),
      );
    },

    onError: (_error, { id }, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
      if (context?.previousDetail) client.setQueryData(taskKeys.detail(id), context.previousDetail);
    },
  });
}

export function useDeleteTask() {
  const client = useQueryClient();
  const boardId = useBoardId();

  return useMutation({
    mutationFn: (id: number) => tasksApi.remove(id),

    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: taskKeys.board(boardId) });
      const snapshot = client.getQueriesData<Task[]>({ queryKey: taskKeys.board(boardId) });

      patchLists(client, boardId, (tasks) => tasks.filter((task) => task.id !== id));
      return { snapshot };
    },

    onError: (_error, _id, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
    },
  });
}

export function useMoveTask() {
  const { mutate } = useUpdateTask();
  return (id: number, status: TaskStatus) => mutate({ id, input: { status } });
}
