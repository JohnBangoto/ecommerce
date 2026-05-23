import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../utils/api';

export const useAdminAuthStore = create(
  persist(
    (set) => ({
      adminUser: null,
      adminToken: null,
      adminLoading: false,
      adminError: null,
      isAdminAuthenticated: false,

      adminLogin: async ({ email, password }) => {
        set({ adminLoading: true, adminError: null });
        try {
          // Utilise l'option { isAdmin: true } pour indiquer que la requête doit être faite avec ou pour l'admin
          const response = await api.post('/auth/login', { email, password }, { isAdmin: true });
          
          if (!response.user || response.user.role !== 'admin') {
            throw new Error('Accès refusé : ce compte n’est pas un compte administrateur.');
          }

          localStorage.setItem('luxora-admin-token', response.token);
          
          set({
            adminUser: response.user,
            adminToken: response.token,
            isAdminAuthenticated: true,
            adminLoading: false,
          });

          return response.user;
        } catch (error) {
          localStorage.removeItem('luxora-admin-token');
          set({ 
            adminLoading: false, 
            adminError: error.message || 'Impossible de se connecter au back-office.',
            adminUser: null,
            adminToken: null,
            isAdminAuthenticated: false
          });
          throw error;
        }
      },

      adminLogout: async () => {
        localStorage.removeItem('luxora-admin-token');
        set({
          adminUser: null,
          adminToken: null,
          isAdminAuthenticated: false,
          adminLoading: false,
          adminError: null,
        });
      },
    }),
    {
      name: 'luxora-admin-auth-store',
      partialize: (state) => ({
        adminUser: state.adminUser,
        adminToken: state.adminToken,
        isAdminAuthenticated: state.isAdminAuthenticated,
      }),
    }
  )
);
