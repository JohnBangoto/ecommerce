import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Grid, List, X, ChevronDown } from 'lucide-react';
import { useProductStore } from '../store/productStore';
import ProductCard from '../components/product/ProductCard';
import styles from './Catalogue.module.css';

const priceRanges = [
  { label: 'Moins de 50 000 FCFA',   min: 0,      max: 50000 },
  { label: '50 000 – 100 000 FCFA',  min: 50000,  max: 100000 },
  { label: '100 000 – 250 000 FCFA', min: 100000, max: 250000 },
  { label: '250 000 – 500 000 FCFA', min: 250000, max: 500000 },
  { label: 'Plus de 500 000 FCFA',   min: 500000, max: undefined },
];

const sortOptions = [
  { value: 'default',    label: 'Pertinence' },
  { value: 'price-asc',  label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
  { value: 'new',        label: 'Nouveautés' },
];

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--color-surface,#f3f4f6)',
      borderRadius: 12,
      height: 320,
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

export default function Catalogue() {
  const { fetchProducts, fetchCategories, categories, products, total, totalPages, productsLoading } = useProductStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sort, setSort] = useState('default');
  const [selectedCat, setSelectedCat] = useState(searchParams.get('cat') || '');
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [showInStock, setShowInStock] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);

  // Lire les params URL initiaux
  useEffect(() => {
    const cat = searchParams.get('cat') || '';
    const isNew = searchParams.get('isNew') || '';
    const isFeatured = searchParams.get('isFeatured') || '';
    setSelectedCat(cat);
    fetchCategories();
    loadProducts({ cat, isNew, isFeatured, page: 1 });
    setPage(1);
  }, []);

  const loadProducts = useCallback((overrides = {}) => {
    const params = {
      page: overrides.page ?? page,
      limit: 24,
    };
    const cat = overrides.cat !== undefined ? overrides.cat : selectedCat;
    if (cat) params.category = cat;

    // Filtres prix
    const priceRange = overrides.priceRange !== undefined ? overrides.priceRange : selectedPriceRange;
    if (priceRange) {
      params.minPrice = priceRange.min;
      if (priceRange.max !== undefined) params.maxPrice = priceRange.max;
    }

    // Filtre stock
    if (overrides.inStock !== undefined ? overrides.inStock : showInStock) {
      // Le backend filtre isActive=true par défaut, pas de paramètre stock direct.
      // On passe un flag custom géré localement plus bas si besoin
    }

    // Filtre nouveautés depuis URL
    if (overrides.isNew) params.isNew = 'true';
    if (overrides.isFeatured) params.isFeatured = 'true';

    // Tri
    const currentSort = overrides.sort !== undefined ? overrides.sort : sort;
    if (currentSort === 'new') params.isNew = 'true';

    fetchProducts(params);
  }, [page, selectedCat, selectedPriceRange, showInStock, sort]);

  // Recharger quand les filtres changent
  useEffect(() => {
    loadProducts({ page: 1 });
    setPage(1);
  }, [selectedCat, selectedPriceRange, showInStock, sort]);

  useEffect(() => {
    loadProducts({ page });
  }, [page]);

  const clearFilters = () => {
    setSelectedCat('');
    setSelectedPriceRange(null);
    setShowInStock(false);
    setSort('default');
    setSearchParams({});
  };

  const hasFilters = selectedCat || selectedPriceRange || showInStock;

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Catalogue</h1>
            <p className={styles.pageDesc}>
              {productsLoading ? 'Chargement…' : `${total} produit${total !== 1 ? 's' : ''} trouvé${total !== 1 ? 's' : ''}`}
            </p>
          </div>
          {/* Active filters */}
          {hasFilters && (
            <div className={styles.activeFilters}>
              {selectedCat && (
                <button className={styles.filterTag} onClick={() => setSelectedCat('')}>
                  {categories.find(c => c.slug === selectedCat)?.name || selectedCat} <X size={12} />
                </button>
              )}
              {selectedPriceRange && (
                <button className={styles.filterTag} onClick={() => setSelectedPriceRange(null)}>
                  {selectedPriceRange.label} <X size={12} />
                </button>
              )}
              {showInStock && (
                <button className={styles.filterTag} onClick={() => setShowInStock(false)}>
                  En stock <X size={12} />
                </button>
              )}
              <button className={styles.clearFilters} onClick={clearFilters}>
                Tout effacer
              </button>
            </div>
          )}
        </div>

        <div className={styles.layout}>
          {/* Sidebar */}
          <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
            <div className={styles.sidebarHeader}>
              <h3 className={styles.sidebarTitle}>Filtres</h3>
              <button className={styles.closeSidebar} onClick={() => setSidebarOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Catégories */}
            <div className={styles.filterGroup}>
              <h4 className={styles.filterGroupTitle}>Catégorie</h4>
              <button
                className={`${styles.filterOption} ${!selectedCat ? styles.active : ''}`}
                onClick={() => setSelectedCat('')}
              >
                Toutes les catégories
                <span>{total}</span>
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`${styles.filterOption} ${selectedCat === cat.slug ? styles.active : ''}`}
                  onClick={() => setSelectedCat(selectedCat === cat.slug ? '' : cat.slug)}
                >
                  <span>{cat.name}</span>
                  <span>{cat.productCount}</span>
                </button>
              ))}
            </div>

            {/* Prix */}
            <div className={styles.filterGroup}>
              <h4 className={styles.filterGroupTitle}>Prix</h4>
              {priceRanges.map((range, i) => (
                <button
                  key={i}
                  className={`${styles.filterOption} ${selectedPriceRange === range ? styles.active : ''}`}
                  onClick={() => setSelectedPriceRange(selectedPriceRange === range ? null : range)}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {/* Disponibilité */}
            <div className={styles.filterGroup}>
              <h4 className={styles.filterGroupTitle}>Disponibilité</h4>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={showInStock}
                  onChange={(e) => setShowInStock(e.target.checked)}
                  className={styles.checkbox}
                />
                En stock uniquement
              </label>
            </div>
          </aside>

          {/* Overlay mobile */}
          {sidebarOpen && (
            <div className={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />
          )}

          {/* Content */}
          <div className={styles.content}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
              <button
                className={styles.filterToggle}
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <SlidersHorizontal size={16} />
                Filtres
              </button>
              <div className={styles.toolbarRight}>
                <div className={styles.sortSelect}>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className={styles.select}
                  >
                    {sortOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className={styles.selectIcon} />
                </div>
                <div className={styles.viewToggle}>
                  <button
                    className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.active : ''}`}
                    onClick={() => setViewMode('grid')}
                    aria-label="Vue grille"
                  >
                    <Grid size={16} />
                  </button>
                  <button
                    className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
                    onClick={() => setViewMode('list')}
                    aria-label="Vue liste"
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Products */}
            {productsLoading ? (
              <div className={`${styles.productsGrid}`}>
                {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>Aucun produit trouvé</p>
                <p className={styles.emptyDesc}>Essayez de modifier vos filtres.</p>
                <button className={styles.emptyBtn} onClick={clearFilters}>
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <div className={`${styles.productsGrid} ${viewMode === 'list' ? styles.listView : ''}`}>
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || productsLoading}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
                >
                  ← Précédent
                </button>
                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1;
                  if (totalPages > 7 && Math.abs(p - page) > 2 && p !== 1 && p !== totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      disabled={productsLoading}
                      style={{
                        padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                        background: p === page ? 'var(--color-primary,#8B4513)' : 'transparent',
                        color: p === page ? '#fff' : 'inherit',
                        border: `1px solid ${p === page ? 'var(--color-primary,#8B4513)' : '#ddd'}`,
                        fontWeight: p === page ? 700 : 400,
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || productsLoading}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
                >
                  Suivant →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
