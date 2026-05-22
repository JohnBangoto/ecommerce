import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../utils/api';
import { useAdminStore } from './adminStore';

export const useOrderStore = create(
  persist(
    (set, get) => ({
      orders: [],
      currentOrder: null,
      loading: false,
      error: null,

      // Ajouter une commande via le backend (Paiement simulé)
      addOrder: async (orderData) => {
        set({ loading: true, error: null });
        try {
          const response = await api.post('/orders/checkout-simulated', orderData);
          const newOrder = response.order;

          set(s => ({
            orders: [newOrder, ...s.orders],
            currentOrder: newOrder,
            loading: false,
          }));

          // ── Optionnel : Synchroniser également l'adminStore local pour la démo ──
          useAdminStore.getState().addOrder(newOrder);

          return newOrder;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Récupérer l'historique des commandes de l'utilisateur connecté
      fetchUserOrders: async () => {
        set({ loading: true });
        try {
          const orders = await api.get('/orders/my-orders');
          set({ orders, loading: false });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      setCurrentOrder: (order) => set({ currentOrder: order }),

      // Récupérer une commande par son ID (depuis l'API ou le cache local)
      getOrderById: async (id) => {
        // Chercher d'abord dans le cache local
        const localOrder = get().orders.find(o => o.id === id);
        if (localOrder) return localOrder;

        // Sinon charger depuis le serveur
        try {
          const order = await api.get(`/orders/${id}`);
          return order;
        } catch (error) {
          console.error(`Erreur de chargement de la commande ${id} :`, error);
          return null;
        }
      },
    }),
    { name: 'luxora-order-store' }
  )
);

