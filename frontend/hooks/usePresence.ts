'use client';

import { useEffect } from 'react';
import { getEcho } from '@/lib/echo';
import { CHANNELS } from '@/lib/constants';
import { usePresenceStore } from '@/store/usePresenceStore';
import type { PresenceMember } from '@/lib/types';

export function usePresence() {
  const { setMembers, addMember, removeMember, setStatus, reset } = usePresenceStore();

  useEffect(() => {
    let cancelled = false;
    setStatus('connecting');

    const echo = getEcho();

    echo
      .join(CHANNELS.presence)
      .here((members: PresenceMember[]) => {
        if (cancelled) return;
        setMembers(members);
        setStatus('online');
      })
      .joining((member: PresenceMember) => !cancelled && addMember(member))
      .leaving((member: PresenceMember) => !cancelled && removeMember(member))
      .error(() => !cancelled && setStatus('unauthorized'));

    return () => {
      cancelled = true;
      // leaveChannel, not leave: leave() would also drop private-board.N.
      echo.leaveChannel(`presence-${CHANNELS.presence}`);
      reset();
    };
  }, [setMembers, addMember, removeMember, setStatus, reset]);
}
