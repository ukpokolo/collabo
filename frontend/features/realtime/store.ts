import { create } from 'zustand';

/** Pusher's connection states, which Reverb's client reports. */
export type ConnectionState =
  | 'initialized'
  | 'connecting'
  | 'connected'
  | 'unavailable'
  | 'failed'
  | 'disconnected';

interface RealtimeState {
  connection: ConnectionState;
  /** Whether the socket has been connected at least once since this page loaded. */
  hasConnected: boolean;
  setConnection: (connection: ConnectionState) => void;
}

/** UI-only: whether live updates are flowing. Holds no task data. */
export const useRealtimeStore = create<RealtimeState>((set) => ({
  connection: 'initialized',
  hasConnected: false,
  setConnection: (connection) =>
    set((state) => ({
      connection,
      hasConnected: state.hasConnected || connection === 'connected',
    })),
}));

/** True when updates from other people are not reaching this tab. */
export function isPaused(connection: ConnectionState, hasConnected: boolean): boolean {
  if (connection === 'unavailable' || connection === 'failed' || connection === 'disconnected') {
    return true;
  }
  // 'connecting' is normal on first load; after a drop it means "retrying".
  return connection === 'connecting' && hasConnected;
}
