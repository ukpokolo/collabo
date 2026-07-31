'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, type AuthSuccess } from '@/lib/api/auth';
import { QUERY_KEYS } from '@/lib/constants';
import { clearToken, hasToken, setToken } from '@/lib/auth/token';
import { disconnectEcho } from '@/lib/echo';

export function useSession() {
  const query = useQuery({
    queryKey: QUERY_KEYS.session,
    queryFn: ({ signal }) => authApi.me(signal),
    enabled: hasToken(),
    retry: false,
    staleTime: 5 * 60_000,
  });

  return {
    user: query.data ?? null,
    isLoading: hasToken() && query.isLoading,
    isAuthenticated: Boolean(query.data),
  };
}

export function useAuthSuccess() {
  const client = useQueryClient();
  const router = useRouter();

  return useCallback(
    (result: AuthSuccess, redirectTo = '/') => {
      setToken(result.token);
      client.setQueryData(QUERY_KEYS.session, result.user);
      router.replace(redirectTo);
    },
    [client, router],
  );
}

export function useLogout() {
  const client = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authApi.logout(),
    // onSettled, not onSuccess: a dead token still has to tear down locally.
    onSettled: () => {
      clearToken();
      disconnectEcho();
      client.clear();
      router.replace('/login');
    },
  });
}
