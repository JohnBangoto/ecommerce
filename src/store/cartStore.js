import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      // Ouvrir/fermer le tiroir panier
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      // Ajouter un article
      addItem: (product, quantity = 1, options = {}) => {
        const items = get().items;
        const key = `${product.id}-${options.size || ''}-${options.color || ''}`;
        const existing = items.find(i => i.key === key);

        if (existing) {
          set({
            items: items.map(i =>
              i.key === key ? { ...i, quantity: i.quantity + quantity } : i
            ),
          });
        } else {
          set({
            items: [...items, {
              key,
              product,
              quantity,
              options,
              addedAt: Date.now(),
            }],
          });
        }
      },

      // Retirer un article
      removeItem: (key) => set((s) => ({
        items: s.items.filter(i => i.key !== key),
      })),

      // Mettre à jour la quantité
      updateQuantity: (key, quantity) => {
        if (quantity <= 0) {
          get().removeItem(key);
          return;
        }
        set((s) => ({
          items: s.items.map(i => i.key === key ? { ...i, quantity } : i),
        }));
      },

      // Vider le panier
      clearCart: () => set({ items: [] }),

      // Calculer le total
      getTotal: () => {
        const items = get().items;
        return items.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
      },

      // Nombre total d'articles
      getCount: () => {
        const items = get().items;
        return items.reduce((acc, i) => acc + i.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
