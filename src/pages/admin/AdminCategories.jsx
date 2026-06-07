import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';
import styles from './AdminCategories.module.css';

const EMPTY_FORM = { name: '', slug: '' };

function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal état
  const [modal, setModal] = useState(null); // null | { mode: 'add' | 'edit', category?: {} }
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugAuto, setSlugAuto] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/categories');
      setCategories(data);
    } catch (err) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setSlugAuto(true);
    setFormError('');
    setModal({ mode: 'add' });
  };

  const openEdit = (cat) => {
    setForm({ name: cat.name, slug: cat.slug });
    setSlugAuto(false);
    setFormError('');
    setModal({ mode: 'edit', category: cat });
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm((f) => ({
      ...f,
      name,
      slug: slugAuto ? generateSlug(name) : f.slug,
    }));
  };

  const handleSlugChange = (e) => {
    setSlugAuto(false);
    setForm((f) => ({ ...f, slug: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Le nom est obligatoire.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (modal.mode === 'add') {
        const res = await api.post('/categories', form);
        setCategories((prev) => [...prev, res.category].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const res = await api.put(`/categories/${modal.category.id}`, form);
        setCategories((prev) =>
          prev.map((c) => (c.id === modal.category.id ? res.category : c)).sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      setModal(null);
    } catch (err) {
      setFormError(err.message || 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/categories/${confirmDelete.id}`);
      setCategories((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      alert(err.message || 'Impossible de supprimer cette catégorie.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestion des catégories</h1>
          <p className={styles.subtitle}>{categories.length} catégorie{categories.length !== 1 ? 's' : ''} au total</p>
        </div>
        <button className={styles.btnAdd} onClick={openAdd} id="btn-add-category">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nouvelle catégorie
        </button>
      </div>

      {loading && (
        <div className={styles.loadingWrap}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      )}

      {error && (
        <div className={styles.errorBanner}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
          <button onClick={loadCategories}>Réessayer</button>
        </div>
      )}

      {!loading && !error && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Slug</th>
                <th>Produits</th>
                <th>Créée le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>Aucune catégorie trouvée</td></tr>
              )}
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td>
                    <span className={styles.catName}>{cat.name}</span>
                  </td>
                  <td>
                    <code className={styles.slug}>{cat.slug}</code>
                  </td>
                  <td>
                    <span className={`${styles.countBadge} ${cat.productCount > 0 ? styles.countActive : styles.countEmpty}`}>
                      {cat.productCount} produit{cat.productCount !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(cat.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.btnEdit}
                        onClick={() => openEdit(cat)}
                        title="Modifier"
                        id={`btn-edit-category-${cat.id}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button
                        className={styles.btnDelete}
                        onClick={() => setConfirmDelete(cat)}
                        title="Supprimer"
                        id={`btn-delete-category-${cat.id}`}
                        disabled={cat.productCount > 0}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ajouter / Modifier */}
      {modal && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {modal.mode === 'add' ? 'Nouvelle catégorie' : 'Modifier la catégorie'}
              </h2>
              <button className={styles.closeBtn} onClick={() => setModal(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="cat-name">Nom de la catégorie *</label>
                <input
                  id="cat-name"
                  value={form.name}
                  onChange={handleNameChange}
                  placeholder="Ex: Montres de Luxe"
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="cat-slug">
                  Slug (URL)
                  <span className={styles.slugHint}>Généré automatiquement</span>
                </label>
                <input
                  id="cat-slug"
                  value={form.slug}
                  onChange={handleSlugChange}
                  placeholder="montres-de-luxe"
                />
                <p className={styles.fieldHint}>Uniquement lettres minuscules, chiffres et tirets.</p>
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
              <button
                className={styles.btnSave}
                onClick={handleSave}
                disabled={saving}
                id="btn-save-category"
              >
                {saving ? 'Enregistrement…' : modal.mode === 'add' ? 'Créer' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation suppression */}
      {confirmDelete && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className={styles.confirmModal}>
            <div className={styles.confirmIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4h6v2"/></svg>
            </div>
            <h3 className={styles.confirmTitle}>Supprimer la catégorie ?</h3>
            <p className={styles.confirmText}>«{confirmDelete.name}» sera définitivement supprimée.</p>
            <div className={styles.confirmActions}>
              <button className={styles.btnCancel} onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button
                className={styles.btnDanger}
                onClick={handleDelete}
                disabled={deleting}
                id="btn-confirm-delete-category"
              >
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
