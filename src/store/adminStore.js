import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { products as initialProducts } from '../data/products';
import { api } from '../utils/api';

const generateMockReviewsList = (product) => {
  const authors = [
    'Amadou Diallo', 'Fatou Sy', 'Moussa Ndiaye', 'Awa Diop', 'Cheikh Kane',
    'Mariama Sow', 'Ousmane Cissé', 'Khady Sall', 'Ibrahima Gueye', 'Ramatoulaye Kone'
  ];
  const comments = [
    'Superbe qualité ! Très satisfait de mon achat, je recommande fortement.',
    'Produit conforme à la description. La livraison a été très rapide.',
    'Excellent rapport qualité-prix. C\'est exactement ce que je cherchais.',
    'Magnifique ! Les détails et les finitions sont parfaits.',
    'Très confortable et très beau design. Service client irréprochable.',
    'Un peu d\'attente pour la livraison, mais le produit en vaut vraiment la peine.',
    'Je l\'adore ! Un indispensable au quotidien.',
    'Très bonne qualité des matériaux. Je vais en commander d\'autres.',
  ];

  const count = product.reviews || 0;
  if (count === 0) return [];
  const list = [];
  const baseRating = product.rating || 4.5;

  const numReviews = Math.min(5, count);
  for (let i = 0; i < numReviews; i++) {
    const author = authors[(product.id * 7 + i) % authors.length];
    const comment = comments[(product.id * 3 + i) % comments.length];
    let rating = Math.round(baseRating + (i % 2 === 0 ? 0.3 : -0.3));
    rating = Math.max(3, Math.min(5, rating));
    
    const daysAgo = i * 4 + 2;
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR');

    list.push({
      id: `${product.id}-mock-rev-${i}`,
      author,
      rating,
      comment,
      date,
    });
  }
  return list;
};

export const useAdminStore = create(
  persist(
    (set, get) => ({
      products: initialProducts.map(p => ({ ...p, reviewsList: generateMockReviewsList(p) })),
      orders:   [],
      ordersLoading: false,
      ordersError: null,

      // ─── Réinitialiser aux données de démonstration ────────────────
      resetToDemo: () => set({
        products: initialProducts.map(p => ({ ...p, reviewsList: generateMockReviewsList(p) })),
        orders:   [],
      }),

      // ─── Produits ──────────────────────────────────────────────────
      addProduct: (product) =>
        set(state => ({
          products: [
            ...state.products,
            {
              ...product,
              id: state.products.length > 0
                ? Math.max(...state.products.map(p => p.id)) + 1
                : 1,
              rating: 0, reviews: 0,
              reviewsList: [],
              isNew: true, isFeatured: false,
              images: product.images && product.images.length > 0 ? product.images : [product.image],
            },
          ],
        })),

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

      updateProduct: (id, changes) =>
        set(state => ({
          products: state.products.map(p => p.id === id ? { ...p, ...changes } : p),
        })),

      addReview: (productId, review) =>
        set(state => {
          const products = state.products.map(p => {
            if (p.id !== productId) return p;
            const currentList = p.reviewsList || [];
            const newReview = {
              id: Date.now(),
              author: review.author,
              rating: review.rating,
              comment: review.comment,
              date: new Date().toLocaleDateString('fr-FR'),
            };
            const newList = [newReview, ...currentList];
            const totalRating = newList.reduce((acc, r) => acc + r.rating, 0);
            const avgRating = parseFloat((totalRating / newList.length).toFixed(1));
            return {
              ...p,
              reviewsList: newList,
              rating: avgRating,
              reviews: newList.length,
            };
          });
          return { products };
        }),

      deleteProduct: (id) =>
        set(state => ({ products: state.products.filter(p => p.id !== id) })),

      updateStock: (id, stock) =>
        set(state => ({
          products: state.products.map(p =>
            p.id === id ? { ...p, stock: parseInt(stock) } : p
          ),
        })),

      // ─── Commandes ─────────────────────────────────────────────────
      addOrder: (order) =>
        set(state => ({
          orders: [order, ...state.orders],
        })),

      updateOrderStatus: async (id, status) => {
        try {
          const response = await api.put(`/orders/${id}/status`, { status });
          const updatedOrder = response.order;
          set(state => ({
            orders: state.orders.map(o => (o.id === id ? updatedOrder : o)),
          }));
        } catch (error) {
          console.error('Unable to update order status:', error);
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

      // ─── Sélecteurs ────────────────────────────────────────────────
      getStockAlerts: () => {
        const { products } = get();
        return {
          outOfStock: products.filter(p => p.stock === 0),
          lowStock:   products.filter(p => p.stock > 0 && p.stock <= 5),
          ok:         products.filter(p => p.stock > 5),
        };
      },

      getDashboardStats: () => {
        const { orders, products } = get();
        const active = orders.filter(o => o.status !== 'cancelled');
        const totalRevenue = active.reduce((s, o) => s + o.total, 0);
        const totalOrders  = orders.length;
        const outOfStock   = products.filter(p => p.stock === 0).length;
        const lowStock     = products.filter(p => p.stock > 0 && p.stock <= 5).length;
        const avgBasket    = active.length > 0 ? totalRevenue / active.length : 0;

        // Ventes par catégorie
        const salesByCategory = {};
        active.forEach(o => {
          o.items.forEach(item => {
            const prod = products.find(p => p.id === item.productId);
            const cat  = prod?.category || 'autre';
            if (!salesByCategory[cat]) salesByCategory[cat] = { revenue: 0, qty: 0 };
            salesByCategory[cat].revenue += item.price * item.quantity;
            salesByCategory[cat].qty     += item.quantity;
          });
        });

        // Ventes par mois
        const monthly = {};
        active.forEach(o => {
          const month = o.date.slice(0, 7);
          if (!monthly[month]) monthly[month] = 0;
          monthly[month] += o.total;
        });

        // Top produits
        const productSales = {};
        active.forEach(o => {
          o.items.forEach(item => {
            if (!productSales[item.name])
              productSales[item.name] = { qty: 0, revenue: 0, image: item.image };
            productSales[item.name].qty     += item.quantity;
            productSales[item.name].revenue += item.price * item.quantity;
          });
        });
        const topProducts = Object.entries(productSales)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        // Statuts
        const byStatus = orders.reduce((acc, o) => {
          acc[o.status] = (acc[o.status] || 0) + 1;
          return acc;
        }, {});

        return {
          totalRevenue, totalOrders, outOfStock, lowStock,
          avgBasket, salesByCategory, monthly, topProducts, byStatus,
        };
      },
    }),
    {
      name: 'luxora-admin-store',
      version: 3,
      migrate: (persistedState, version) => {
        let products = persistedState?.products || [];
        products = products.map(p => {
          if (!p.reviewsList) {
            p.reviewsList = generateMockReviewsList(p);
          }
          return p;
        });
        return {
          ...persistedState,
          products,
          orders: [],
        };
      },
      // Ne pas persister les orders : elles viennent toujours du backend
      partialize: (state) => ({
        products: state.products,
      }),
    }
  )
);
