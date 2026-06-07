import { create } from 'zustand';
import { api } from '../utils/api';

/**
 * Store client dédié aux produits et catégories.
 * Toutes les données viennent de l'API backend — aucune donnée statique.
 */
export const useProductStore = create((set, get) => ({
  // ─── Catalogue / liste ────────────────────────────────────────────────────
  products: [],
  total: 0,
  totalPages: 1,
  currentPage: 1,
  productsLoading: false,
  productsError: null,

  // ─── Détail produit ───────────────────────────────────────────────────────
  product: null,
  productLoading: false,
  productError: null,

  // ─── Catégories ───────────────────────────────────────────────────────────
  categories: [],
  categoriesLoading: false,
  categoriesError: null,

  // ─── Fetch liste de produits ──────────────────────────────────────────────
  fetchProducts: async (params = {}) => {
    set({ productsLoading: true, productsError: null });
    try {
      const query = new URLSearchParams();
      if (params.page)       query.set('page', params.page);
      if (params.limit)      query.set('limit', params.limit);
      if (params.category)   query.set('category', params.category);
      if (params.search)     query.set('search', params.search);
      if (params.isFeatured !== undefined) query.set('isFeatured', params.isFeatured);
      if (params.isNew !== undefined)      query.set('isNew', params.isNew);
      if (params.minPrice !== undefined)   query.set('minPrice', params.minPrice);
      if (params.maxPrice !== undefined)   query.set('maxPrice', params.maxPrice);
      if (params.inStock)    query.set('isActive', 'true');
      if (params.condition)  query.set('condition', params.condition);

      const data = await api.get(`/products?${query.toString()}`);
      set({
        products: data.products || [],
        total: data.total || 0,
        totalPages: data.totalPages || 1,
        currentPage: params.page || 1,
        productsLoading: false,
      });
      return data;
    } catch (err) {
      set({ productsLoading: false, productsError: err.message || 'Erreur de chargement' });
      return { products: [], total: 0, totalPages: 1 };
    }
  },

  // ─── Fetch produit unique ─────────────────────────────────────────────────
  fetchProduct: async (id) => {
    set({ productLoading: true, productError: null, product: null });
    try {
      const data = await api.get(`/products/${id}`);
      // L'API renvoie directement le produit ou { product: ... }
      const product = data.product || data;
      set({ product, productLoading: false });
      return product;
    } catch (err) {
      set({ productLoading: false, productError: err.message || 'Produit introuvable' });
      return null;
    }
  },

  // ─── Fetch catégories ─────────────────────────────────────────────────────
  fetchCategories: async () => {
    const { categories, categoriesLoading } = get();
    if (categories.length > 0 || categoriesLoading) return; // déjà chargées
    set({ categoriesLoading: true, categoriesError: null });
    try {
      const data = await api.get('/categories');
      set({ categories: data || [], categoriesLoading: false });
    } catch (err) {
      set({ categoriesLoading: false, categoriesError: err.message });
    }
  },

  // ─── Soumettre un avis ────────────────────────────────────────────────────
  submitReview: async (productId, { rating, comment }) => {
    const data = await api.post(`/products/${productId}/reviews`, { rating, comment });
    // Recharger le produit pour avoir les avis à jour
    await get().fetchProduct(productId);
    return data;
  },
}));
