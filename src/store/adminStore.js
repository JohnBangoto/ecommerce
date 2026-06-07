import { create } from 'zustand';
import { api } from '../utils/api';

/**
 * Store admin — uniquement commandes et actions admin.
 * Les produits sont gérés directement dans AdminProduits.jsx via l'API.
 */
export const useAdminStore = create((set, get) => ({
  orders: [],
  ordersLoading: false,
  ordersError: null,

  // ─── Commandes ─────────────────────────────────────────────────
  loadOrders: async () => {
    set({ ordersLoading: true, ordersError: null });
    try {
      const orders = await api.get('/admin/orders');
      set({ orders, ordersLoading: false });
    } catch (error) {
      console.error('Unable to load admin orders:', error);
      set({ ordersLoading: false, ordersError: error.message || 'Impossible de charger les commandes.' });
    }
  },

  addOrder: (order) =>
    set(state => ({
      orders: [order, ...state.orders],
    })),

  updateOrderStatus: async (id, status) => {
    try {
      const response = await api.put(`/orders/${id}/status`, { status }, { isAdmin: true });
      const updatedOrder = response.order;
      set(state => ({
        orders: state.orders.map(o => (o.id === id ? updatedOrder : o)),
      }));
    } catch (error) {
      console.error('Unable to update order status:', error);
      // Mise à jour optimiste en cas d'erreur
      set(state => {
        const STEPS = ['confirmed', 'prepared', 'shipped', 'delivered'];
        const stepIdx = STEPS.indexOf(status);
        return {
          orders: state.orders.map(o => {
            if (o.id !== id) return o;
            const timeline = (o.timeline || []).map(step => {
              const sIdx = STEPS.indexOf(step.step);
              if (sIdx < 0) return step;
              if (sIdx <= stepIdx) {
                return { ...step, done: true, date: step.date || new Date().toISOString() };
              }
              return { ...step, done: false, date: null };
            });
            return { ...o, status, timeline };
          }),
        };
      });
    }
  },
}));
