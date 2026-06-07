import { Check, ChevronLeft, ChevronRight, Heart, Minus, Plus, RotateCcw, Shield, ShoppingCart, Star, Truck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ProductCard from '../components/product/ProductCard';
import { useProductStore } from '../store/productStore';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useUIStore } from '../store/uiStore';
import { getCategoryColorLabel, getCategorySizeLabel } from '../utils/categoryHelpers';
import formatPrice from '../utils/formatPrice';
import styles from './Produit.module.css';

function SkeletonDetail() {
  return (
    <main style={{ padding: '40px 0' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ background: '#f3f4f6', borderRadius: 12, height: 400, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function Produit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { fetchProduct, fetchProducts, product, productLoading, productError, submitReview } = useProductStore();
  const addItem = useCartStore((s) => s.addItem);
  const addToast = useUIStore((s) => s.addToast);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const [selectedImg, setSelectedImg]   = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity]         = useState(1);
  const [added, setAdded]               = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);

  // Review form
  const [revComment, setRevComment]   = useState('');
  const [revRating, setRevRating]     = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setSelectedImg(0);
    setSelectedSize('');
    setSelectedColor('');
    setQuantity(1);
    fetchProduct(id);
  }, [id]);

  // Charger les produits liés quand le produit est chargé
  useEffect(() => {
    if (product?.category) {
      fetchProducts({ category: product.category, limit: 5 }).then(data => {
        setRelatedProducts((data.products || []).filter(p => p.id !== product.id).slice(0, 4));
      });
    }
  }, [product?.id, product?.category]);

  if (productLoading) return <SkeletonDetail />;

  if (productError || !product) {
    return (
      <main className={styles.notFound}>
        <h1>Produit introuvable</h1>
        <Link to="/catalogue" className={styles.backBtn}>Retour au catalogue</Link>
      </main>
    );
  }

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.image || '/placeholder.jpg'];

  const catName = product.categoryName || product.category;

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      addToast('Connectez-vous pour ajouter un produit au panier.', 'warning');
      navigate('/login', { state: { from: location } });
      return;
    }
    addItem(product, quantity, {
      size: selectedSize || undefined,
      color: selectedColor || undefined,
    });
    addToast(`"${product.name}" ajouté au panier`);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      addToast('Connectez-vous pour laisser un avis.', 'warning');
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!revComment.trim()) {
      addToast('Veuillez écrire un commentaire.');
      return;
    }
    setSubmittingReview(true);
    try {
      await submitReview(product.id, { rating: revRating, comment: revComment.trim() });
      addToast('Votre avis a été publié avec succès !');
      setRevComment('');
      setRevRating(5);
    } catch (err) {
      addToast(err.message || 'Impossible de publier l\'avis.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const reviewsList = Array.isArray(product.reviewsList) ? product.reviewsList : [];
  const totalReviews = reviewsList.length;
  const avgRating = totalReviews > 0
    ? parseFloat((reviewsList.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1))
    : (product.rating || 0);

  const distribution = [0, 0, 0, 0, 0, 0];
  reviewsList.forEach(r => {
    const star = Math.round(r.rating);
    if (star >= 1 && star <= 5) distribution[star]++;
  });

  return (
    <main className={styles.page}>
      <div className="container">
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link to="/">Accueil</Link>
          <span>/</span>
          <Link to="/catalogue">Catalogue</Link>
          <span>/</span>
          <Link to={`/catalogue?cat=${product.category}`}>{catName}</Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        {/* Product Layout */}
        <div className={styles.layout}>
          {/* Gallery */}
          <div className={styles.gallery}>
            <div className={styles.mainImg}>
              <img src={images[selectedImg]} alt={product.name} className={styles.mainImgEl} onError={e => { e.target.src = '/placeholder.jpg'; }} />
              {product.discount > 0 && (
                <span className={`badge badge-primary ${styles.discountBadge}`}>-{product.discount}%</span>
              )}
              {product.isNew && (
                <span className={`badge badge-accent ${styles.newBadge}`}>Nouveau</span>
              )}
              {images.length > 1 && (
                <>
                  <button className={`${styles.imgNav} ${styles.imgNavPrev}`} onClick={() => setSelectedImg((selectedImg - 1 + images.length) % images.length)}><ChevronLeft size={20}/></button>
                  <button className={`${styles.imgNav} ${styles.imgNavNext}`} onClick={() => setSelectedImg((selectedImg + 1) % images.length)}><ChevronRight size={20}/></button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className={styles.thumbs}>
                {images.map((img, i) => (
                  <button key={i} className={`${styles.thumb} ${i === selectedImg ? styles.thumbActive : ''}`} onClick={() => setSelectedImg(i)}>
                    <img src={img} alt={`Vue ${i + 1}`} onError={e => { e.target.src = '/placeholder.jpg'; }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className={styles.info}>
            <p className={styles.category}>{catName}</p>
            <h1 className={styles.name}>{product.name}</h1>

            {/* Rating */}
            <div className={styles.rating}>
              <div className={styles.stars}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < Math.floor(avgRating) ? 'currentColor' : 'none'} />
                ))}
              </div>
              <span className={styles.ratingText}>{avgRating} ({totalReviews} avis)</span>
            </div>

            {/* Price */}
            <div className={styles.priceBlock}>
              <span className={styles.price}>{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <>
                  <span className={styles.originalPrice}>{formatPrice(product.originalPrice)}</span>
                  <span className={styles.savings}>Économisez {formatPrice(product.originalPrice - product.price)}</span>
                </>
              )}
            </div>

            <div className={styles.divider} />

            {/* Description */}
            <p className={styles.description}>{product.description}</p>

            {/* Colors */}
            {Array.isArray(product.colors) && product.colors.length > 0 && (
              <div className={styles.optionGroup}>
                <p className={styles.optionLabel}>{getCategoryColorLabel(product.category)} {selectedColor && <span>: <strong>{selectedColor}</strong></span>}</p>
                <div className={styles.colorOptions}>
                  {product.colors.map(color => (
                    <button
                      key={color}
                      className={`${styles.colorBtn} ${selectedColor === color ? styles.colorActive : ''}`}
                      onClick={() => setSelectedColor(selectedColor === color ? '' : color)}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {Array.isArray(product.sizes) && product.sizes.length > 0 && (
              <div className={styles.optionGroup}>
                <p className={styles.optionLabel}>{getCategorySizeLabel(product.category)} {selectedSize && <span>: <strong>{selectedSize}</strong></span>}</p>
                <div className={styles.sizeOptions}>
                  {product.sizes.map(size => (
                    <button
                      key={size}
                      className={`${styles.sizeBtn} ${selectedSize === size ? styles.sizeActive : ''}`}
                      onClick={() => setSelectedSize(selectedSize === size ? '' : size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className={styles.optionGroup}>
              <p className={styles.optionLabel}>Quantité</p>
              <div className={styles.qtyControl}>
                <button className={styles.qtyBtn} onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={14}/></button>
                <span className={styles.qtyVal}>{quantity}</span>
                <button className={styles.qtyBtn} onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}><Plus size={14}/></button>
                <span className={styles.stockInfo}>
                  {product.stock > 10 ? '✓ En stock' : product.stock > 0 ? `Seulement ${product.stock} restants !` : 'Rupture de stock'}
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className={styles.ctas}>
              <button
                className={`${styles.addBtn} ${added ? styles.addedBtn : ''}`}
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                {added ? <><Check size={18}/> Ajouté !</> : <><ShoppingCart size={18}/> Ajouter au panier</>}
              </button>
              <button className={styles.wishlistBtn} aria-label="Ajouter aux favoris">
                <Heart size={20}/>
              </button>
            </div>

            <button
              className={styles.buyNowBtn}
              disabled={product.stock === 0}
              onClick={() => {
                if (!isAuthenticated) {
                  addToast('Connectez-vous pour commander.', 'warning');
                  navigate('/login', { state: { from: location } });
                  return;
                }
                addItem(product, quantity, {
                  size: selectedSize || undefined,
                  color: selectedColor || undefined,
                });
                navigate('/commande');
              }}
            >
              {isAuthenticated ? 'Commander maintenant' : 'Connectez-vous pour commander'}
            </button>

            {/* Assurances */}
            <div className={styles.guarantees}>
              <div className={styles.guarantee}><Truck size={16}/> <span>Livraison gratuite dès 50 000 FCFA</span></div>
              <div className={styles.guarantee}><RotateCcw size={16}/> <span>30 jours pour retourner</span></div>
              <div className={styles.guarantee}><Shield size={16}/> <span>Paiement 100% sécurisé</span></div>
            </div>
          </div>
        </div>

        {/* Avis */}
        <section className={styles.reviewsSection}>
          <h2 className={styles.sectionTitle}>Avis des clients ({totalReviews})</h2>

          <div className={styles.reviewsLayout}>
            {/* Stats */}
            <div className={styles.reviewsStats}>
              <div className={styles.averageCard}>
                <div className={styles.averageNum}>{avgRating || '—'}</div>
                <div className={styles.averageStars}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={20} fill={i < Math.floor(avgRating) ? 'var(--color-primary)' : 'none'} stroke="var(--color-primary)" />
                  ))}
                </div>
                <p className={styles.averageText}>Note moyenne globale</p>
                <p className={styles.totalAvis}>{totalReviews} avis client{totalReviews !== 1 ? 's' : ''}</p>
              </div>

              <div className={styles.starsBars}>
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = distribution[stars] || 0;
                  const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={stars} className={styles.barRow}>
                      <span className={styles.barLabel}>{stars} ★</span>
                      <div className={styles.barOuter}>
                        <div className={styles.barInner} style={{ width: `${percent}%` }} />
                      </div>
                      <span className={styles.barCount}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Formulaire avis */}
            <div className={styles.addReviewCard}>
              <h3 className={styles.cardSubTitle}>Partager votre expérience</h3>
              <form onSubmit={handleReviewSubmit} className={styles.reviewForm}>
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Votre note</label>
                  <div className={styles.interactiveStars}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = hoverRating ? star <= hoverRating : star <= revRating;
                      return (
                        <button
                          key={star}
                          type="button"
                          className={styles.starBtn}
                          onClick={() => setRevRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          aria-label={`Noter ${star} étoiles`}
                        >
                          <Star
                            size={26}
                            fill={isActive ? 'var(--color-primary)' : 'none'}
                            stroke="var(--color-primary)"
                            style={{ transition: 'all 150ms ease' }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="reviewComment" className={styles.fieldLabel}>Commentaire</label>
                  <textarea
                    id="reviewComment"
                    className={styles.formTextarea}
                    value={revComment}
                    onChange={(e) => setRevComment(e.target.value)}
                    placeholder="Qu'avez-vous pensé de ce produit ?"
                    rows={4}
                    required
                  />
                </div>

                <button type="submit" className={styles.submitReviewBtn} disabled={submittingReview}>
                  {submittingReview ? 'Publication…' : 'Publier mon avis'}
                </button>
              </form>
            </div>
          </div>

          {/* Liste des avis */}
          <div className={styles.reviewsList}>
            {reviewsList.length > 0 ? (
              reviewsList.map((rev) => {
                const authorName = rev.user
                  ? `${rev.user.firstName || ''} ${rev.user.lastName || ''}`.trim() || rev.user.email
                  : (rev.author || 'Anonyme');
                const initials = authorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                const dateStr = rev.createdAt
                  ? new Date(rev.createdAt).toLocaleDateString('fr-FR')
                  : (rev.date || '');
                return (
                  <div key={rev.id} className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.authorAvatar}>{initials}</div>
                      <div className={styles.authorMeta}>
                        <div className={styles.authorRow}>
                          <span className={styles.authorName}>{authorName}</span>
                          <span className={styles.verifiedBadge}>✓ Achat vérifié</span>
                        </div>
                        <span className={styles.reviewDate}>{dateStr}</span>
                      </div>
                      <div className={styles.cardStars}>
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill={i < rev.rating ? 'var(--color-primary)' : 'none'} stroke="var(--color-primary)" />
                        ))}
                      </div>
                    </div>
                    <p className={styles.reviewCommentText}>{rev.comment}</p>
                  </div>
                );
              })
            ) : (
              <div className={styles.noReviews}>
                Aucun avis pour le moment. Soyez le premier à donner votre avis !
              </div>
            )}
          </div>
        </section>

        {/* Produits liés */}
        {relatedProducts.length > 0 && (
          <section className={styles.related}>
            <h2 className={styles.relatedTitle}>Vous aimerez aussi</h2>
            <div className={styles.relatedGrid}>
              {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
