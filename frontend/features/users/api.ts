import { http } from '@/lib/api/http';
import type { User } from '@/features/users/types';

export const usersApi = {
  list: (signal?: AbortSignal) => http<User[]>('/api/users', { signal }),
};
