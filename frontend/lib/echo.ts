import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getToken } from '@/lib/auth/token';

type EchoClient = Echo<'reverb'>;

let client: EchoClient | null = null;

export function getEcho(): EchoClient {
  if (typeof window === 'undefined') {
    throw new Error('getEcho() is browser-only.');
  }

  if (client) return client;

  (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? 'http';
  const forceTLS = scheme === 'https';

  client = new Echo({
    broadcaster: 'reverb',
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY!,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST ?? 'localhost',
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    forceTLS,
    enabledTransports: forceTLS ? ['ws', 'wss'] : ['ws'],
    authEndpoint: '/broadcasting/auth',
    auth: {
      headers: {
        Authorization: `Bearer ${getToken() ?? ''}`,
        Accept: 'application/json',
      },
    },
  });

  return client;
}

/** Sent as X-Socket-Id so the backend's ->toOthers() can skip this client. */
export function getSocketId(): string | null {
  if (typeof window === 'undefined' || !client) return null;
  return client.socketId() ?? null;
}

export function disconnectEcho(): void {
  client?.disconnect();
  client = null;
}
