import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import formatPrice from '../../utils/formatPrice';
import styles from './AdminStock.module.css';

export default function AdminStock() {
  // Products list states
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState({ out: 0, low: 0, ok: 0, total: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter and pagination states
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Adjustment modal states
  const [editingProduct, setEditingProduct] = useState(null);
  const [adjustMode, setAdjustMode] = useState('delta'); // 'delta' or 'absolute'
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustReason, setAdjustReason] = useState('adjustment'); // 'supply', 'adjustment', 'manual'
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState(null);

  // Stock movements drawer states
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerProduct, setDrawerProduct] = useState(null); // null means Global movements
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsTotalPages, setMovementsTotalPages] = useState(1);

  // Fetch products and summary
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const categoryParam = catFilter === 'all' ? '' : catFilter;
      const response = await api.get(
        `/admin/stock?search=${encodeURIComponent(search)}&category=${categoryParam}&level=${levelFilter}&page=${currentPage}&limit=12`
      );
      setProducts(response.products || []);
      setTotalPages(response.totalPages || 1);
      if (response.summary) {
        setSummary(response.summary);
      }
    } catch (err) {
      console.error('Failed to load stock products:', err);
      setError(err.message || 'Impossible de charger les données de stock.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories list
  const fetchCategories = async () => {
    try {
      const cats = await api.get('/categories');
      setCategories(cats || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  // Fetch movements list (specific or global)
  const fetchMovements = async () => {
    setMovementsLoading(true);
    try {
      let url = `/admin/stock/movements?page=${movementsPage}&limit=15`;
      if (drawerProduct) {
        url += `&productId=${drawerProduct.id}`;
      }
      const response = await api.get(url);
      setMovements(response.movements || []);
      setMovementsTotalPages(response.totalPages || 1);
    } catch (err) {
      console.error('Failed to load movements:', err);
    } finally {
      setMovementsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, catFilter, levelFilter, currentPage]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (showDrawer) {
      fetchMovements();
    }
  }, [showDrawer, drawerProduct, movementsPage]);

  // Handle stock adjustment submit
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    const value = parseInt(adjustValue);
    if (isNaN(value)) {
      setAdjustError('Veuillez entrer une valeur numérique valide.');
      return;
    }

    setAdjustLoading(true);
    setAdjustError(null);

    try {
      const payload = {
        type: adjustReason,
        note: adjustNote,
      };

      if (adjustMode === 'delta') {
        payload.delta = value;
      } else {
        payload.newQty = value;
      }

      await api.post(`/admin/stock/${editingProduct.id}/adjust`, payload);
      
      // Success: refresh list & close modal
      setEditingProduct(null);
      setAdjustValue('');
      setAdjustNote('');
      fetchProducts();
    } catch (err) {
      console.error('Failed to adjust stock:', err);
      setAdjustError(err.message || "Erreur lors de l'ajustement du stock.");
    } finally {
      setAdjustLoading(false);
    }
  };

  const openAdjustModal = (product) => {
    setEditingProduct(product);
    setAdjustMode('delta');
    setAdjustValue('');
    setAdjustReason('adjustment');
    setAdjustNote('');
    setAdjustError(null);
  };

  const openMovementsDrawer = (product = null) => {
    setDrawerProduct(product);
    setMovementsPage(1);
    setMovements([]);
    setShowDrawer(true);
  };

  // Helpers for text mappings
  const getMovementTypeLabel = (type) => {
    switch (type) {
      case 'sale': return 'Vente';
      case 'supply': return 'Approvisionnement';
      case 'adjustment': return 'Correction';
      case 'manual': return 'Manuel';
      case 'cancellation': return 'Annulation';
      default: return type;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestion du stock</h1>
          <p className={styles.subtitle}>{summary.total} produits répertoriés</p>
        </div>
        <button 
          className={styles.historyBtn}
          onClick={() => openMovementsDrawer(null)}
        >
          🗂️ Historique Global
        </button>
      </div>

      {/* Real-time stock counters */}
      <div className={styles.alertBanner}>
        <div className={`${styles.alertCard} ${styles.alertOut}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <p className={styles.alertCount}>{summary.out}</p>
            <p className={styles.alertLabel}>Ruptures de stock</p>
          </div>
        </div>
        <div className={`${styles.alertCard} ${styles.alertLow}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div>
            <p className={styles.alertCount}>{summary.low}</p>
            <p className={styles.alertLabel}>Stock faibles</p>
          </div>
        </div>
        <div className={`${styles.alertCard} ${styles.alertOk}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <div>
            <p className={styles.alertCount}>{summary.ok}</p>
            <p className={styles.alertLabel}>Stock normal</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input 
            className={styles.search} 
            placeholder="Rechercher un produit…" 
            value={search} 
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} 
          />
        </div>
        <select 
          className={styles.select} 
          value={catFilter} 
          onChange={e => { setCatFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="all">Toutes catégories</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <div className={styles.levelTabs}>
          {[
            ['all', 'Tous'],
            ['out', 'Ruptures'],
            ['low', 'Faibles'],
            ['ok', 'OK']
          ].map(([v, l]) => (
            <button 
              key={v} 
              className={`${styles.levelTab} ${levelFilter === v ? styles.levelTabActive : ''} ${v === 'out' ? styles.ltOut : v === 'low' ? styles.ltLow : v === 'ok' ? styles.ltOk : ''}`} 
              onClick={() => { setLevelFilter(v); setCurrentPage(1); }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner}></div>
          <p>Chargement du stock...</p>
        </div>
      ) : error ? (
        <div className={styles.errorWrap}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3>Erreur de chargement</h3>
          <p>{error}</p>
          <button onClick={fetchProducts} className={styles.btnRetry}>Réessayer</button>
        </div>
      ) : (
        <>
          {/* Products Grid */}
          <div className={styles.stockGrid}>
            {products.map(p => {
              const maxVal = Math.max(p.stock, p.lowStockThreshold * 2, 1);
              const barWidth = Math.min((p.stock / maxVal) * 100, 100);
              return (
                <div key={p.id} className={`${styles.stockCard} ${p.level === 'out' ? styles.cardOut : p.level === 'low' ? styles.cardLow : ''}`}>
                  <div className={styles.cardTop}>
                    <img src={p.image} alt={p.name} className={styles.cardImg} />
                    <div className={styles.cardInfo}>
                      <p className={styles.cardName}>{p.name}</p>
                      <p className={styles.cardCat}>{p.category}</p>
                    </div>
                    <div className={`${styles.stockLevel} ${p.level === 'out' ? styles.levelOut : p.level === 'low' ? styles.levelLow : styles.levelOk}`}>
                      {p.level === 'out' ? 'Rupture' : p.level === 'low' ? 'Faible' : 'OK'}
                    </div>
                  </div>

                  {/* Stock bar */}
                  <div className={styles.barWrap}>
                    <div className={styles.barTrack}>
                      <div
                        className={`${styles.barFill} ${p.level === 'out' ? styles.barOut : p.level === 'low' ? styles.barLow : styles.barOk}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className={styles.cardBottom}>
                    <div className={styles.stockRow}>
                      <span className={`${styles.stockNum} ${p.level === 'out' ? styles.numOut : p.level === 'low' ? styles.numLow : p.level === 'ok' ? styles.numOk : ''}`}>
                        {p.stock} <span className={styles.unitLabel}>unités</span>
                      </span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button 
                          className={styles.btnEditStock} 
                          title="Historique des mouvements"
                          onClick={() => openMovementsDrawer(p)}
                        >
                          📋 Histo
                        </button>
                        <button 
                          className={styles.btnEditStock} 
                          onClick={() => openAdjustModal(p)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Ajuster
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {products.length === 0 && <div className={styles.empty}>Aucun produit trouvé</div>}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.paginationWrap}>
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                className={styles.btnPage}
              >
                Précédent
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  className={`${styles.btnPage} ${currentPage === i + 1 ? styles.activePage : ''}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                className={styles.btnPage}
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}

      {/* Stock Adjustment Modal */}
      {editingProduct && (
        <div className={styles.modalOverlay} onClick={() => setEditingProduct(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Ajustement du stock</h2>
              <button className={styles.modalClose} onClick={() => setEditingProduct(null)}>✕</button>
            </div>
            
            <form onSubmit={handleAdjustSubmit} className={styles.modalBody}>
              <p style={{ fontSize: '0.85rem', color: '#8B8680', marginBottom: '1.25rem' }}>
                Modification du stock pour <strong>{editingProduct.name}</strong>. Stock actuel : <strong>{editingProduct.stock}</strong>.
              </p>

              <div className={styles.formGroup}>
                <label>Mode d'ajustement</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="radio" 
                      name="adjustMode" 
                      value="delta" 
                      checked={adjustMode === 'delta'} 
                      onChange={() => setAdjustMode('delta')} 
                    />
                    Ajustement relatif (ex: +20, -5)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="radio" 
                      name="adjustMode" 
                      value="absolute" 
                      checked={adjustMode === 'absolute'} 
                      onChange={() => setAdjustMode('absolute')} 
                    />
                    Valeur absolue (Nouveau stock)
                  </label>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="adjustVal">
                  {adjustMode === 'delta' ? 'Quantité à ajouter/retirer' : 'Nouvelle quantité en stock'}
                </label>
                <input
                  id="adjustVal"
                  type="number"
                  placeholder={adjustMode === 'delta' ? 'Ex: 10 ou -5' : 'Ex: 45'}
                  value={adjustValue}
                  onChange={e => setAdjustValue(e.target.value)}
                  className={styles.input}
                  required
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="adjustReason">Motif du mouvement</label>
                <select
                  id="adjustReason"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className={styles.selectField}
                >
                  <option value="adjustment">Correction de stock (inventaire)</option>
                  <option value="supply">Approvisionnement (nouveaux articles)</option>
                  <option value="manual">Saisie manuelle</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="adjustNote">Commentaire / Référence</label>
                <textarea
                  id="adjustNote"
                  rows="3"
                  placeholder="Ex: Réception commande fournisseur #887 ou Inventaire mensuel"
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                  className={styles.textarea}
                ></textarea>
              </div>

              {adjustError && <p className={styles.adjustError}>⚠️ {adjustError}</p>}

              <div className={styles.modalFooter}>
                <button 
                  type="button" 
                  className={styles.btnCancel} 
                  onClick={() => setEditingProduct(null)}
                  disabled={adjustLoading}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className={styles.btnSave}
                  disabled={adjustLoading}
                >
                  {adjustLoading ? 'Enregistrement...' : 'Confirmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Movement Drawer */}
      {showDrawer && (
        <div className={styles.drawerOverlay} onClick={() => setShowDrawer(false)}>
          <div className={styles.drawerContent} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>
                {drawerProduct ? `Historique : ${drawerProduct.name}` : 'Historique Global des Mouvements'}
              </h2>
              <button className={styles.drawerClose} onClick={() => setShowDrawer(false)}>✕</button>
            </div>
            
            <div className={styles.drawerBody}>
              {movementsLoading && movements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className={styles.spinner} style={{ margin: '0 auto 1rem' }}></div>
                  <p style={{ color: '#8B8680', fontSize: '0.85rem' }}>Chargement des mouvements...</p>
                </div>
              ) : (
                <>
                  <div className={styles.movementsList}>
                    {movements.map(m => (
                      <div key={m.id} className={styles.movementItem}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span className={styles.movementMeta}>
                              {new Date(m.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className={styles.movementTypeBadge}>
                              {getMovementTypeLabel(m.type)}
                            </span>
                            {!drawerProduct && (
                              <p className={styles.movementProdName}>
                                {m.productName}
                              </p>
                            )}
                          </div>
                          <span className={`${styles.movementQty} ${m.quantity >= 0 ? styles.positive : styles.negative}`}>
                            {m.quantity >= 0 ? `+${m.quantity}` : m.quantity}
                          </span>
                        </div>
                        {m.note && <p className={styles.movementNote}>{m.note}</p>}
                      </div>
                    ))}
                    
                    {movements.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '3rem', color: '#8B8680', fontSize: '0.85rem' }}>
                        Aucun mouvement enregistré.
                      </div>
                    )}
                  </div>

                  {/* Drawer Pagination */}
                  {movementsTotalPages > 1 && (
                    <div className={styles.paginationWrap} style={{ marginTop: '1.5rem', justifyContent: 'center' }}>
                      <button 
                        disabled={movementsPage === 1 || movementsLoading} 
                        onClick={() => setMovementsPage(p => Math.max(p - 1, 1))}
                        className={styles.btnPage}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        ◄
                      </button>
                      <span style={{ fontSize: '0.8rem', color: '#8B8680', alignSelf: 'center', margin: '0 0.5rem' }}>
                        {movementsPage} / {movementsTotalPages}
                      </span>
                      <button 
                        disabled={movementsPage === movementsTotalPages || movementsLoading} 
                        onClick={() => setMovementsPage(p => Math.min(p + 1, movementsTotalPages))}
                        className={styles.btnPage}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        ►
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
