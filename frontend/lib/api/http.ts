import { getSocketId } from '@/lib/echo';
import { clearToken, getToken } from '@/lib/auth/token';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors?: Record<string, string[]>,
    readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  fieldError(field: string): string | undefined {
    return this.errors?.[field]?.[0];
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  anonymous?: boolean;
}

export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, anonymous = false } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (!anonymous) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const socketId = getSocketId();
  if (socketId) headers['X-Socket-Id'] = socketId;

  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const record = (payload ?? {}) as { message?: string; errors?: Record<string, string[]> };

    // A rejected token can't be recovered from; drop it so the guard redirects
    // instead of looping on 401s.
    if (response.status === 401 && !anonymous) clearToken();

    throw new ApiError(
      record.message ?? `Request failed with status ${response.status}`,
      response.status,
      record.errors,
      payload,
    );
  }

  return payload as T;
}
