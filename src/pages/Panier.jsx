import { ArrowRight, Minus, Plus, ShoppingBag, Tag, Trash2, Truck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import formatPrice from '../utils/formatPrice';
import styles from './Panier.module.css';

export default function Panier() {
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const total = getTotal();
  const shipping = total >= 50000 ? 0 : 3500;
  const grandTotal = total + shipping;


  if (items.length === 0) {
    return (
      <main className={styles.page}>
        <div className="container">
          <div className={styles.empty}>
            <ShoppingBag size={80} strokeWidth={1} className={styles.emptyIcon} />
            <h1 className={styles.emptyTitle}>Votre panier est vide</h1>
            <p className={styles.emptyDesc}>Vous n'avez pas encore ajouté de produits à votre panier.</p>
            <Link to="/catalogue" className={styles.shopBtn}>
              Découvrir nos produits <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>Mon Panier</h1>
          <button className={styles.clearBtn} onClick={clearCart}>Vider le panier</button>
        </div>

        <div className={styles.layout}>
          {/* Items list */}
          <div className={styles.itemsList}>
            {/* Free shipping bar */}
            <div className={styles.shippingBar}>
              <Truck size={16} />
              {total >= 50000 ? (
                <span>🎉 Vous bénéficiez de la <strong>livraison gratuite</strong> !</span>
              ) : (
                <span>Plus <strong>{formatPrice(50000 - total)}</strong> pour la livraison gratuite</span>
              )}
              <div className={styles.shippingProgress}>
                <div className={styles.shippingFill} style={{ width: `${Math.min((total / 50000) * 100, 100)}%` }} />
              </div>
            </div>

            {items.map(item => (
              <div key={item.key} className={styles.item}>
                <Link to={`/produit/${item.product.id}`} className={styles.itemImgLink}>
                  <img src={item.product.image} alt={item.product.name} className={styles.itemImg} />
                </Link>
                <div className={styles.itemInfo}>
                  <div className={styles.itemTop}>
                    <div>
                      <p className={styles.itemCat}>{item.product.category}</p>
                      <Link to={`/produit/${item.product.id}`} className={styles.itemName}>{item.product.name}</Link>
                      <div className={styles.itemOpts}>
                        {item.options?.size && <span>Taille : {item.options.size}</span>}
                        {item.options?.color && <span>Couleur : {item.options.color}</span>}
                      </div>
                    </div>
                    <button className={styles.removeBtn} onClick={() => removeItem(item.key)} aria-label="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className={styles.itemBottom}>
                    <div className={styles.qtyControl}>
                      <button className={styles.qtyBtn} onClick={() => updateQuantity(item.key, item.quantity - 1)}>
                        <Minus size={14} />
                      </button>
                      <span className={styles.qtyVal}>{item.quantity}</span>
                      <button className={styles.qtyBtn} onClick={() => updateQuantity(item.key, item.quantity + 1)}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className={styles.itemPrices}>
                      {item.quantity > 1 && (
                        <span className={styles.unitPrice}>
                          {formatPrice(item.product.price)} × {item.quantity}
                        </span>
                      )}
                      <span className={styles.itemTotal}>
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <aside className={styles.summary}>
            <h2 className={styles.summaryTitle}>Récapitulatif</h2>

            {/* Coupon */}
            <div className={styles.coupon}>
              <Tag size={14} />
              <input type="text" placeholder="Code promo" className={styles.couponInput} />
              <button className={styles.couponBtn}>Appliquer</button>
            </div>

            <div className={styles.summaryLines}>
              <div className={styles.summaryLine}>
                <span>Sous-total ({items.reduce((a, i) => a + i.quantity, 0)} articles)</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className={styles.summaryLine}>
                <span>Livraison</span>
                <span className={shipping === 0 ? styles.free : ''}>{shipping === 0 ? 'Gratuite' : formatPrice(shipping)}</span>
              </div>
              <div className={`${styles.summaryLine} ${styles.summaryTotal}`}>
                <span>Total TTC</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>
            </div>

            <Link
              to={isAuthenticated ? '/commande' : '/login'}
              className={styles.checkoutBtn}
              state={isAuthenticated ? {} : { from: '/commande' }}
            >
              {isAuthenticated ? 'Commander' : 'Se connecter pour commander'} <ArrowRight size={18} />
            </Link>
            <Link to="/catalogue" className={styles.continueBtn}>
              Continuer mes achats
            </Link>

            <div className={styles.paymentInfo}>
              <p>Paiement 100% sécurisé</p>
              <div className={styles.paymentIcons}>
                <span className={styles.payIcon}>VISA</span>
                <span className={styles.payIcon}>MC</span>
                <span className={styles.payIcon}>PayPal</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
