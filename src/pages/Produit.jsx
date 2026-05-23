import { Check, ChevronLeft, ChevronRight, Heart, Minus, Plus, RotateCcw, Shield, ShoppingCart, Star, Truck } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ProductCard from '../components/product/ProductCard';
import { categories } from '../data/products';
import { useAdminStore } from '../store/adminStore';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useUIStore } from '../store/uiStore';
import { getCategoryColorLabel, getCategorySizeLabel } from '../utils/categoryHelpers';
import formatPrice from '../utils/formatPrice';
import styles from './Produit.module.css';

export default function Produit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const products = useAdminStore(s => s.products);
  const product = products.find(p => p.id === parseInt(id));
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const addToast = useUIStore((s) => s.addToast);
  const addReview = useAdminStore(s => s.addReview);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  const [selectedImg, setSelectedImg] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // States for reviews form
  const [revAuthor, setRevAuthor] = useState('');
  const [revComment, setRevComment] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);

  if (!product) {
    return (
      <main className={styles.notFound}>
        <h1>Produit introuvable</h1>
        <Link to="/catalogue" className={styles.backBtn}>Retour au catalogue</Link>
      </main>
    );
  }

  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
  const catName = categories.find(c => c.id === product.category)?.name;

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

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!revAuthor.trim() || !revComment.trim()) {
      addToast("Veuillez remplir tous les champs de l'avis");
      return;
    }
    addReview(product.id, {
      author: revAuthor.trim(),
      rating: revRating,
      comment: revComment.trim()
    });
    addToast("Votre avis a été publié avec succès !");
    setRevAuthor('');
    setRevComment('');
    setRevRating(5);
  };

  const images = product.images || [product.image];

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
              <img src={images[selectedImg]} alt={product.name} className={styles.mainImgEl} />
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
                    <img src={img} alt={`Vue ${i + 1}`} />
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
                  <Star key={i} size={16} fill={i < Math.floor(product.rating) ? 'currentColor' : 'none'} />
                ))}
              </div>
              <span className={styles.ratingText}>{product.rating} ({product.reviews} avis)</span>
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
            {product.colors && (
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
            {product.sizes && (
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

        {/* Dynamic calculation of review statistics */}
        {(() => {
          const reviewsList = product.reviewsList || [];
          const distribution = [0, 0, 0, 0, 0, 0];
          reviewsList.forEach(r => {
            const star = Math.round(r.rating);
            if (star >= 1 && star <= 5) distribution[star]++;
          });
          const totalReviews = reviewsList.length;

          return (
            <section className={styles.reviewsSection}>
              <h2 className={styles.sectionTitle}>Avis des clients ({totalReviews})</h2>
              
              <div className={styles.reviewsLayout}>
                {/* Left side: Stats summary */}
                <div className={styles.reviewsStats}>
                  <div className={styles.averageCard}>
                    <div className={styles.averageNum}>{product.rating}</div>
                    <div className={styles.averageStars}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={20} fill={i < Math.floor(product.rating) ? 'var(--color-primary)' : 'none'} stroke="var(--color-primary)" />
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

                {/* Right side: Add review form */}
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
                      <label htmlFor="reviewAuthor" className={styles.fieldLabel}>Prénom & Nom</label>
                      <input
                        id="reviewAuthor"
                        type="text"
                        className={styles.formInput}
                        value={revAuthor}
                        onChange={(e) => setRevAuthor(e.target.value)}
                        placeholder="Ex: Amadou Diallo..."
                        required
                      />
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

                    <button type="submit" className={styles.submitReviewBtn}>
                      Publier mon avis
                    </button>
                  </form>
                </div>
              </div>

              {/* List of reviews */}
              <div className={styles.reviewsList}>
                {reviewsList.length > 0 ? (
                  reviewsList.map((rev) => {
                    const initials = rev.author
                      ? rev.author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                      : 'U';
                    return (
                      <div key={rev.id} className={styles.reviewCard}>
                        <div className={styles.reviewHeader}>
                          <div className={styles.authorAvatar}>{initials}</div>
                          <div className={styles.authorMeta}>
                            <div className={styles.authorRow}>
                              <span className={styles.authorName}>{rev.author}</span>
                              <span className={styles.verifiedBadge}>✓ Achat vérifié</span>
                            </div>
                            <span className={styles.reviewDate}>{rev.date}</span>
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
          );
        })()}

        {/* Related Products */}
        {related.length > 0 && (
          <section className={styles.related}>
            <h2 className={styles.relatedTitle}>Vous aimerez aussi</h2>
            <div className={styles.relatedGrid}>
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
