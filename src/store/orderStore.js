import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../utils/api';

export const useOrderStore = create(
  persist(
    (set, get) => ({
      orders: [],
      currentOrder: null,
      trackingTokens: {},
      loading: false,
      error: null,

      addOrder: async (orderData) => {
        set({ loading: true, error: null });

        try {
          const response = await api.post('/orders/checkout-simulated', orderData);
          const newOrder = response.order;
          const trackingToken = response.order?.trackingToken || null;

          set((state) => ({
            orders: [newOrder, ...state.orders],
            currentOrder: newOrder,
            trackingTokens: trackingToken
              ? { ...state.trackingTokens, [newOrder.id]: trackingToken }
              : state.trackingTokens,
            loading: false,
          }));

          return newOrder;
        } catch (error) {
          set({ error: error.message, loading: false });

          // Si la session est expirée (token obsolète), déconnecter proprement
          if (error.message?.includes('session a expiré') || error.message?.includes('session') || error.message?.includes('Authentication')) {
            const { useAuthStore } = await import('./authStore');
            useAuthStore.getState().logout();
          }

          throw error;
        }
      },

      fetchUserOrders: async () => {
        set({ loading: true, error: null });

        try {
          const orders = await api.get('/orders/my-orders');
          set({ orders, loading: false });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      setCurrentOrder: (order) => set({ currentOrder: order }),

      clearOrders: () => set({ orders: [], currentOrder: null, trackingTokens: {}, error: null }),

      getTrackingToken: (id) => get().trackingTokens[id] || null,

      getOrderById: async (id, options = {}) => {
        const localOrder = get().orders.find((order) => order.id === id);
        if (localOrder) {
          return localOrder;
        }

        const trackingToken = options.trackingToken || get().trackingTokens[id];

        try {
          if (trackingToken) {
            return await api.get(`/orders/track/${id}?token=${encodeURIComponent(trackingToken)}`);
          }

          return await api.get(`/orders/${id}`);
        } catch (error) {
          console.error(`Erreur de chargement de la commande ${id} :`, error);
          return null;
        }
      },
    }),
    { name: 'luxora-order-store' },
  ),
);
