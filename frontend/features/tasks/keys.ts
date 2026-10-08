export const taskKeys = {
  // Prefix for every task list query, on every board.
  all: ['tasks'] as const,
  // Prefix for one board's lists. Optimistic updates sweep this, never `all`,
  // so a task created on one board can never appear in another board's cache.
  board: (boardId: number) => ['tasks', 'list', boardId] as const,
  filtered: (boardId: number, filters: unknown) => ['tasks', 'list', boardId, filters] as const,
  // Rooted at 'task', not 'tasks': a prefix match on ['tasks'] would otherwise
  // hand a single object to the list updaters in useTasks.
  detail: (id: number) => ['task', id] as const,
};
