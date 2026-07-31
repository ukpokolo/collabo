'use client';

import { useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Board } from '@/components/board/Board';
import { useDebounced } from '@/hooks/useDebounced';
import { useBoardStore } from '@/store/useBoardStore';
import type { TaskFilters } from '@/lib/types';

/**
 * Owns the filter state shared between the top bar (which edits it) and the
 * board (which queries with it), so neither has to know about the other.
 */
export function BoardView() {
  const { search, assignees } = useBoardStore();

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

  return (
    <>
      <TopBar searching={searching} />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Board filters={filters} />
      </main>
    </>
  );
}
