import { create } from 'zustand';
import type { TaskStatus } from '@/lib/types';

/**
 * Ephemeral UI state. Holds no task data — tasks are server state and live in
 * the TanStack Query cache; duplicating them here creates two sources of truth.
 */
interface BoardState {
  activeTaskId: number | null;
  composerColumn: TaskStatus | null;
  search: string;
  assignees: Array<number | 'unassigned'>;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;

  setActiveTaskId: (id: number | null) => void;
  openComposer: (column: TaskStatus) => void;
  closeComposer: () => void;
  setSearch: (value: string) => void;
  toggleAssignee: (id: number | 'unassigned') => void;
  clearFilters: () => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  activeTaskId: null,
  composerColumn: null,
  search: '',
  assignees: [],
  sidebarCollapsed: false,
  mobileNavOpen: false,

  setActiveTaskId: (activeTaskId) => set({ activeTaskId }),
  openComposer: (composerColumn) => set({ composerColumn }),
  closeComposer: () => set({ composerColumn: null }),
  setSearch: (search) => set({ search }),

  toggleAssignee: (id) =>
    set((state) => ({
      assignees: state.assignees.includes(id)
        ? state.assignees.filter((value) => value !== id)
        : [...state.assignees, id],
    })),

  clearFilters: () => set({ search: '', assignees: [] }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
}));
