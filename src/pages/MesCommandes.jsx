import {
  ArrowRight,
  CheckCircle,
  Clock,
  Home,
  Package,
  PackageOpen,
  RefreshCw,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { orderStatusLabels } from '../data/orders';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { useUIStore } from '../store/uiStore';
import formatPrice from '../utils/formatPrice';
import styles from './MesCommandes.module.css';

const statusIcons = {
  confirmed: <CheckCircle size={15} />,
  prepared: <Package size={15} />,
  shipped: <Truck size={15} />,
  delivered: <Home size={15} />,
  cancelled: <PackageOpen size={15} />,
};

const timelineSteps = ['confirmed', 'prepared', 'shipped', 'delivered'];

function OrderStatusBar({ status }) {
  const currentIndex = timelineSteps.indexOf(status);
  if (status === 'cancelled') {
    return (
      <div className={styles.cancelledBar}>
        <PackageOpen size={14} />
        Commande annulée
      </div>
    );
  }
  return (
    <div className={styles.statusBar}>
      {timelineSteps.map((step, i) => {
        const isDone = i <= currentIndex;
        const isActive = i === currentIndex;
        const label = orderStatusLabels[step]?.label || step;
        return (
          <div key={step} className={`${styles.statusStep} ${isDone ? styles.stepDone : ''} ${isActive ? styles.stepActive : ''}`}>
            <div className={styles.stepDot}>{isDone && <CheckCircle size={10} />}</div>
            <span className={styles.stepLabel}>{label}</span>
            {i < timelineSteps.length - 1 && (
              <div className={`${styles.stepLine} ${isDone && i < currentIndex ? styles.stepLineDone : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MesCommandes() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const { orders, loading, fetchUserOrders } = useOrderStore();

  useEffect(() => {
    if (!isAuthenticated) {
      addToast('Connectez-vous pour voir vos commandes.', 'warning');
      navigate('/login');
      return;
    }
    fetchUserOrders();
  }, [isAuthenticated, addToast, navigate, fetchUserOrders]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  return (
    <main className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.avatarCircle}>
            {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className={styles.title}>Mes commandes</h1>
            <p className={styles.subtitle}>
              Bienvenue, <strong>{user?.firstName || user?.email}</strong> — retrouvez ici toutes vos commandes et leur statut en temps réel.
            </p>
          </div>
          <button
            className={styles.refreshBtn}
            onClick={() => fetchUserOrders()}
            disabled={loading}
            aria-label="Actualiser"
          >
            <RefreshCw size={16} className={loading ? styles.spinning : ''} />
            Actualiser
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className={styles.emptyState}>
            <RefreshCw size={48} className={styles.spinning} strokeWidth={1.5} />
            <p>Chargement de vos commandes...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && orders.length === 0 && (
          <div className={styles.emptyState}>
            <ShoppingBag size={64} strokeWidth={1} className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>Aucune commande pour le moment</h2>
            <p className={styles.emptyDesc}>Explorez notre catalogue et passez votre première commande !</p>
            <Link to="/catalogue" className={styles.emptyBtn}>
              Voir le catalogue <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* Orders list */}
        {!loading && orders.length > 0 && (
          <div className={styles.ordersList}>
            {orders.map((order) => {
              const statusInfo = orderStatusLabels[order.status] || { label: order.status, color: '#666', bg: '#eee' };
              return (
                <div key={order.id} className={styles.orderCard}>
                  {/* Card header */}
                  <div className={styles.cardHeader}>
                    <div className={styles.cardHeaderLeft}>
                      <div className={styles.orderId}>
                        <Package size={14} />
                        {order.id}
                      </div>
                      <div className={styles.orderMeta}>
                        <Clock size={12} />
                        {formatDate(order.date || order.createdAt)}
                      </div>
                    </div>
                    <div className={styles.cardHeaderRight}>
                      <span
                        className={styles.statusBadge}
                        style={{ color: statusInfo.color, background: statusInfo.bg }}
                      >
                        {statusIcons[order.status]}
                        {statusInfo.label}
                      </span>
                      <span className={styles.orderTotal}>{formatPrice(order.total)}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className={styles.progressSection}>
                    <OrderStatusBar status={order.status} />
                  </div>

                  {/* Items preview */}
                  <div className={styles.itemsPreview}>
                    <div className={styles.itemsImages}>
                      {(order.items || []).slice(0, 4).map((item, i) => (
                        <div key={i} className={styles.itemThumb}>
                          <img src={item.image} alt={item.name} />
                          {i === 3 && order.items.length > 4 && (
                            <div className={styles.moreOverlay}>+{order.items.length - 4}</div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className={styles.itemsSummary}>
                      <span className={styles.itemsCount}>
                        {order.items?.length || 0} article{(order.items?.length || 0) > 1 ? 's' : ''}
                      </span>
                      {order.items?.[0] && (
                        <span className={styles.firstItemName}>{order.items[0].name}{order.items.length > 1 ? ` et ${order.items.length - 1} autre${order.items.length > 2 ? 's' : ''}` : ''}</span>
                      )}
                    </div>
                    <Link
                      to={`/suivi/${order.id}`}
                      className={styles.trackBtn}
                    >
                      Suivre <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
