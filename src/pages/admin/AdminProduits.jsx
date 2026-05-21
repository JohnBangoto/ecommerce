import React, { useState, useRef } from 'react';
import { useAdminStore } from '../../store/adminStore';
import { categories } from '../../data/products';
import formatPrice from '../../utils/formatPrice';
import {
  getCategoryColorLabel,
  getCategoryColorPlaceholder,
  getCategorySizeLabel,
  getCategorySizePlaceholder
} from '../../utils/categoryHelpers';
import styles from './AdminProduits.module.css';

const EMPTY_PRODUCT = {
  name:'', category:'mode', price:'', originalPrice:'', discount:0,
  stock:'', description:'', image:'', tags:'', colors:'', sizes:'', isNew:false, isFeatured:false,
};

export default function AdminProduits() {
  const { products, updateProduct, deleteProduct, addProduct } = useAdminStore();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [newUrl, setNewUrl] = useState('');
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setForm(f => {
        const currentImgs = f.images || (f.image ? [f.image] : []);
        const newImages = [...currentImgs, dataUrl];
        return {
          ...f,
          images: newImages,
          image: f.image || dataUrl
        };
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddUrl = () => {
    if (!newUrl.trim()) return;
    const url = newUrl.trim();
    setForm(f => {
      const currentImgs = f.images || (f.image ? [f.image] : []);
      const newImages = [...currentImgs, url];
      return {
        ...f,
        images: newImages,
        image: f.image || url
      };
    });
    setNewUrl('');
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || p.category === catFilter;
    const matchStock = stockFilter === 'all' ||
      (stockFilter === 'ok' && p.stock > 5) ||
      (stockFilter === 'low' && p.stock > 0 && p.stock <= 5) ||
      (stockFilter === 'out' && p.stock === 0);
    return matchSearch && matchCat && matchStock;
  });

  const openAdd = () => { setForm({ ...EMPTY_PRODUCT, images: [], colors: '', sizes: '' }); setNewUrl(''); setModal({ mode:'add' }); };
  const openEdit = p => {
    const imgs = p.images && p.images.length > 0 ? p.images : (p.image ? [p.image] : []);
    setForm({
      ...p,
      tags: (p.tags||[]).join(', '),
      colors: (p.colors||[]).join(', '),
      sizes: (p.sizes||[]).join(', '),
      price: String(p.price),
      originalPrice: String(p.originalPrice||''),
      stock: String(p.stock),
      images: imgs
    });
    setNewUrl('');
    setModal({ mode:'edit', id: p.id });
  };

  const handleSave = () => {
    const imgs = form.images && form.images.length > 0 ? form.images : (form.image ? [form.image] : []);
    const data = {
      ...form,
      price: parseFloat(form.price)||0,
      originalPrice: parseFloat(form.originalPrice)||null,
      stock: parseInt(form.stock)||0,
      tags: typeof form.tags === 'string' ? form.tags.split(',').map(t=>t.trim()).filter(Boolean) : (form.tags||[]),
      colors: typeof form.colors === 'string' ? form.colors.split(',').map(c=>c.trim()).filter(Boolean) : (form.colors||[]),
      sizes: typeof form.sizes === 'string' ? form.sizes.split(',').map(s=>s.trim()).filter(Boolean) : (form.sizes||[]),
      images: imgs,
      image: form.image || imgs[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
    };
    if (modal.mode === 'add') addProduct(data);
    else updateProduct(modal.id, data);
    setModal(null);
  };

  const stockStatus = stock =>
    stock === 0 ? { label:'Rupture', cls: styles.stockOut } :
    stock <= 5  ? { label:'Faible', cls: styles.stockLow } :
                  { label:'En stock', cls: styles.stockOk };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestion des produits</h1>
          <p className={styles.subtitle}>{products.length} produits au total</p>
        </div>
        <button className={styles.btnAdd} onClick={openAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Ajouter un produit
        </button>
      </div>

      {/* Filtres */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className={styles.search} placeholder="Rechercher un produit…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className={styles.select} value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
          <option value="all">Toutes catégories</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <select className={styles.select} value={stockFilter} onChange={e=>setStockFilter(e.target.value)}>
          <option value="all">Tous les stocks</option>
          <option value="ok">En stock</option>
          <option value="low">Stock faible</option>
          <option value="out">Rupture</option>
        </select>
        <span className={styles.resultCount}>{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tableau */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Produit</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const ss = stockStatus(p.stock);
              const cat = categories.find(c=>c.id===p.category);
              return (
                <tr key={p.id}>
                  <td>
                    <div className={styles.productCell}>
                      <img src={p.image} alt={p.name} className={styles.thumb}/>
                      <div>
                        <p className={styles.productName}>{p.name}</p>
                        {p.isNew && <span className={styles.badgeNew}>Nouveau</span>}
                        {p.isFeatured && <span className={styles.badgeFeatured}>Vedette</span>}
                      </div>
                    </div>
                  </td>
                  <td><span className={styles.catBadge}>{cat?.icon} {cat?.name}</span></td>
                  <td>
                    <span className={styles.price}>{formatPrice(p.price)}</span>
                    {p.originalPrice && <span className={styles.originalPrice}>{formatPrice(p.originalPrice)}</span>}
                  </td>
                  <td>
                    <div className={styles.stockEdit}>
                      <input
                        type="number" min="0"
                        className={styles.stockInput}
                        value={p.stock}
                        onChange={e => updateProduct(p.id, { stock: parseInt(e.target.value)||0 })}
                      />
                    </div>
                  </td>
                  <td><span className={`${styles.stockBadge} ${ss.cls}`}>{ss.label}</span></td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.btnEdit} onClick={()=>openEdit(p)} title="Modifier">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className={styles.btnDelete} onClick={()=>setConfirmDelete(p)} title="Supprimer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className={styles.empty}>Aucun produit trouvé</div>}
      </div>

      {/* Modal Ajouter / Modifier */}
      {modal && (
        <div className={styles.overlay} onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{modal.mode==='add' ? 'Ajouter un produit' : 'Modifier le produit'}</h2>
              <button className={styles.closeBtn} onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup} style={{gridColumn:'1/-1'}}>
                  <label>Nom du produit</label>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Veste en Cuir…"/>
                </div>
                <div className={styles.formGroup}>
                  <label>Catégorie</label>
                  <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                    {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                 <div className={styles.formGroup}>
                  <label>Prix (FCFA)</label>
                  <input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder="0"/>
                </div>
                <div className={styles.formGroup}>
                  <label>Prix barré (FCFA)</label>
                  <input type="number" value={form.originalPrice} onChange={e=>setForm(f=>({...f,originalPrice:e.target.value}))} placeholder="Optionnel"/>
                </div>
                <div className={styles.formGroup}>
                  <label>Stock</label>
                  <input type="number" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} placeholder="0"/>
                </div>
                <div className={styles.formGroup} style={{gridColumn:'1/-1'}}>
                  <label>Description</label>
                  <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3} placeholder="Description du produit…"/>
                </div>

                <div className={styles.formGroup} style={{gridColumn:'1/-1'}}>
                  <label>Photos du produit</label>
                  
                  {/* Grid of current photos */}
                  <div className={styles.imagesGrid}>
                    {(form.images || []).map((img, idx) => (
                      <div key={idx} className={styles.imageCard}>
                        <img src={img} alt={`Aperçu ${idx}`} className={styles.imageCardImg} />
                        {form.image === img ? (
                          <span className={styles.mainBadge}>Principale</span>
                        ) : (
                          <button
                            type="button"
                            className={styles.setMainBtn}
                            onClick={() => setForm(f => ({ ...f, image: img }))}
                          >
                            Principale
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.removeImgBtn}
                          onClick={() => {
                            const newImages = form.images.filter((_, i) => i !== idx);
                            const isMainDeleted = form.image === img;
                            setForm(f => ({
                              ...f,
                              images: newImages,
                              image: isMainDeleted ? (newImages[0] || '') : f.image
                            }));
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Row to add a new photo */}
                  <div className={styles.addImageRow}>
                    <div className={styles.uploadZoneMini} onClick={() => fileInputRef.current?.click()}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span>Uploader une photo</span>
                    </div>
                    
                    <div className={styles.urlAddWrap}>
                      <input
                        value={newUrl}
                        onChange={e => setNewUrl(e.target.value)}
                        placeholder="Ou coller l'URL d'une image..."
                        className={styles.miniUrlInput}
                      />
                      <button
                        type="button"
                        className={styles.btnAddUrl}
                        onClick={handleAddUrl}
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{display:'none'}}
                    onChange={handleImageUpload}
                  />
                </div>
                <div className={styles.formGroup} style={{gridColumn:'1/-1'}}>
                  <label>Tags (séparés par des virgules)</label>
                  <input value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="cuir, luxe, artisan"/>
                </div>
                <div className={styles.formGroup} style={{gridColumn:'1/-1'}}>
                  <label>{getCategoryColorLabel(form.category)} (séparés par des virgules)</label>
                  <input value={form.colors} onChange={e=>setForm(f=>({...f,colors:e.target.value}))} placeholder={getCategoryColorPlaceholder(form.category)}/>
                </div>
                <div className={styles.formGroup} style={{gridColumn:'1/-1'}}>
                  <label>{getCategorySizeLabel(form.category)} (séparés par des virgules)</label>
                  <input value={form.sizes} onChange={e=>setForm(f=>({...f,sizes:e.target.value}))} placeholder={getCategorySizePlaceholder(form.category)}/>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.checkLabel}>
                    <input type="checkbox" checked={form.isNew} onChange={e=>setForm(f=>({...f,isNew:e.target.checked}))}/>
                    Nouveau produit
                  </label>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.checkLabel}>
                    <input type="checkbox" checked={form.isFeatured} onChange={e=>setForm(f=>({...f,isFeatured:e.target.checked}))}/>
                    Produit vedette
                  </label>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={()=>setModal(null)}>Annuler</button>
              <button className={styles.btnSave} onClick={handleSave}>
                {modal.mode==='add' ? 'Ajouter' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation suppression */}
      {confirmDelete && (
        <div className={styles.overlay} onClick={e=>e.target===e.currentTarget&&setConfirmDelete(null)}>
          <div className={styles.confirmModal}>
            <div className={styles.confirmIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4h6v2"/></svg>
            </div>
            <h3 className={styles.confirmTitle}>Supprimer le produit ?</h3>
            <p className={styles.confirmText}>«{confirmDelete.name}» sera définitivement supprimé.</p>
            <div className={styles.confirmActions}>
              <button className={styles.btnCancel} onClick={()=>setConfirmDelete(null)}>Annuler</button>
              <button className={styles.btnDanger} onClick={()=>{ deleteProduct(confirmDelete.id); setConfirmDelete(null); }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
