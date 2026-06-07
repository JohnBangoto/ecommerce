import { ArrowRight, CheckCircle, MapPin, Package, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useOrderStore } from '../store/orderStore';
import formatPrice from '../utils/formatPrice';
import styles from './Confirmation.module.css';

export default function Confirmation() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);

  const getOrderById = useOrderStore((state) => state.getOrderById);
  const getTrackingToken = useOrderStore((state) => state.getTrackingToken);
  const currentOrder = useOrderStore((state) => state.currentOrder);

  useEffect(() => {
    async function loadOrder() {
      const trackingToken = getTrackingToken(orderId);
      const fromStore = await getOrderById(orderId, { trackingToken });
      if (fromStore) {
        setOrder(fromStore);
        return;
      }

      if (currentOrder) {
        setOrder(currentOrder);
      }
    }

    loadOrder();
  }, [currentOrder, getOrderById, getTrackingToken, orderId]);

  const trackingToken = order?.trackingToken || getTrackingToken(orderId);
  const trackingLink = trackingToken
    ? `/suivi/${orderId || order?.id}?token=${encodeURIComponent(trackingToken)}`
    : `/suivi/${orderId || order?.id}`;

  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.card}>
          <div className={styles.iconWrap}>
            <div className={styles.iconCircle}>
              <CheckCircle size={48} />
            </div>
            <div className={styles.iconRing} />
            <div className={styles.iconRing2} />
          </div>

          <h1 className={styles.title}>Commande Confirmee !</h1>
          <p className={styles.subtitle}>
            Merci pour votre commande. Vous recevrez un email de confirmation sous peu.
          </p>

          {order && (
            <div className={styles.orderId}>
              Numero de commande : <strong>{order.id || orderId}</strong>
            </div>
          )}

          {order && (
            <div className={styles.summary}>
              <h2 className={styles.summaryTitle}>Recapitulatif de votre commande</h2>
              <div className={styles.items}>
                {order.items?.map((item, index) => (
                  <div key={index} className={styles.item}>
                    <img src={item.image} alt={item.name} className={styles.itemImg} />
                    <div className={styles.itemInfo}>
                      <p className={styles.itemName}>{item.name}</p>
                      <p className={styles.itemQty}>Qte : {item.quantity}</p>
                    </div>
                    <span className={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className={styles.totals}>
                <div className={styles.totalRow}>
                  <span>Sous-total</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className={styles.totalRow}>
                  <span>Livraison</span>
                  <span>{order.shipping === 0 ? 'Gratuite' : formatPrice(order.shipping)}</span>
                </div>
                <div className={`${styles.totalRow} ${styles.totalMain}`}>
                  <span>Total paye</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          )}

          <div className={styles.steps}>
            <div className={styles.nextStep}>
              <div className={styles.nextStepIcon}>
                <Package size={20} />
              </div>
              <div>
                <p className={styles.nextStepTitle}>Preparation</p>
                <p className={styles.nextStepDesc}>Votre commande est en cours de preparation</p>
              </div>
            </div>
            <div className={styles.nextStepLine} />
            <div className={styles.nextStep}>
              <div className={styles.nextStepIcon}>
                <MapPin size={20} />
              </div>
              <div>
                <p className={styles.nextStepTitle}>Suivi</p>
                <p className={styles.nextStepDesc}>Conservez votre lien de suivi securise</p>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <Link to={trackingLink} className={styles.trackBtn}>
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
