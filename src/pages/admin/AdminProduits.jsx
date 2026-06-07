import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';
import formatPrice from '../../utils/formatPrice';
import styles from './AdminProduits.module.css';

const CONDITION_LABELS = {
  new: 'Neuf',
  used: 'Occasion',
  refurbished: 'Non précisé',
};

const EMPTY_FORM = {
  name: '', description: '', price: '', stock: '',
  categoryId: '', sizes: '', colors: '',
  condition: 'new', isActive: true, isFeatured: false, isNew: true,
  lowStockThreshold: 5,
};

const PAGE_SIZE = 20;

// Debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function AdminProduits() {
  // ─── Data state ───────────────────────────────────────────────────────────
  const [products, setProducts]       = useState([]);
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [total, setTotal]             = useState(0);
  const [totalPages, setTotalPages]   = useState(1);

  // ─── Filters & pagination ─────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [catFilter, setCatFilter]     = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [condFilter, setCondFilter]   = useState('all');
  const [page, setPage]               = useState(1);
  const debouncedSearch               = useDebounce(searchInput, 500);

  // ─── Modal state ──────────────────────────────────────────────────────────
  const [modal, setModal]             = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [existingImages, setExistingImages] = useState([]); // URLs déjà en BDD
  const [newFiles, setNewFiles]       = useState([]);       // File objects
  const [newPreviews, setNewPreviews] = useState([]);       // preview URLs
  const [mainImage, setMainImage]     = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [formError, setFormError]     = useState('');
  const [toggling, setToggling]       = useState(null); // product id being toggled

  const fileInputRef = useRef(null);

  // ─── Load categories (once) ───────────────────────────────────────────────
  useEffect(() => {
    api.get('/categories').then(setCategories).catch(() => {});
  }, []);

  // ─── Load products ────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page,
        limit: PAGE_SIZE,
        isActive: activeFilter,
        condition: condFilter,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (catFilter !== 'all') params.set('category', catFilter);

      const data = await api.get(`/admin/products?${params.toString()}`);
      setProducts(data.products);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, catFilter, activeFilter, condFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, catFilter, activeFilter, condFilter]);

  // ─── Open modals ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm({
      ...EMPTY_FORM,
      categoryId: categories[0]?.id || '',
    });
    setExistingImages([]);
    setNewFiles([]);
    setNewPreviews([]);
    setMainImage('');
    setFormError('');
    setModal({ mode: 'add' });
  };

  const openEdit = (p) => {
    const imgs = Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : []);
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      stock: String(p.stock),
      categoryId: p.categoryId || categories.find(c => c.slug === p.category)?.id || '',
      sizes: Array.isArray(p.sizes) ? p.sizes.join(', ') : (p.sizes || ''),
      colors: Array.isArray(p.colors) ? p.colors.join(', ') : (p.colors || ''),
      condition: p.condition || 'new',
      isActive: p.isActive !== false,
      isFeatured: p.isFeatured === true,
      isNew: p.isNew !== false,
      lowStockThreshold: p.lowStockThreshold || 5,
    });
    setExistingImages(imgs);
    setNewFiles([]);
    setNewPreviews([]);
    setMainImage(imgs[0] || '');
    setFormError('');
    setModal({ mode: 'edit', id: p.id });
  };

  // ─── File handling ────────────────────────────────────────────────────────
  const handleFileAdd = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const previews = files.map((f) => URL.createObjectURL(f));
    setNewFiles((prev) => [...prev, ...files]);
    setNewPreviews((prev) => {
      const next = [...prev, ...previews];
      // Définir comme image principale si aucune
      if (!mainImage && existingImages.length === 0 && next.length > 0) {
        setMainImage(next[0]);
      }
      return next;
    });
    e.target.value = '';
  };

  const removeExistingImage = (url) => {
    setExistingImages((prev) => {
      const next = prev.filter((u) => u !== url);
      if (mainImage === url) setMainImage(next[0] || newPreviews[0] || '');
      return next;
    });
  };

  const removeNewImage = (idx) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => {
      const url = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      if (mainImage === url) {
        setMainImage(existingImages[0] || next[0] || '');
      }
      URL.revokeObjectURL(url);
      return next;
    });
  };

  // ─── Save (create / update) ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Le nom est obligatoire.'); return; }
    if (!form.price || isNaN(parseFloat(form.price))) { setFormError('Le prix est obligatoire.'); return; }
    if (!form.categoryId) { setFormError('Veuillez choisir une catégorie.'); return; }

    setSaving(true);
    setFormError('');

    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('description', form.description);
      fd.append('price', parseFloat(form.price) || 0);
      fd.append('stock', parseInt(form.stock) || 0);
      fd.append('categoryId', form.categoryId);
      fd.append('sizes', form.sizes);
      fd.append('colors', form.colors);
      fd.append('condition', form.condition);
      fd.append('isActive', form.isActive);
      fd.append('isFeatured', form.isFeatured);
      fd.append('isNew', form.isNew);
      fd.append('lowStockThreshold', form.lowStockThreshold);

      // Nouvelles images
      newFiles.forEach((f) => fd.append('images', f));

      let res;
      if (modal.mode === 'add') {
        res = await api.postMultipart('/products', fd, { isAdmin: true });
        setProducts((prev) => [res.product, ...prev]);
        setTotal((t) => t + 1);
      } else {
        // Indiquer au backend quelles images existantes garder
        fd.append('keepImages', existingImages.join(','));
        res = await api.putMultipart(`/products/${modal.id}`, fd, { isAdmin: true });
        setProducts((prev) => prev.map((p) => p.id === modal.id ? res.product : p));
      }

      setModal(null);
    } catch (err) {
      setFormError(err.message || 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${confirmDelete.id}`, { isAdmin: true });
      setProducts((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      setTotal((t) => t - 1);
      setConfirmDelete(null);
    } catch (err) {
      alert(err.message || 'Impossible de supprimer ce produit.');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Toggle isActive ──────────────────────────────────────────────────────
  const handleToggleActive = async (p) => {
    setToggling(p.id);
    try {
      const fd = new FormData();
      fd.append('isActive', !p.isActive);
      fd.append('name', p.name); // required by updateProductSchema (at least 1 field)
      const res = await api.putMultipart(`/products/${p.id}`, fd, { isAdmin: true });
      setProducts((prev) => prev.map((x) => x.id === p.id ? res.product : x));
    } catch (err) {
      console.error('Toggle active failed:', err);
    } finally {
      setToggling(null);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const stockStatus = (stock) =>
    stock === 0 ? { label: 'Rupture', cls: styles.stockOut } :
    stock <= 5  ? { label: 'Faible', cls: styles.stockLow } :
                  { label: 'En stock', cls: styles.stockOk };

  const allImages = [...existingImages, ...newPreviews];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestion des produits</h1>
          <p className={styles.subtitle}>{total} produit{total !== 1 ? 's' : ''} au total</p>
        </div>
        <button className={styles.btnAdd} onClick={openAdd} id="btn-add-product">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Ajouter un produit
        </button>
      </div>

      {/* Filtres */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className={styles.search}
            placeholder="Rechercher un produit…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            id="admin-product-search"
          />
          {searchInput && (
            <button className={styles.clearSearch} onClick={() => setSearchInput('')}>✕</button>
          )}
        </div>
        <select className={styles.select} value={catFilter} onChange={(e) => setCatFilter(e.target.value)} id="filter-category">
          <option value="all">Toutes catégories</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select className={styles.select} value={condFilter} onChange={(e) => setCondFilter(e.target.value)} id="filter-condition">
          <option value="all">Tous les états</option>
          <option value="new">Neuf</option>
          <option value="used">Occasion</option>
          <option value="refurbished">Non précisé</option>
        </select>
        <select className={styles.select} value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} id="filter-active">
          <option value="all">Tous statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorBanner}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
          <button onClick={loadProducts}>Réessayer</button>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.skeletonWrap}>
            {[...Array(6)].map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Produit</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>État</th><th>Statut</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr><td colSpan={7} className={styles.empty}>Aucun produit trouvé</td></tr>
                )}
                {products.map((p) => {
                  const ss = stockStatus(p.stock);
                  const thumb = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : (p.image || '/placeholder.jpg');
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className={styles.productCell}>
                          <img src={thumb} alt={p.name} className={styles.thumb} onError={(e) => { e.target.src = '/placeholder.jpg'; }} />
                          <div>
                            <p className={styles.productName}>{p.name}</p>
                            <div className={styles.badgeRow}>
                              {p.isNew && <span className={styles.badgeNew}>Nouveau</span>}
                              {p.isFeatured && <span className={styles.badgeFeatured}>Vedette</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.catBadge}>{p.categoryName || p.category}</span>
                      </td>
                      <td>
                        <span className={styles.price}>{formatPrice(p.price)}</span>
                      </td>
                      <td>
                        <span className={`${styles.stockBadge} ${ss.cls}`}>{p.stock} — {ss.label}</span>
                      </td>
                      <td>
                        <span className={`${styles.condBadge} ${styles[`cond_${p.condition}`]}`}>
                          {CONDITION_LABELS[p.condition] || p.condition}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`${styles.toggleBtn} ${p.isActive ? styles.toggleActive : styles.toggleInactive}`}
                          onClick={() => handleToggleActive(p)}
                          disabled={toggling === p.id}
                          title={p.isActive ? 'Désactiver' : 'Activer'}
                          id={`toggle-active-${p.id}`}
                        >
                          {toggling === p.id ? '…' : p.isActive ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button className={styles.btnEdit} onClick={() => openEdit(p)} title="Modifier" id={`btn-edit-product-${p.id}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className={styles.btnDelete} onClick={() => setConfirmDelete(p)} title="Supprimer" id={`btn-delete-product-${p.id}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Précédent
                </button>
                <div className={styles.pageNumbers}>
                  {[...Array(totalPages)].map((_, i) => {
                    const p = i + 1;
                    if (totalPages > 7 && Math.abs(p - page) > 2 && p !== 1 && p !== totalPages) {
                      if (p === page - 3 || p === page + 3) return <span key={p} className={styles.pageDots}>…</span>;
                      if (Math.abs(p - page) > 3) return null;
                    }
                    return (
                      <button
                        key={p}
                        className={`${styles.pageNum} ${p === page ? styles.pageNumActive : ''}`}
                        onClick={() => setPage(p)}
                        id={`page-btn-${p}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Suivant
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <span className={styles.pageInfo}>Page {page} / {totalPages} — {total} produit{total !== 1 ? 's' : ''}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Modal Ajouter / Modifier ─── */}
      {modal && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{modal.mode === 'add' ? 'Ajouter un produit' : 'Modifier le produit'}</h2>
              <button className={styles.closeBtn} onClick={() => setModal(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>

                {/* Nom */}
                <div className={styles.formGroup} style={{ gridColumn: '1/-1' }}>
                  <label>Nom du produit *</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Veste en Cuir…" />
                </div>

                {/* Catégorie + Prix */}
                <div className={styles.formGroup}>
                  <label>Catégorie *</label>
                  <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                    <option value="">— Choisir —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Prix (FCFA) *</label>
                  <input type="number" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0" />
                </div>

                {/* Stock + Seuil alerte */}
                <div className={styles.formGroup}>
                  <label>Stock</label>
                  <input type="number" min="0" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} placeholder="0" />
                </div>
                <div className={styles.formGroup}>
                  <label>Seuil d'alerte stock</label>
                  <input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: parseInt(e.target.value) || 5 }))} />
                </div>

                {/* État du produit */}
                <div className={styles.formGroup}>
                  <label>État du produit</label>
                  <select value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}>
                    <option value="new">Neuf</option>
                    <option value="used">Occasion</option>
                    <option value="refurbished">Non précisé</option>
                  </select>
                </div>

                {/* Description */}
                <div className={styles.formGroup} style={{ gridColumn: '1/-1' }}>
                  <label>Description</label>
                  <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Description du produit…" />
                </div>

                {/* Tailles */}
                <div className={styles.formGroup}>
                  <label>Tailles (virgule)</label>
                  <input value={form.sizes} onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value }))} placeholder="S, M, L, XL" />
                </div>

                {/* Couleurs */}
                <div className={styles.formGroup}>
                  <label>Couleurs (virgule)</label>
                  <input value={form.colors} onChange={(e) => setForm((f) => ({ ...f, colors: e.target.value }))} placeholder="Noir, Blanc, Rouge" />
                </div>

                {/* Photos */}
                <div className={styles.formGroup} style={{ gridColumn: '1/-1' }}>
                  <label>Photos du produit</label>

                  {/* Grille d'aperçu */}
                  {allImages.length > 0 && (
                    <div className={styles.imagesGrid}>
                      {/* Images existantes */}
                      {existingImages.map((url, idx) => (
                        <div key={`existing-${idx}`} className={`${styles.imageCard} ${mainImage === url ? styles.imageCardMain : ''}`}>
                          <img src={url} alt={`Photo ${idx + 1}`} className={styles.imageCardImg} onError={(e) => { e.target.src = '/placeholder.jpg'; }} />
                          {mainImage === url
                            ? <span className={styles.mainBadge}>Principale</span>
                            : <button type="button" className={styles.setMainBtn} onClick={() => setMainImage(url)}>Principale</button>}
                          <button type="button" className={styles.removeImgBtn} onClick={() => removeExistingImage(url)}>✕</button>
                        </div>
                      ))}
                      {/* Nouvelles images (aperçu local) */}
                      {newPreviews.map((url, idx) => (
                        <div key={`new-${idx}`} className={`${styles.imageCard} ${styles.imageCardNew} ${mainImage === url ? styles.imageCardMain : ''}`}>
                          <img src={url} alt={`Nouvelle ${idx + 1}`} className={styles.imageCardImg} />
                          <span className={styles.newBadgeImg}>Nouveau</span>
                          {mainImage === url
                            ? <span className={styles.mainBadge}>Principale</span>
                            : <button type="button" className={styles.setMainBtn} onClick={() => setMainImage(url)}>Principale</button>}
                          <button type="button" className={styles.removeImgBtn} onClick={() => removeNewImage(idx)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Zone upload */}
                  <div
                    className={styles.uploadZone}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span>Cliquer pour uploader des photos</span>
                    <small>JPEG, PNG, WebP — 5 Mo max par fichier — 10 max</small>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileAdd} />
                </div>

                {/* Checkboxes */}
                <div className={styles.checkRow} style={{ gridColumn: '1/-1' }}>
                  <label className={styles.checkLabel}>
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                    <span className={styles.checkText}>
                      <strong>Produit actif</strong>
                      <small>Visible dans le catalogue</small>
                    </span>
                  </label>
                  <label className={styles.checkLabel}>
                    <input type="checkbox" checked={form.isNew} onChange={(e) => setForm((f) => ({ ...f, isNew: e.target.checked }))} />
                    <span className={styles.checkText}>
                      <strong>Badge Nouveau</strong>
                      <small>Afficher le badge "Nouveau"</small>
                    </span>
                  </label>
                  <label className={styles.checkLabel}>
                    <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))} />
                    <span className={styles.checkText}>
                      <strong>Produit vedette</strong>
                      <small>Mis en avant sur la home</small>
                    </span>
                  </label>
                </div>

              </div>

              {formError && (
                <div className={styles.formError}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {formError}
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setModal(null)}>Annuler</button>
              <button className={styles.btnSave} onClick={handleSave} disabled={saving} id="btn-save-product">
                {saving ? 'Enregistrement…' : modal.mode === 'add' ? 'Ajouter' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Confirmation suppression ─── */}
      {confirmDelete && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className={styles.confirmModal}>
            <div className={styles.confirmIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4h6v2"/></svg>
            </div>
            <h3 className={styles.confirmTitle}>Supprimer le produit ?</h3>
            <p className={styles.confirmText}>«{confirmDelete.name}» sera définitivement supprimé.</p>
            <div className={styles.confirmActions}>
              <button className={styles.btnCancel} onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button className={styles.btnDanger} onClick={handleDelete} disabled={deleting} id="btn-confirm-delete-product">
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
