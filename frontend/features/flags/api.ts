import { http } from '@/lib/http';
import type { FlagMap } from '@/features/flags/definitions';

export const flagsApi = {
  list: (signal?: AbortSignal) => http<FlagMap>('/api/features', { signal }),
};
