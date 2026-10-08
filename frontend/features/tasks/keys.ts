export const taskKeys = {
  // Prefix for every list query; mutations sweep it with setQueriesData.
  all: ['tasks'] as const,
  filtered: (filters: unknown) => ['tasks', 'list', filters] as const,
  // Rooted at 'task', not 'tasks': a prefix match on ['tasks'] would otherwise
  // hand a single object to the list updaters in useTasks.
  detail: (id: number) => ['task', id] as const,
};
