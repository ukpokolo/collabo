export const boardKeys = {
  all: ['boards'] as const,
  // Rooted at 'board' (not under 'boards') for the same reason as the task
  // keys: a prefix sweep of the list must never reach a single-object entry.
  detail: (boardId: number) => ['board', boardId] as const,
  members: (boardId: number) => ['board', boardId, 'members'] as const,
};
