'use client';

import { useEffect, useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Board } from '@/features/board/components/Board';
import { useDebounced } from '@/hooks/useDebounced';
import { useBoardStore } from '@/features/board/store';
import { ErrorState } from '@/components/ui/ErrorState';
import { TextLink } from '@/components/ui/TextLink';
import { useCurrentBoard } from '@/features/board/hooks/useBoards';
import { setLastBoardId } from '@/features/board/lastBoard';
import { ApiError } from '@/lib/http';
import type { TaskFilters } from '@/features/tasks/types';

/**
 * Owns the filter state shared between the top bar (which edits it) and the
 * board (which queries with it), so neither has to know about the other.
 */
export function BoardView() {
  const { search, assignees } = useBoardStore();
  const { data: board, isError, error, refetch } = useCurrentBoard();

  // "/" sends people back to the board they used last.
  useEffect(() => {
    if (board) setLastBoardId(board.id);
  }, [board]);

  // Debounced so typing doesn't fire a request per keystroke.
  const debouncedSearch = useDebounced(search, 300);

  const filters = useMemo<TaskFilters>(
    () => ({
      search: debouncedSearch.trim() || undefined,
      assignees: assignees.length ? assignees : undefined,
    }),
    [debouncedSearch, assignees],
  );

  const searching = search !== debouncedSearch;

  if (isError) {
    // Non-members get 404 from the API, same as a board that doesn't exist.
    const missing = error instanceof ApiError && error.status === 404;
    return (
      <div className="mx-auto w-full max-w-lg p-6">
        <ErrorState
          title={missing ? "This board doesn't exist, or you aren't on it" : "Couldn't load this board"}
          error={missing ? undefined : error}
          onRetry={missing ? undefined : () => refetch()}
          action={<TextLink href="/">Go to your boards</TextLink>}
        />
      </div>
    );
  }

  return (
    <>
      <TopBar searching={searching} />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Board filters={filters} />
      </main>
    </>
  );
}
