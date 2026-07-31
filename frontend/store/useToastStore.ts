import { create } from 'zustand';

export type ToastTone = 'error' | 'success';

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (tone: ToastTone, message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: (tone, message) => {
    const id = ++nextId;
    set((state) => ({ toasts: [...state.toasts, { id, tone, message }] }));
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), 5000);
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  error: (message: string) => useToastStore.getState().push('error', message),
  success: (message: string) => useToastStore.getState().push('success', message),
};
