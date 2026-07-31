const STORAGE_KEY = 'collabo:token';

let cached: string | null = null;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  if (cached !== null) return cached;
  cached = window.localStorage.getItem(STORAGE_KEY);
  return cached;
}

export function setToken(token: string): void {
  cached = token;
  window.localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  cached = null;
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
}

export function hasToken(): boolean {
  return getToken() !== null;
}
