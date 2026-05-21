import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore';
import { orderStatusLabels } from '../../data/orders';
import { categories } from '../../data/products';
import formatPrice from '../../utils/formatPrice';
import styles from './Dashboard.module.css';

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export default function Dashboard() {
  const { getDashboardStats, orders, products, resetToDemo } = useAdminStore();
  const stats = useMemo(() => getDashboardStats(), [orders, products]);

  // Dernières commandes
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  // Graphique mensuel
  const monthlyEntries = Object.entries(stats.monthly).sort(([a],[b]) => a.localeCompare(b));
  const maxMonthly = Math.max(...monthlyEntries.map(([,v]) => v), 1);
  const chartW = 520, chartH = 160;
  const pad = { l: 50, r: 20, t: 20, b: 30 };
  const pts = monthlyEntries.map(([,v], i) => {
    const x = pad.l + (i / Math.max(monthlyEntries.length - 1, 1)) * (chartW - pad.l - pad.r);
    const y = pad.t + (1 - v / maxMonthly) * (chartH - pad.t - pad.b);
    return [x, y];
  });
  const polyline = pts.map(([x,y]) => `${x},${y}`).join(' ');
  const area = pts.length > 0
    ? `M ${pts[0][0]},${chartH - pad.b} ` + pts.map(([x,y]) => `L ${x},${y}`).join(' ') + ` L ${pts[pts.length-1][0]},${chartH - pad.b} Z`
    : '';

  // Donut commandes
  const statusKeys = Object.keys(stats.byStatus);
  const statusColors = { confirmed:'#1A7EC8', prepared:'#D4860A', shipped:'#2C9E7A', delivered:'#2D7A4F', cancelled:'#C0392B' };
  const total = statusKeys.reduce((s,k) => s + stats.byStatus[k], 0);
  let cumAngle = -Math.PI / 2;
  const donutSegments = statusKeys.map(k => {
    const fraction = stats.byStatus[k] / (total || 1);
    const angle = fraction * 2 * Math.PI;
    const x1 = 50 + 38 * Math.cos(cumAngle);
    const y1 = 50 + 38 * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = 50 + 38 * Math.cos(cumAngle);
    const y2 = 50 + 38 * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { k, x1, y1, x2, y2, large, fraction, color: statusColors[k] || '#555' };
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tableau de bord</h1>
          <p className={styles.subtitle}>Vue d'ensemble de votre activité</p>
        </div>
        <div style={{display:'flex',gap:'0.75rem',alignItems:'center'}}>
          <div className={styles.headerDate}>
            {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </div>
          <button
            onClick={() => { if(window.confirm('Réinitialiser toutes les données démo ?')) resetToDemo(); }}
            style={{padding:'0.4rem 0.9rem',fontSize:'0.75rem',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'8px',color:'#8B8680',cursor:'pointer'}}
          >↺ Réinitialiser démo</button>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpi} ${styles.kpiGold}`}>
          <div className={styles.kpiIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className={styles.kpiBody}>
            <p className={styles.kpiLabel}>Chiffre d'affaires</p>
            <p className={styles.kpiValue}>{formatPrice(stats.totalRevenue)}</p>
            <p className={styles.kpiSub}>{stats.totalOrders} commandes au total</p>
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div className={styles.kpiBody}>
            <p className={styles.kpiLabel}>Commandes</p>
            <p className={styles.kpiValue}>{stats.totalOrders}</p>
            <p className={styles.kpiSub}>Panier moyen {formatPrice(stats.avgBasket)}</p>
          </div>
        </div>
        <div className={`${styles.kpi} ${stats.outOfStock > 0 ? styles.kpiDanger : ''}`}>
          <div className={styles.kpiIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <div className={styles.kpiBody}>
            <p className={styles.kpiLabel}>Produits</p>
            <p className={styles.kpiValue}>{products.length}</p>
            <p className={styles.kpiSub}>{stats.outOfStock} rupture · {stats.lowStock} stock faible</p>
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className={styles.kpiBody}>
            <p className={styles.kpiLabel}>Clients uniques</p>
            <p className={styles.kpiValue}>{new Set(orders.map(o => o.email)).size}</p>
            <p className={styles.kpiSub}>Sur {orders.length} commandes</p>
          </div>
        </div>
      </div>

      <div className={styles.row}>
        {/* Graphique évolution CA */}
        <div className={styles.card} style={{flex:2}}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Évolution du chiffre d'affaires</h2>
          </div>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className={styles.chart} preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A96E" stopOpacity="0.35"/>
                <stop offset="100%" stopColor="#C9A96E" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0,0.25,0.5,0.75,1].map((f,i) => (
              <g key={i}>
                <line x1={pad.l} y1={pad.t + f*(chartH-pad.t-pad.b)} x2={chartW-pad.r} y2={pad.t + f*(chartH-pad.t-pad.b)} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                <text x={pad.l-8} y={pad.t + f*(chartH-pad.t-pad.b)+4} fill="#555" fontSize="9" textAnchor="end">
                  {Math.round(maxMonthly*(1-f)/1000)}k
                </text>
              </g>
            ))}
            {/* Area */}
            {area && <path d={area} fill="url(#areaGrad)"/>}
            {/* Line */}
            {pts.length > 1 && <polyline points={polyline} fill="none" stroke="#C9A96E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
            {/* Points + labels */}
            {pts.map(([x,y],i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="4" fill="#C9A96E" stroke="#13161F" strokeWidth="2"/>
                <text x={x} y={chartH-pad.b+14} fill="#8B8680" fontSize="9" textAnchor="middle">
                  {monthlyEntries[i] ? MONTHS_FR[parseInt(monthlyEntries[i][0].split('-')[1])-1] : ''}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Donut statuts */}
        <div className={styles.card} style={{flex:1}}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Statuts commandes</h2>
          </div>
          <div className={styles.donutWrap}>
            <svg viewBox="0 0 100 100" width="140" height="140">
              {donutSegments.map((seg, i) => (
                seg.fraction > 0.001 && (
                  <path key={i}
                    d={`M 50,50 L ${seg.x1},${seg.y1} A 38,38 0 ${seg.large} 1 ${seg.x2},${seg.y2} Z`}
                    fill={seg.color} opacity="0.9"
                  />
                )
              ))}
              <circle cx="50" cy="50" r="24" fill="#1A1D27"/>
              <text x="50" y="47" textAnchor="middle" fill="#F0EDE8" fontSize="10" fontWeight="700">{total}</text>
              <text x="50" y="58" textAnchor="middle" fill="#8B8680" fontSize="7">commandes</text>
            </svg>
            <div className={styles.donutLegend}>
              {statusKeys.map(k => (
                <div key={k} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{background: statusColors[k] || '#555'}}/>
                  <span className={styles.legendLabel}>{orderStatusLabels[k]?.label || k}</span>
                  <span className={styles.legendCount}>{stats.byStatus[k]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.row}>
        {/* Commandes récentes */}
        <div className={styles.card} style={{flex:3}}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Commandes récentes</h2>
            <Link to="/admin/commandes" className={styles.seeAll}>Voir tout →</Link>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th><th>Client</th><th>Date</th><th>Montant</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => {
                const sl = orderStatusLabels[o.status];
                return (
                  <tr key={o.id}>
                    <td className={styles.orderId}>{o.id}</td>
                    <td>{o.customer}</td>
                    <td className={styles.muted}>{new Date(o.date).toLocaleDateString('fr-FR')}</td>
                    <td className={styles.amount}>{formatPrice(o.total)}</td>
                    <td>
                      <span className={styles.badge} style={{ color: sl?.color, background: sl?.bg }}>
                        {sl?.label || o.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Top produits */}
        <div className={styles.card} style={{flex:2}}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Top produits</h2>
            <Link to="/admin/stats" className={styles.seeAll}>Voir stats →</Link>
          </div>
          <div className={styles.topProducts}>
            {stats.topProducts.map((p, i) => (
              <div key={i} className={styles.topProduct}>
                <span className={styles.topRank}>#{i+1}</span>
                <img src={p.image} alt={p.name} className={styles.topImg}/>
                <div className={styles.topInfo}>
                  <p className={styles.topName}>{p.name}</p>
                  <p className={styles.topRevenue}>{formatPrice(p.revenue)}</p>
                </div>
                <span className={styles.topQty}>{p.qty} ventes</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
