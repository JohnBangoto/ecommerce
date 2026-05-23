import { useEffect, useState } from 'react';
import { orderStatusLabels } from '../../data/orders';
import { useAdminStore } from '../../store/adminStore';
import formatPrice from '../../utils/formatPrice';
import styles from './AdminCommandes.module.css';

const STATUS_OPTIONS = ['confirmed','prepared','shipped','delivered','cancelled'];

export default function AdminCommandes() {
  const { orders, updateOrderStatus, loadOrders } = useAdminStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = orders.filter(o => {
    const matchSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      (o.email||'').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  }).sort((a,b) => new Date(b.date) - new Date(a.date));

  const counts = STATUS_OPTIONS.reduce((acc,s) => {
    acc[s] = orders.filter(o=>o.status===s).length; return acc;
  }, {});

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestion des commandes</h1>
          <p className={styles.subtitle}>{orders.length} commandes au total</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${statusFilter==='all' ? styles.tabActive : ''}`} onClick={()=>setStatusFilter('all')}>
          Toutes <span className={styles.tabCount}>{orders.length}</span>
        </button>
        {STATUS_OPTIONS.map(s => {
          const sl = orderStatusLabels[s];
          return (
            <button key={s} className={`${styles.tab} ${statusFilter===s ? styles.tabActive : ''}`} onClick={()=>setStatusFilter(s)}>
              {sl?.label} <span className={styles.tabCount}>{counts[s]||0}</span>
            </button>
          );
        })}
      </div>

      {/* Recherche */}
      <div className={styles.searchWrap}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input className={styles.search} placeholder="Rechercher par ID, client, email…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Tableau */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Commande</th><th>Client</th><th>Date</th><th>Articles</th><th>Total</th><th>Paiement</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const sl = orderStatusLabels[o.status];
              return (
                <tr key={o.id}>
                  <td><span className={styles.orderId}>{o.id}</span></td>
                  <td>
                    <div className={styles.customerCell}>
                      <span className={styles.customerName}>{o.customer}</span>
                      <span className={styles.customerEmail}>{o.email}</span>
                    </div>
                  </td>
                  <td className={styles.muted}>{new Date(o.date).toLocaleDateString('fr-FR')}</td>
                  <td className={styles.muted}>{o.items.reduce((s,i)=>s+i.quantity,0)} article{o.items.reduce((s,i)=>s+i.quantity,0)>1?'s':''}</td>
                  <td><span className={styles.amount}>{formatPrice(o.total)}</span></td>
                  <td className={styles.muted}>{o.paymentMethod||'—'}</td>
                  <td>
                    <select
                      className={styles.statusSelect}
                      value={o.status}
                      onChange={e=>updateOrderStatus(o.id, e.target.value)}
                      style={{ color: sl?.color, borderColor: sl?.color+'44' }}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{orderStatusLabels[s]?.label || s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className={styles.btnDetail} onClick={()=>setSelectedOrder(o)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      Détail
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className={styles.empty}>Aucune commande trouvée</div>}
      </div>

      {/* Modal Détail */}
      {selectedOrder && (
        <div className={styles.overlay} onClick={e=>e.target===e.currentTarget&&setSelectedOrder(null)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>{selectedOrder.id}</h2>
                <p className={styles.modalSub}>{selectedOrder.customer} · {new Date(selectedOrder.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}</p>
              </div>
              <button className={styles.closeBtn} onClick={()=>setSelectedOrder(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              {/* Articles */}
              <h3 className={styles.sectionTitle}>Articles commandés</h3>
              <div className={styles.orderItems}>
                {selectedOrder.items.map((item,i) => (
                  <div key={i} className={styles.orderItem}>
                    <img src={item.image} alt={item.name} className={styles.itemImg}/>
                    <div className={styles.itemInfo}>
                      <p className={styles.itemName}>{item.name}</p>
                      <p className={styles.itemQty}>Qté : {item.quantity}</p>
                    </div>
                    <span className={styles.itemPrice}>{formatPrice(item.price*item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className={styles.orderTotals}>
                <div className={styles.totalRow}><span>Sous-total</span><span>{formatPrice(selectedOrder.subtotal)}</span></div>
                <div className={styles.totalRow}><span>Livraison</span><span>{selectedOrder.shipping===0?'Gratuite':formatPrice(selectedOrder.shipping)}</span></div>
                <div className={`${styles.totalRow} ${styles.totalFinal}`}><span>Total</span><span>{formatPrice(selectedOrder.total)}</span></div>
              </div>

              {/* Adresse */}
              <h3 className={styles.sectionTitle}>Adresse de livraison</h3>
              <div className={styles.addressBox}>
                <p>{selectedOrder.shippingAddress.name}</p>
                <p>{selectedOrder.shippingAddress.address}</p>
                <p>{selectedOrder.shippingAddress.postalCode} {selectedOrder.shippingAddress.city}</p>
                <p>{selectedOrder.shippingAddress.country}</p>
              </div>

              {/* Timeline */}
              <h3 className={styles.sectionTitle}>Suivi de commande</h3>
              <div className={styles.timeline}>
                {selectedOrder.timeline.map((step,i) => (
                  <div key={i} className={`${styles.timelineStep} ${step.done ? styles.stepDone : ''}`}>
                    <div className={styles.stepDot}/>
                    {i < selectedOrder.timeline.length-1 && <div className={styles.stepLine}/>}
                    <div className={styles.stepContent}>
                      <p className={styles.stepLabel}>{step.label}</p>
                      {step.date && <p className={styles.stepDate}>{new Date(step.date).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Statut */}
              <h3 className={styles.sectionTitle}>Changer le statut</h3>
              <div className={styles.statusRow}>
                {STATUS_OPTIONS.map(s => {
                  const sl = orderStatusLabels[s];
                  return (
                    <button
                      key={s}
                      className={`${styles.statusBtn} ${selectedOrder.status===s ? styles.statusBtnActive : ''}`}
                      style={selectedOrder.status===s ? { background: sl?.bg, color: sl?.color, borderColor: sl?.color } : {}}
                      onClick={()=>{ updateOrderStatus(selectedOrder.id,s); setSelectedOrder(o=>({...o,status:s})); }}
                    >
                      {sl?.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
