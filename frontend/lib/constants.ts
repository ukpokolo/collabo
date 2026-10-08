// Temporary re-exports while consumers migrate to their feature modules.
// Removed once nothing imports '@/lib/constants'.
import { sessionKeys } from '@/features/auth/keys';
import { taskKeys } from '@/features/tasks/keys';
import { userKeys } from '@/features/users/keys';

export { COLUMNS, type ColumnConfig } from '@/features/board/constants';
export { BOARD_ID, CHANNELS } from '@/lib/channels';

export const QUERY_KEYS = {
  tasks: taskKeys.all,
  tasksFiltered: taskKeys.filtered,
  task: taskKeys.detail,
  users: userKeys.all,
  session: sessionKeys.current,
};
