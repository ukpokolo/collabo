import { http } from '@/lib/http';
import type { Board, BoardMember, BoardRole } from '@/features/board/types';

/** The only module that knows board URLs. */
export const boardsApi = {
  list: (signal?: AbortSignal) => http<Board[]>('/api/boards', { signal }),

  get: (id: number, signal?: AbortSignal) => http<Board>(`/api/boards/${id}`, { signal }),

  create: (name: string) => http<Board>('/api/boards', { method: 'POST', body: { name } }),

  rename: (id: number, name: string) =>
    http<Board>(`/api/boards/${id}`, { method: 'PUT', body: { name } }),

  remove: (id: number) => http<{ message: string }>(`/api/boards/${id}`, { method: 'DELETE' }),

  members: (id: number, signal?: AbortSignal) =>
    http<BoardMember[]>(`/api/boards/${id}/members`, { signal }),

  addMember: (id: number, email: string, role: Exclude<BoardRole, 'owner'>) =>
    http<BoardMember>(`/api/boards/${id}/members`, { method: 'POST', body: { email, role } }),

  setMemberRole: (id: number, userId: number, role: Exclude<BoardRole, 'owner'>) =>
    http<BoardMember>(`/api/boards/${id}/members/${userId}`, { method: 'PUT', body: { role } }),

  removeMember: (id: number, userId: number) =>
    http<{ message: string }>(`/api/boards/${id}/members/${userId}`, { method: 'DELETE' }),
};
