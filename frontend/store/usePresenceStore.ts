import { create } from 'zustand';
import type { PresenceMember } from '@/lib/types';

export type PresenceStatus = 'idle' | 'connecting' | 'online' | 'unauthorized';

interface PresenceState {
  members: PresenceMember[];
  status: PresenceStatus;

  setStatus: (status: PresenceStatus) => void;
  setMembers: (members: PresenceMember[]) => void;
  addMember: (member: PresenceMember) => void;
  removeMember: (member: PresenceMember) => void;
  reset: () => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  members: [],
  status: 'idle',

  setStatus: (status) => set({ status }),
  setMembers: (members) => set({ members }),

  addMember: (member) =>
    set((state) =>
      state.members.some((m) => m.id === member.id)
        ? state
        : { members: [...state.members, member] },
    ),

  removeMember: (member) =>
    set((state) => ({ members: state.members.filter((m) => m.id !== member.id) })),

  reset: () => set({ members: [], status: 'idle' }),
}));
