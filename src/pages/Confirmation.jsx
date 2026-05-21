import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Package, MapPin, ArrowRight, ShoppingBag } from 'lucide-react';
import { useAdminStore } from '../store/adminStore';
import { useOrderStore } from '../store/orderStore';
import { mockOrders } from '../data/orders';
import formatPrice from '../utils/formatPrice';
import styles from './Confirmation.module.css';

export default function Confirmation() {
  const { orderId } = useParams();

  // adminStore = source de vérité unique pour les statuts
  const adminOrders  = useAdminStore(s => s.orders);
  const getOrderById = useOrderStore(s => s.getOrderById);
  const currentOrder = useOrderStore(s => s.currentOrder);

  // Priorité : adminStore → orderStore → mockOrders
  const order =
    adminOrders.find(o => o.id === orderId)
    || getOrderById(orderId)
    || mockOrders.find(o => o.id === orderId)
    || currentOrder;


  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.card}>
          {/* Success Icon */}
          <div className={styles.iconWrap}>
            <div className={styles.iconCircle}>
              <CheckCircle size={48} />
            </div>
            <div className={styles.iconRing} />
            <div className={styles.iconRing2} />
          </div>

          <h1 className={styles.title}>Commande Confirmée !</h1>
          <p className={styles.subtitle}>
            Merci pour votre commande. Vous recevrez un email de confirmation sous peu.
          </p>

          {order && (
            <div className={styles.orderId}>
              Numéro de commande : <strong>{order.id || orderId}</strong>
            </div>
          )}

          {/* Order Summary */}
          {order && (
            <div className={styles.summary}>
              <h2 className={styles.summaryTitle}>Récapitulatif de votre commande</h2>
              <div className={styles.items}>
                {order.items?.map((item, i) => (
                  <div key={i} className={styles.item}>
                    <img src={item.image} alt={item.name} className={styles.itemImg} />
                    <div className={styles.itemInfo}>
                      <p className={styles.itemName}>{item.name}</p>
                      <p className={styles.itemQty}>Qté : {item.quantity}</p>
                    </div>
                    <span className={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className={styles.totals}>
                <div className={styles.totalRow}><span>Sous-total</span><span>{formatPrice(order.subtotal)}</span></div>
                <div className={styles.totalRow}><span>Livraison</span><span>{order.shipping === 0 ? 'Gratuite' : formatPrice(order.shipping)}</span></div>
                <div className={`${styles.totalRow} ${styles.totalMain}`}>
                  <span>Total payé</span><span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className={styles.steps}>
            <div className={styles.nextStep}>
              <div className={styles.nextStepIcon}><Package size={20} /></div>
              <div>
                <p className={styles.nextStepTitle}>Préparation</p>
                <p className={styles.nextStepDesc}>Votre commande est en cours de préparation</p>
              </div>
            </div>
            <div className={styles.nextStepLine} />
            <div className={styles.nextStep}>
              <div className={styles.nextStepIcon}><MapPin size={20} /></div>
              <div>
                <p className={styles.nextStepTitle}>Suivi</p>
                <p className={styles.nextStepDesc}>Recevez votre numéro de suivi par email</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link to={`/suivi/${orderId || (order?.id)}`} className={styles.trackBtn}>
              <Package size={18} /> Suivre ma commande <ArrowRight size={16} />
            </Link>
            <Link to="/catalogue" className={styles.shopBtn}>
              <ShoppingBag size={18} /> Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
