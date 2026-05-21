import React, { useState } from 'react';
import { useAdminStore } from '../../store/adminStore';
import { categories } from '../../data/products';
import styles from './AdminStock.module.css';

export default function AdminStock() {
  const { products, updateStock } = useAdminStore();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState('');

  const getLevel = stock =>
    stock === 0 ? 'out' : stock <= 5 ? 'low' : 'ok';

  const filtered = [...products]
    .filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === 'all' || p.category === catFilter;
      const matchLevel = levelFilter === 'all' || getLevel(p.stock) === levelFilter;
      return matchSearch && matchCat && matchLevel;
    })
    .sort((a, b) => a.stock - b.stock); // Tri par stock croissant (ruptures en premier)

  const alerts = {
    out: products.filter(p => p.stock === 0).length,
    low: products.filter(p => p.stock > 0 && p.stock <= 5).length,
    ok: products.filter(p => p.stock > 5).length,
  };

  const startEdit = (p) => { setEditingId(p.id); setEditVal(String(p.stock)); };
  const saveEdit = (id) => { updateStock(id, editVal); setEditingId(null); };
  const cancelEdit = () => setEditingId(null);

  const maxStock = Math.max(...products.map(p => p.stock), 1);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestion du stock</h1>
          <p className={styles.subtitle}>{products.length} produits · mise à jour en temps réel</p>
        </div>
      </div>

      {/* Alertes résumé */}
      <div className={styles.alertBanner}>
        <div className={`${styles.alertCard} ${styles.alertOut}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <p className={styles.alertCount}>{alerts.out}</p>
            <p className={styles.alertLabel}>Rupture de stock</p>
          </div>
        </div>
        <div className={`${styles.alertCard} ${styles.alertLow}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div>
            <p className={styles.alertCount}>{alerts.low}</p>
            <p className={styles.alertLabel}>Stock faible (≤ 5)</p>
          </div>
        </div>
        <div className={`${styles.alertCard} ${styles.alertOk}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <div>
            <p className={styles.alertCount}>{alerts.ok}</p>
            <p className={styles.alertLabel}>En stock normal</p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className={styles.search} placeholder="Rechercher un produit…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={styles.select} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">Toutes catégories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <div className={styles.levelTabs}>
          {[['all','Tous'],['out','Rupture'],['low','Faible'],['ok','OK']].map(([v,l]) => (
            <button key={v} className={`${styles.levelTab} ${levelFilter===v?styles.levelTabActive:''} ${v==='out'?styles.ltOut:v==='low'?styles.ltLow:v==='ok'?styles.ltOk:''}`} onClick={() => setLevelFilter(v)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Grille stock */}
      <div className={styles.stockGrid}>
        {filtered.map(p => {
          const level = getLevel(p.stock);
          const cat = categories.find(c => c.id === p.category);
          const barWidth = Math.min((p.stock / maxStock) * 100, 100);
          const isEditing = editingId === p.id;
          return (
            <div key={p.id} className={`${styles.stockCard} ${level==='out'?styles.cardOut:level==='low'?styles.cardLow:''}`}>
              <div className={styles.cardTop}>
                <img src={p.image} alt={p.name} className={styles.cardImg} />
                <div className={styles.cardInfo}>
                  <p className={styles.cardName}>{p.name}</p>
                  <p className={styles.cardCat}>{cat?.icon} {cat?.name}</p>
                </div>
                <div className={`${styles.stockLevel} ${level==='out'?styles.levelOut:level==='low'?styles.levelLow:styles.levelOk}`}>
                  {level==='out'?'Rupture':level==='low'?'Faible':'OK'}
                </div>
              </div>

              {/* Barre de stock */}
              <div className={styles.barWrap}>
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${level==='out'?styles.barOut:level==='low'?styles.barLow:styles.barOk}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>

              {/* Stock value + edit */}
              <div className={styles.cardBottom}>
                {isEditing ? (
                  <div className={styles.editRow}>
                    <input
                      type="number" min="0"
                      className={styles.editInput}
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => { if(e.key==='Enter') saveEdit(p.id); if(e.key==='Escape') cancelEdit(); }}
                      autoFocus
                    />
                    <button className={styles.btnSave} onClick={() => saveEdit(p.id)}>✓</button>
                    <button className={styles.btnCancel} onClick={cancelEdit}>✕</button>
                  </div>
                ) : (
                  <div className={styles.stockRow}>
                    <span className={`${styles.stockNum} ${level==='out'?styles.numOut:level==='low'?styles.numLow:styles.numOk}`}>
                      {p.stock} <span className={styles.unitLabel}>unités</span>
                    </span>
                    <button className={styles.btnEditStock} onClick={() => startEdit(p)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Modifier
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <div className={styles.empty}>Aucun produit trouvé</div>}
    </div>
  );
}
