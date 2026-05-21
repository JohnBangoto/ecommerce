import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAdminStore } from './adminStore';

export const useOrderStore = create(
  persist(
    (set, get) => ({
      orders: [],
      currentOrder: null,

      addOrder: (order) => {
        const newOrder = {
          ...order,
          id: `CMD-${Date.now()}`,
          date: new Date().toISOString(),
          status: 'confirmed',
          customer: order.shippingAddress
            ? `${order.shippingAddress.firstName || ''} ${order.shippingAddress.lastName || ''}`.trim() || 'Client'
            : 'Client',
          timeline: [
            { step: 'confirmed', label: 'Commande confirmée', date: new Date().toISOString(), done: true },
            { step: 'prepared',  label: 'Commande préparée',  date: null, done: false },
            { step: 'shipped',   label: 'Expédiée',           date: null, done: false },
            { step: 'delivered', label: 'Livrée',             date: null, done: false },
          ],
          trackingNumber: `SN${Math.random().toString().slice(2, 11)}`,
        };

        set(s => ({
          orders: [newOrder, ...s.orders],
          currentOrder: newOrder,
        }));

        // ── Synchroniser vers adminStore pour qu'elle apparaisse dans le back-office ──
        useAdminStore.getState().addOrder(newOrder);

        return newOrder;
      },

      setCurrentOrder: (order) => set({ currentOrder: order }),

      getOrderById: (id) => {
        const { orders } = get();
        return orders.find(o => o.id === id);
      },
    }),
    { name: 'luxora-order-store' }
  )
);
