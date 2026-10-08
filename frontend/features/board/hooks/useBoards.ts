'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { boardsApi } from '@/features/board/api';
import { boardKeys } from '@/features/board/keys';
import { useBoardId } from '@/features/board/context';
import type { BoardRole } from '@/features/board/types';

/** Every board the signed-in user belongs to. */
export function useBoards() {
  return useQuery({
    queryKey: boardKeys.all,
    queryFn: ({ signal }) => boardsApi.list(signal),
    staleTime: 60_000,
  });
}

/** The current board (from context), including the user's role on it. */
export function useCurrentBoard() {
  const boardId = useBoardId();

  return useQuery({
    queryKey: boardKeys.detail(boardId),
    queryFn: ({ signal }) => boardsApi.get(boardId, signal),
    staleTime: 60_000,
    retry: false,
  });
}

/**
 * The people on the current board — the roster the assignee filter and the
 * detail page's picker read from. This replaces the old all-users list.
 */
export function useBoardMembers() {
  const boardId = useBoardId();

  return useQuery({
    queryKey: boardKeys.members(boardId),
    queryFn: ({ signal }) => boardsApi.members(boardId, signal),
    staleTime: 5 * 60_000,
  });
}

export function useCreateBoard() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => boardsApi.create(name),
    onSuccess: () => client.invalidateQueries({ queryKey: boardKeys.all }),
  });
}

export function useRenameBoard() {
  const client = useQueryClient();
  const boardId = useBoardId();

  return useMutation({
    mutationFn: (name: string) => boardsApi.rename(boardId, name),
    onSuccess: (board) => {
      client.setQueryData(boardKeys.detail(boardId), board);
      client.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}

export function useDeleteBoard() {
  const client = useQueryClient();
  const boardId = useBoardId();

  return useMutation({
    mutationFn: () => boardsApi.remove(boardId),
    onSuccess: () => client.invalidateQueries({ queryKey: boardKeys.all }),
  });
}

export function useAddMember() {
  const client = useQueryClient();
  const boardId = useBoardId();

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: Exclude<BoardRole, 'owner'> }) =>
      boardsApi.addMember(boardId, email, role),
    onSuccess: () => client.invalidateQueries({ queryKey: boardKeys.members(boardId) }),
  });
}

export function useSetMemberRole() {
  const client = useQueryClient();
  const boardId = useBoardId();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: Exclude<BoardRole, 'owner'> }) =>
      boardsApi.setMemberRole(boardId, userId, role),
    onSuccess: () => client.invalidateQueries({ queryKey: boardKeys.members(boardId) }),
  });
}

export function useRemoveMember() {
  const client = useQueryClient();
  const boardId = useBoardId();

  return useMutation({
    mutationFn: (userId: number) => boardsApi.removeMember(boardId, userId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: boardKeys.members(boardId) });
      client.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}
