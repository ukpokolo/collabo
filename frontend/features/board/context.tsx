'use client';

import { createContext, useContext, type ReactNode } from 'react';

const BoardIdContext = createContext<number | null>(null);

/**
 * Tells everything below which board it is showing, so the task, presence and
 * realtime hooks need no board argument threaded through every component.
 */
export function BoardProvider({ boardId, children }: { boardId: number; children: ReactNode }) {
  return <BoardIdContext.Provider value={boardId}>{children}</BoardIdContext.Provider>;
}

export function useBoardId(): number {
  const boardId = useContext(BoardIdContext);
  if (boardId === null) throw new Error('useBoardId must be used inside <BoardProvider>.');
  return boardId;
}
