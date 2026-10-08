export type BoardRole = 'owner' | 'member' | 'viewer';

export interface Board {
  id: number;
  name: string;
  owner_id: number;
  /** The signed-in user's role on this board. */
  role: BoardRole;
  members_count: number | null;
}

export interface BoardMember {
  id: number;
  name: string;
  email: string;
  role: BoardRole;
}

/** Owners and members may create, edit and delete tasks; viewers only read. */
export function canWriteTasks(role: BoardRole | undefined): boolean {
  return role === 'owner' || role === 'member';
}
