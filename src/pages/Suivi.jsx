import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, Package, CheckCircle, Truck, Home, Clock, ArrowRight } from 'lucide-react';
import { mockOrders, orderStatusLabels } from '../data/orders';
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

  // adminStore = source de vérité unique (statuts mis à jour par le back-office)
  const adminOrders   = useAdminStore(s => s.orders);
  const orderStoreGet = useOrderStore(s => s.getOrderById);

  const [searchId, setSearchId] = useState(orderId || '');
  const [searched, setSearched] = useState(!!orderId);

  // Priorité : adminStore → orderStore → mockOrders statiques
  const findOrder = (id) =>
    adminOrders.find(o => o.id === id)
    || orderStoreGet(id)
    || mockOrders.find(o => o.id === id);

  const order = searched ? findOrder(searchId) : null;
  const statusInfo = order ? orderStatusLabels[order.status] : null;

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };



  const handleSearch = (e) => {
    e.preventDefault();
    if (searchId.trim()) setSearched(true);
  };

  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>Suivi de Commande</h1>
          <p className={styles.desc}>Entrez votre numéro de commande pour suivre votre livraison en temps réel.</p>
        </div>

        {/* Search */}
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <div className={styles.searchWrap}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              value={searchId}
              onChange={(e) => { setSearchId(e.target.value); setSearched(false); }}
              placeholder="Ex: CMD-2024-001"
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchBtn}>
              Suivre <ArrowRight size={16} />
            </button>
          </div>
          <p className={styles.searchHint}>
            Essayez : <button type="button" className={styles.hintBtn} onClick={() => { setSearchId('CMD-2024-001'); setSearched(true); }}>CMD-2024-001</button>
            {' '}ou{' '}
            <button type="button" className={styles.hintBtn} onClick={() => { setSearchId('CMD-2024-002'); setSearched(true); }}>CMD-2024-002</button>
          </p>
        </form>

        {/* Not Found */}
        {searched && !order && (
          <div className={styles.notFound}>
            <Package size={56} strokeWidth={1} className={styles.notFoundIcon} />
            <h2 className={styles.notFoundTitle}>Commande introuvable</h2>
            <p className={styles.notFoundDesc}>
              Vérifiez votre numéro de commande ou consultez votre email de confirmation.
            </p>
          </div>
        )}

        {/* Order Found */}
        {order && (
          <div className={styles.orderCard}>
            {/* Order Header */}
            <div className={styles.orderHeader}>
              <div>
                <p className={styles.orderNum}>Commande {order.id}</p>
                <p className={styles.orderDate}>Passée le {formatDate(order.date)}</p>
              </div>
              <span
                className={styles.statusBadge}
                style={{ color: statusInfo?.color, background: statusInfo?.bg }}
              >
                {statusInfo?.label}
              </span>
            </div>

            {/* Timeline */}
            <div className={styles.timeline}>
              {order.timeline.map((step, i) => (
                <div key={step.step} className={`${styles.timelineStep} ${step.done ? styles.done : styles.pending}`}>
                  <div className={styles.timelineLeft}>
                    <div className={styles.timelineIconWrap}>
                      {timelineIcons[step.step]}
                    </div>
                    {i < order.timeline.length - 1 && (
                      <div className={`${styles.timelineLine} ${step.done && order.timeline[i + 1]?.done ? styles.timelineLineDone : ''}`} />
                    )}
                  </div>
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineLabel}>{step.label}</p>
                    {step.date ? (
                      <p className={styles.timelineDate}><Clock size={12} /> {formatDate(step.date)}</p>
                    ) : (
                      <p className={styles.timelinePending}>En attente…</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Tracking Number */}
            {order.trackingNumber && (
              <div className={styles.trackingBox}>
                <Truck size={16} />
                <div>
                  <p className={styles.trackingLabel}>Numéro de suivi transporteur</p>
                  <p className={styles.trackingNum}>{order.trackingNumber}</p>
                </div>
              </div>
            )}

            {/* Delivery Address */}
            {order.shippingAddress && (
              <div className={styles.addressBox}>
                <Home size={16} className={styles.addressIcon} />
                <div>
                  <p className={styles.addressLabel}>Adresse de livraison</p>
                  <p className={styles.addressVal}>
                    {order.shippingAddress.name}<br />
                    {order.shippingAddress.address}<br />
                    {order.shippingAddress.postalCode} {order.shippingAddress.city}, {order.shippingAddress.country}
                  </p>
                </div>
              </div>
            )}

            {/* Items */}
            <div className={styles.itemsSection}>
              <h3 className={styles.itemsTitle}>Articles commandés</h3>
              <div className={styles.items}>
                {order.items.map((item, i) => (
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
              <div className={styles.orderTotal}>
                <span>Total de la commande</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* All mock orders quick links */}
        {!searched && (
          <div className={styles.demoOrders}>
            <p className={styles.demoTitle}>Commandes de démonstration disponibles :</p>
            <div className={styles.demoGrid}>
              {mockOrders.map(o => (
                <button
                  key={o.id}
                  className={styles.demoCard}
                  onClick={() => { setSearchId(o.id); setSearched(true); }}
                >
                  <span className={styles.demoCmdId}>{o.id}</span>
                  <span
                    className={styles.demoStatus}
                    style={{ color: orderStatusLabels[o.status]?.color, background: orderStatusLabels[o.status]?.bg }}
                  >
                    {orderStatusLabels[o.status]?.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
