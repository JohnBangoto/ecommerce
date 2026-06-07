import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, X, TrendingUp, ArrowRight } from 'lucide-react';
import { useProductStore } from '../store/productStore';
import ProductCard from '../components/product/ProductCard';
import styles from './Recherche.module.css';

const popularSearches = ['veste', 'robe', 'montre', 'sac', 'sneakers', 'parfum'];

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Recherche() {
  const { fetchProducts, fetchCategories, categories, products, total, productsLoading } = useProductStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const inputRef = useRef(null);

  const hasQuery = searchParams.get('q');

  useEffect(() => {
    fetchCategories();
  }, []);

  // Lancer la recherche quand le paramètre URL change
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
    if (q.trim()) {
      fetchProducts({ search: q.trim(), limit: 48 });
    }
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
      setShowSuggestions(false);
    }
  };

  const handleSuggestion = (suggestion) => {
    setQuery(suggestion);
    setSearchParams({ q: suggestion });
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setQuery('');
    setSearchParams({});
    inputRef.current?.focus();
  };

  return (
    <main className={styles.page}>
      <div className="container">
        {/* Search Bar */}
        <div className={styles.searchSection}>
          <h1 className={styles.title}>Recherche</h1>
          <form className={styles.searchForm} onSubmit={handleSubmit}>
            <div className={styles.searchWrap}>
              <Search size={20} className={styles.searchIcon} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Rechercher un produit, une marque..."
                className={styles.searchInput}
                autoComplete="off"
              />
              {query && (
                <button type="button" onClick={clearSearch} className={styles.clearBtn} aria-label="Effacer">
                  <X size={16} />
                </button>
              )}
              <button type="submit" className={styles.searchBtn}>
                Rechercher
              </button>
            </div>

            {/* Suggestions */}
            {showSuggestions && !hasQuery && (
              <div className={styles.suggestions}>
                <div className={styles.suggestGroup}>
                  <p className={styles.suggestTitle}><TrendingUp size={12} /> Tendances</p>
                  {popularSearches.map(s => (
                    <button key={s} className={styles.suggestItem} onClick={() => handleSuggestion(s)}>
                      {s} <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>

          {/* Catégories rapides */}
          {!hasQuery && (
            <div className={styles.quickCats}>
              <p className={styles.quickTitle}>Parcourir par catégorie</p>
              <div className={styles.catChips}>
                {categories.map(cat => (
                  <Link
                    key={cat.id}
                    to={`/catalogue?cat=${cat.slug}`}
                    className={styles.catChip}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {hasQuery && (
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              <p className={styles.resultsCount}>
                {productsLoading
                  ? 'Recherche en cours…'
                  : <><strong>{total}</strong> résultat{total !== 1 ? 's' : ''} pour &quot;{hasQuery}&quot;</>
                }
              </p>
            </div>

            {productsLoading ? (
              <div className={styles.grid}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ background: '#f3f4f6', borderRadius: 12, height: 300, animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className={styles.noResults}>
                <div className={styles.noResultsIcon}>🔍</div>
                <h2 className={styles.noResultsTitle}>Aucun résultat trouvé</h2>
                <p className={styles.noResultsDesc}>
                  Essayez d'autres mots-clés ou parcourez nos catégories.
                </p>
                <div className={styles.noResultsSugg}>
                  {popularSearches.map(s => (
                    <button
                      key={s}
                      className={styles.suggChip}
                      onClick={() => handleSuggestion(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.grid}>
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
