import { create } from 'zustand';

export const useUIStore = create((set) => ({
  searchQuery: '',
  toasts: [],
  isMenuOpen: false,

  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleMenu: () => set((s) => ({ isMenuOpen: !s.isMenuOpen })),
  closeMenu: () => set({ isMenuOpen: false }),

  addToast: (message, type = 'success') => {
    const id = Date.now();
    set((s) => ({
      toasts: [...s.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, 3500);
  },

  removeToast: (id) => set((s) => ({
    toasts: s.toasts.filter(t => t.id !== id),
  })),
}));
