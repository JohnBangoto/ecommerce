import { ArrowRight, CheckCircle, Clock, Home, Package, Search, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { orderStatusLabels } from '../data/orders';
import { useAdminStore } from '../store/adminStore';
import { useOrderStore } from '../store/orderStore';
import formatPrice from '../utils/formatPrice';
import styles from './Suivi.module.css';

const timelineIcons = {
  confirmed: <CheckCircle size={18} />,
  prepared: <Package size={18} />,
  shipped: <Truck size={18} />,
  delivered: <Home size={18} />,
};

export default function Suivi() {
  const { orderId } = useParams();
  const location = useLocation();
  const tokenFromUrl = new URLSearchParams(location.search).get('token') || '';

  const adminOrders = useAdminStore((state) => state.orders);
  const getOrderById = useOrderStore((state) => state.getOrderById);
  const getTrackingToken = useOrderStore((state) => state.getTrackingToken);

  const [searchId, setSearchId] = useState(orderId || '');
  const [trackingToken, setTrackingToken] = useState(tokenFromUrl);
  const [searched, setSearched] = useState(Boolean(orderId));
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searched || !searchId.trim()) {
      setOrder(null);
      return;
    }

    async function loadOrder() {
      setLoading(true);

      const fromAdmin = adminOrders.find((entry) => entry.id === searchId);
      if (fromAdmin) {
        setOrder(fromAdmin);
        setLoading(false);
        return;
      }

      const resolvedToken = trackingToken || getTrackingToken(searchId);
      const fromStore = await getOrderById(searchId, { trackingToken: resolvedToken });
      if (fromStore) {
        setOrder(fromStore);
        setLoading(false);
        return;
      }

      setOrder(null);
      setLoading(false);
    }

    loadOrder();
  }, [adminOrders, getOrderById, getTrackingToken, searched, searchId, trackingToken]);

  const statusInfo = order ? orderStatusLabels[order.status] : null;

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return null;
    }

    return new Date(dateValue).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSearch = (event) => {
    event.preventDefault();
    if (searchId.trim()) {
      setSearched(true);
    }
  };

  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>Suivi de Commande</h1>
          <p className={styles.desc}>
            Entrez votre numero de commande et, si besoin, votre jeton de suivi securise.
          </p>
        </div>

        <form className={styles.searchForm} onSubmit={handleSearch}>
          <div className={styles.searchWrap}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              value={searchId}
              onChange={(event) => {
                setSearchId(event.target.value);
                setSearched(false);
              }}
              placeholder="Ex: CMD-2026-DEMO-001"
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchBtn}>
              Suivre <ArrowRight size={16} />
            </button>
          </div>
          <input
            type="text"
            value={trackingToken}
            onChange={(event) => {
              setTrackingToken(event.target.value);
              setSearched(false);
            }}
            placeholder="Jeton de suivi securise (si vous l'avez)"
            className={styles.searchInput}
            style={{ marginTop: '0.75rem' }}
          />
          <p className={styles.searchHint}>
            Pour une commande invite, utilisez le lien de suivi fourni apres confirmation.
          </p>
        </form>

        {loading && (
          <div className={styles.notFound}>
            <Package size={56} strokeWidth={1} className={styles.notFoundIcon} />
            <h2 className={styles.notFoundTitle}>Chargement...</h2>
          </div>
        )}

        {searched && !loading && !order && (
          <div className={styles.notFound}>
            <Package size={56} strokeWidth={1} className={styles.notFoundIcon} />
            <h2 className={styles.notFoundTitle}>Commande introuvable</h2>
            <p className={styles.notFoundDesc}>
              Verifiez votre numero de commande et, pour une commande invite, utilisez le jeton de
              suivi associe.
            </p>
          </div>
        )}

        {order && (
          <div className={styles.orderCard}>
            <div className={styles.orderHeader}>
              <div>
                <p className={styles.orderNum}>Commande {order.id}</p>
                <p className={styles.orderDate}>Passee le {formatDate(order.date || order.createdAt)}</p>
              </div>
              <span
                className={styles.statusBadge}
                style={{ color: statusInfo?.color, background: statusInfo?.bg }}
              >
                {statusInfo?.label}
              </span>
            </div>

            <div className={styles.timeline}>
              {order.timeline.map((step, index) => (
                <div
                  key={step.step}
                  className={`${styles.timelineStep} ${step.done ? styles.done : styles.pending}`}
                >
                  <div className={styles.timelineLeft}>
                    <div className={styles.timelineIconWrap}>{timelineIcons[step.step]}</div>
                    {index < order.timeline.length - 1 && (
                      <div
                        className={`${styles.timelineLine} ${
                          step.done && order.timeline[index + 1]?.done ? styles.timelineLineDone : ''
                        }`}
                      />
                    )}
                  </div>
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineLabel}>{step.label}</p>
                    {step.date ? (
                      <p className={styles.timelineDate}>
                        <Clock size={12} /> {formatDate(step.date)}
                      </p>
                    ) : (
                      <p className={styles.timelinePending}>En attente...</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {order.trackingNumber && (
              <div className={styles.trackingBox}>
                <Truck size={16} />
                <div>
                  <p className={styles.trackingLabel}>Numero de suivi transporteur</p>
                  <p className={styles.trackingNum}>{order.trackingNumber}</p>
                </div>
              </div>
            )}

            {order.shippingAddress && (
              <div className={styles.addressBox}>
                <Home size={16} className={styles.addressIcon} />
                <div>
                  <p className={styles.addressLabel}>Adresse de livraison</p>
                  <p className={styles.addressVal}>
                    {order.shippingAddress.name}
                    <br />
                    {order.shippingAddress.address}
                    <br />
                    {order.shippingAddress.postalCode} {order.shippingAddress.city},{' '}
                    {order.shippingAddress.country}
                  </p>
                </div>
              </div>
            )}

            <div className={styles.itemsSection}>
              <h3 className={styles.itemsTitle}>Articles commandes</h3>
              <div className={styles.items}>
                {order.items.map((item, index) => (
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
              <div className={styles.orderTotal}>
                <span>Total de la commande</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        )}

        {!searched && (
          <div className={styles.demoOrders}>
            <p className={styles.demoTitle}>Entrez un numéro de commande pour afficher le suivi réel.</p>
            <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>
              <Link to="/catalogue">Retour au catalogue</Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
