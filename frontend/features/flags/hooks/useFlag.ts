'use client';

import { useQuery } from '@tanstack/react-query';
import { flagsApi } from '@/features/flags/api';
import { flagKeys } from '@/features/flags/keys';
import type { FlagName } from '@/features/flags/definitions';

/** All of the signed-in user's flags. Refetched on focus so a kill switch lands without a redeploy. */
export function useFlags() {
  return useQuery({
    queryKey: flagKeys.all,
    queryFn: ({ signal }) => flagsApi.list(signal),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Whether one flag is on. Off while loading and if the request fails, so a
 * gated feature never flashes in and then disappears.
 */
export function useFlag(name: FlagName): boolean {
  const { data } = useFlags();
  return data?.[name] === true;
}
