import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  tone?: 'default' | 'warning';
  action?: { label: string; run: () => void };
}

interface UiStore {
  hoveredId: string | null;
  setHovered: (id: string | null) => void;
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let nextToastId = 1;

export const useUiStore = create<UiStore>()((set) => ({
  hoveredId: null,
  setHovered: (hoveredId) => set({ hoveredId }),
  toasts: [],
  toast: (t) => {
    const id = nextToastId++;
    // Keep at most 3 on screen; newest last.
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 4500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = (t: Omit<Toast, 'id'>) => useUiStore.getState().toast(t);
