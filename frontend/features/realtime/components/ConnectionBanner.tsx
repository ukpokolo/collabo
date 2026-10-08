'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { isPaused, useRealtimeStore } from '@/features/realtime/store';

/** How long updates must be paused before we say so, so a blip doesn't flash a banner. */
const GRACE_MS = 3000;

export function ConnectionBanner() {
  const connection = useRealtimeStore((state) => state.connection);
  const hasConnected = useRealtimeStore((state) => state.hasConnected);
  const paused = isPaused(connection, hasConnected);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!paused) {
      setShow(false);
      return;
    }
    const timer = window.setTimeout(() => setShow(true), GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [paused]);

  if (!show) return null;

  return (
    <div
      role="status"
      className="flex shrink-0 items-center gap-2 border-b border-warning/30 bg-warning-soft px-3 py-1.5 text-xs font-medium text-warning-foreground sm:px-5"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>
        {connection === 'failed'
          ? "Live updates aren't available here. Refresh to see other people's changes."
          : "Live updates are paused. Reconnecting… You'll catch up automatically."}
      </span>
    </div>
  );
}
