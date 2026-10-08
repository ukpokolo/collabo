// Temporary re-exports while consumers migrate to their feature modules.
// Removed once nothing imports '@/lib/types'.
export * from '@/features/tasks/types';
export type { User } from '@/features/users/types';
export type { PresenceMember } from '@/features/presence/types';
