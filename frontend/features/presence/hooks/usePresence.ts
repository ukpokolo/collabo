'use client';

import { useEffect } from 'react';
import { getEcho } from '@/lib/echo';
import { boardChannel } from '@/lib/channels';
import { useBoardId } from '@/features/board/context';
import { usePresenceStore } from '@/features/presence/store';
import type { PresenceMember } from '@/features/presence/types';

export function usePresence() {
  const boardId = useBoardId();
  const { setMembers, addMember, removeMember, setStatus, reset } = usePresenceStore();

  useEffect(() => {
    let cancelled = false;
    setStatus('connecting');

    const echo = getEcho();

    echo
      .join(boardChannel(boardId))
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
      echo.leaveChannel(`presence-${boardChannel(boardId)}`);
      reset();
    };
  }, [boardId, setMembers, addMember, removeMember, setStatus, reset]);
}
