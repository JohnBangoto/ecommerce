import React from 'react';
import { X, ShoppingBag, Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import formatPrice from '../../utils/formatPrice';
import styles from './CartDrawer.module.css';

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, getTotal } = useCartStore();
  const total = getTotal();



  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} onClick={closeCart} />

      {/* Drawer */}
      <aside className={styles.drawer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <ShoppingBag size={20} />
            <h2 className={styles.title}>Mon Panier</h2>
            <span className={styles.count}>{items.length} article{items.length !== 1 ? 's' : ''}</span>
          </div>
          <button className={styles.closeBtn} onClick={closeCart} aria-label="Fermer le panier">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className={styles.items}>
          {items.length === 0 ? (
            <div className={styles.empty}>
              <ShoppingBag size={48} strokeWidth={1} />
              <p>Votre panier est vide</p>
              <Link to="/catalogue" className={styles.shopBtn} onClick={closeCart}>
                Découvrir nos produits
              </Link>
            </div>
          ) : (
            items.map(item => (
              <div key={item.key} className={styles.item}>
                <img src={item.product.image} alt={item.product.name} className={styles.itemImg} />
                <div className={styles.itemInfo}>
                  <p className={styles.itemName}>{item.product.name}</p>
                  {item.options?.size && <p className={styles.itemOpt}>Taille : {item.options.size}</p>}
                  {item.options?.color && <p className={styles.itemOpt}>Couleur : {item.options.color}</p>}
                  <div className={styles.itemActions}>
                    <div className={styles.qty}>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        aria-label="Diminuer"
                      >
                        <Minus size={12} />
                      </button>
                      <span className={styles.qtyVal}>{item.quantity}</span>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        aria-label="Augmenter"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className={styles.itemPrice}>
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeItem(item.key)}
                      aria-label="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.freeShipping}>
              {total >= 50000
                ? '✓ Livraison offerte !'
                : `Plus ${formatPrice(50000 - total)} pour la livraison gratuite`}
            </div>
            <div className={styles.totals}>
              <div className={styles.totalRow}>
                <span>Sous-total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className={styles.totalRow}>
                <span>Livraison</span>
                <span>{total >= 50000 ? 'Gratuite' : formatPrice(3500)}</span>
              </div>
              <div className={`${styles.totalRow} ${styles.totalMain}`}>
                <span>Total</span>
                <span>{formatPrice(total >= 50000 ? total : total + 3500)}</span>
              </div>
            </div>
            <Link to="/panier" className={styles.viewCartBtn} onClick={closeCart}>
              Voir le panier
            </Link>
            <Link to="/commande" className={styles.checkoutBtn} onClick={closeCart}>
              Commander <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
