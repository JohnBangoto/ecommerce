import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../utils/api';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      loading: false,
      error: null,
      isAuthenticated: false,

      login: async ({ email, password }) => {
        set({ loading: true, error: null });
        try {
          const response = await api.post('/auth/login', { email, password });
          localStorage.setItem('luxora-token', response.token);
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            loading: false,
          });

          // Conserver le panier actuel (permettre le checkout après connexion)
          // mais vider l'historique de commandes de l'utilisateur précédent
          const { useOrderStore } = await import('./orderStore');
          useOrderStore.getState().clearOrders();

          return response.user;
        } catch (error) {
          set({ loading: false, error: error.message });
          throw error;
        }
      },

      register: async ({ email, password, firstName, lastName }) => {
        set({ loading: true, error: null });
        try {
          const response = await api.post('/auth/register', { email, password, firstName, lastName });
          localStorage.setItem('luxora-token', response.token);
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            loading: false,
          });

          // Conserver le panier actuel mais vider l'historique de commandes de l'utilisateur précédent
          const { useOrderStore } = await import('./orderStore');
          useOrderStore.getState().clearOrders();

          return response.user;
        } catch (error) {
          set({ loading: false, error: error.message });
          throw error;
        }
      },

      logout: async () => {
        localStorage.removeItem('luxora-token');
        set({ user: null, token: null, isAuthenticated: false, error: null });

        // Vider le panier et l'historique à la déconnexion
        const { useCartStore } = await import('./cartStore');
        const { useOrderStore } = await import('./orderStore');
        useCartStore.getState().clearCart();
        useOrderStore.getState().clearOrders();
      },
    }),
    {
      name: 'luxora-auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
