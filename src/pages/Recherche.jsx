import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, X, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { categories } from '../data/products';
import { useAdminStore } from '../store/adminStore';
import ProductCard from '../components/product/ProductCard';
import styles from './Recherche.module.css';

const recentSearches = ['veste cuir', 'casque audio', 'bougie', 'tapis yoga'];
const popularSearches = ['cachemire', 'montre', 'parfum', 'sneakers'];

export default function Recherche() {
  const products = useAdminStore(s => s.products);
  const searchProducts = (q) => {
    const query = q.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      (p.tags || []).some(t => t.toLowerCase().includes(query))
    );
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
    if (q) setResults(searchProducts(q));
    else setResults([]);
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
    setResults([]);
    setSearchParams({});
    inputRef.current?.focus();
  };

  const hasQuery = searchParams.get('q');

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

            {/* Suggestions dropdown */}
            {showSuggestions && !hasQuery && (
              <div className={styles.suggestions}>
                <div className={styles.suggestGroup}>
                  <p className={styles.suggestTitle}><Clock size={12} /> Recherches récentes</p>
                  {recentSearches.map(s => (
                    <button key={s} className={styles.suggestItem} onClick={() => handleSuggestion(s)}>
                      {s} <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
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
                    to={`/catalogue?cat=${cat.id}`}
                    className={styles.catChip}
                  >
                    {cat.icon} {cat.name}
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
                <strong>{results.length}</strong> résultat{results.length !== 1 ? 's' : ''} pour &quot;{hasQuery}&quot;
              </p>
            </div>

            {results.length === 0 ? (
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
                {results.map(product => (
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
