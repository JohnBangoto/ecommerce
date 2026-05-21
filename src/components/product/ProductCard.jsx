import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useUIStore } from '../../store/uiStore';
import formatPrice from '../../utils/formatPrice';
import styles from './ProductCard.module.css';

export default function ProductCard({ product }) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const addToast = useUIStore((s) => s.addToast);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    addToast(`"${product.name}" ajouté au panier`);
  };


  return (
    <Link to={`/produit/${product.id}`} className={styles.card}>
      {/* Image */}
      <div className={styles.imageWrap}>
        <img
          src={product.image}
          alt={product.name}
          className={styles.image}
          loading="lazy"
        />
        {/* Badges */}
        <div className={styles.badges}>
          {product.isNew && <span className={`badge badge-accent ${styles.badge}`}>Nouveau</span>}
          {product.discount > 0 && (
            <span className={`badge badge-primary ${styles.badge}`}>-{product.discount}%</span>
          )}
          {product.stock <= 5 && product.stock > 0 && (
            <span className={`badge badge-warning ${styles.badge}`}>Stock limité</span>
          )}
        </div>
        {/* Favoris */}
        <button
          className={styles.wishlistBtn}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          aria-label="Ajouter aux favoris"
        >
          <Heart size={16} />
        </button>
        {/* Add to Cart overlay */}
        <div className={styles.cartOverlay}>
          <button className={styles.addToCartBtn} onClick={handleAddToCart}>
            <ShoppingCart size={16} />
            Ajouter au panier
          </button>
        </div>
      </div>

      {/* Info */}
      <div className={styles.info}>
        <p className={styles.category}>
          {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
        </p>
        <h3 className={styles.name}>{product.name}</h3>

        {/* Note */}
        <div className={styles.rating}>
          <div className={styles.stars}>
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={12}
                fill={i < Math.floor(product.rating) ? 'currentColor' : 'none'}
              />
            ))}
          </div>
          <span className={styles.ratingText}>
            {product.rating} ({product.reviews})
          </span>
        </div>

        {/* Prix */}
        <div className={styles.prices}>
          <span className={styles.price}>{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className={styles.originalPrice}>{formatPrice(product.originalPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
