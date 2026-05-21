import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Grid, List, X, ChevronDown } from 'lucide-react';
import { categories } from '../data/products';
import { useAdminStore } from '../store/adminStore';
import ProductCard from '../components/product/ProductCard';
import styles from './Catalogue.module.css';

const priceRanges = [
  { label: 'Moins de 50 000 FCFA',          min: 0,      max: 50000 },
  { label: '50 000 – 100 000 FCFA',         min: 50000,  max: 100000 },
  { label: '100 000 – 250 000 FCFA',        min: 100000, max: 250000 },
  { label: '250 000 – 500 000 FCFA',        min: 250000, max: 500000 },
  { label: 'Plus de 500 000 FCFA',          min: 500000, max: Infinity },
];

const sortOptions = [
  { value: 'default', label: 'Pertinence' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
  { value: 'rating', label: 'Mieux notés' },
  { value: 'new', label: 'Nouveautés' },
];

export default function Catalogue() {
  const products = useAdminStore(s => s.products);
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sort, setSort] = useState('default');
  const [selectedCat, setSelectedCat] = useState(searchParams.get('cat') || '');
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [showInStock, setShowInStock] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (selectedCat) list = list.filter(p => p.category === selectedCat);
    if (selectedPriceRange) {
      list = list.filter(p => p.price >= selectedPriceRange.min && p.price <= selectedPriceRange.max);
    }
    if (showInStock) list = list.filter(p => p.stock > 0);
    switch (sort) {
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating': list.sort((a, b) => b.rating - a.rating); break;
      case 'new': list = list.filter(p => p.isNew).concat(list.filter(p => !p.isNew)); break;
      default: break;
    }
    return list;
  }, [selectedCat, selectedPriceRange, showInStock, sort]);

  const clearFilters = () => {
    setSelectedCat('');
    setSelectedPriceRange(null);
    setShowInStock(false);
    setSort('default');
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
              {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} trouvé{filteredProducts.length !== 1 ? 's' : ''}
            </p>
          </div>
          {/* Active filters */}
          {hasFilters && (
            <div className={styles.activeFilters}>
              {selectedCat && (
                <button className={styles.filterTag} onClick={() => setSelectedCat('')}>
                  {categories.find(c => c.id === selectedCat)?.name} <X size={12} />
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
                <span>{products.length}</span>
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`${styles.filterOption} ${selectedCat === cat.id ? styles.active : ''}`}
                  onClick={() => setSelectedCat(selectedCat === cat.id ? '' : cat.id)}
                >
                  <span>{cat.icon} {cat.name}</span>
                  <span>{cat.count}</span>
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
            {filteredProducts.length === 0 ? (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>Aucun produit trouvé</p>
                <p className={styles.emptyDesc}>Essayez de modifier vos filtres.</p>
                <button className={styles.emptyBtn} onClick={clearFilters}>
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <div className={`${styles.productsGrid} ${viewMode === 'list' ? styles.listView : ''}`}>
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
