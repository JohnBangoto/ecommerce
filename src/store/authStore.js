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
          return response.user;
        } catch (error) {
          set({ loading: false, error: error.message });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('luxora-token');
        set({ user: null, token: null, isAuthenticated: false, error: null });
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
