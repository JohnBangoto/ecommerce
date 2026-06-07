import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { orderStatusLabels } from '../../data/orders';
import formatPrice from '../../utils/formatPrice';
import styles from './Dashboard.module.css';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, alertsData] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/stock/alerts'),
      ]);
      setStats(statsData);
      setAlerts(alertsData.alerts || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Impossible de charger les données du tableau de bord.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute chart points
  const chartData = useMemo(() => {
    if (!stats?.monthly) return { pts: [], polyline: '', area: '', maxMonthly: 1, monthlyEntries: [] };

    const monthlyEntries = Object.entries(stats.monthly).sort(([a], [b]) => a.localeCompare(b));
    const maxMonthly = Math.max(...monthlyEntries.map(([, v]) => v), 1);
    const chartW = 520, chartH = 160;
    const pad = { l: 50, r: 20, t: 20, b: 30 };
    
    const pts = monthlyEntries.map(([, v], i) => {
      const x = pad.l + (i / Math.max(monthlyEntries.length - 1, 1)) * (chartW - pad.l - pad.r);
      const y = pad.t + (1 - v / maxMonthly) * (chartH - pad.t - pad.b);
      return [x, y];
    });

    const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ');
    const area = pts.length > 0
      ? `M ${pts[0][0]},${chartH - pad.b} ` + pts.map(([x, y]) => `L ${x},${y}`).join(' ') + ` L ${pts[pts.length - 1][0]},${chartH - pad.b} Z`
      : '';

    return { pts, polyline, area, maxMonthly, monthlyEntries };
  }, [stats]);

  // Compute donut segments
  const donutData = useMemo(() => {
    if (!stats?.byStatus) return { donutSegments: [], total: 0, statusKeys: [] };

    const statusKeys = Object.keys(stats.byStatus);
    const statusColors = { confirmed: '#1A7EC8', prepared: '#D4860A', shipped: '#2C9E7A', delivered: '#2D7A4F', cancelled: '#C0392B' };
    const total = statusKeys.reduce((s, k) => s + stats.byStatus[k], 0);
    
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

    return { donutSegments, total, statusKeys };
  }, [stats]);

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner}></div>
        <p>Chargement des statistiques...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorWrap}>
        <div className={styles.errorIcon}>⚠️</div>
        <h3>Une erreur est survenue</h3>
        <p>{error}</p>
        <button onClick={fetchData} className={styles.btnRetry}>Réessayer</button>
      </div>
    );
  }

  const recentOrders = stats.recentOrders || [];
  const topProducts = stats.topProducts || [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tableau de bord</h1>
          <p className={styles.subtitle}>Vue d'ensemble de votre activité</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className={styles.headerDate}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <button
            onClick={fetchData}
            className={styles.btnRefresh}
          >
            ↻ Actualiser
          </button>
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
            <p className={styles.kpiLabel}>Commandes du jour</p>
            <p className={styles.kpiValue}>{stats.todayOrders}</p>
            <p className={styles.kpiSub}>Panier moyen {formatPrice(stats.avgBasket)}</p>
          </div>
        </div>

        <div className={styles.kpi}>
          <div className={styles.kpiIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className={styles.kpiBody}>
            <p className={styles.kpiLabel}>Commandes en attente</p>
            <p className={styles.kpiValue}>{stats.pendingOrders}</p>
            <p className={styles.kpiSub}>À préparer ou expédier</p>
          </div>
        </div>

        <div className={`${styles.kpi} ${stats.unreadMessages > 0 ? styles.kpiDanger : ''}`}>
          <div className={styles.kpiIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <div className={styles.kpiBody}>
            <p className={styles.kpiLabel}>Messages non lus</p>
            <p className={styles.kpiValue}>{stats.unreadMessages}</p>
            <p className={styles.kpiSub}>Support & questions</p>
          </div>
        </div>
      </div>

      <div className={styles.row}>
        {/* Graphique évolution CA */}
        <div className={styles.card} style={{ flex: 2 }}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Évolution du chiffre d'affaires</h2>
          </div>
          <svg viewBox="0 0 520 160" className={styles.chart} preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A96E" stopOpacity="0.35"/>
                <stop offset="100%" stopColor="#C9A96E" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
              <g key={i}>
                <line x1={50} y1={20 + f * 110} x2={500} y2={20 + f * 110} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                <text x={42} y={20 + f * 110 + 4} fill="#555" fontSize="9" textAnchor="end">
                  {Math.round(chartData.maxMonthly * (1 - f) / 1000)}k
                </text>
              </g>
            ))}
            {/* Area */}
            {chartData.area && <path d={chartData.area} fill="url(#areaGrad)"/>}
            {/* Line */}
            {chartData.pts.length > 1 && <polyline points={chartData.polyline} fill="none" stroke="#C9A96E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
            {/* Points + labels */}
            {chartData.pts.map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="4" fill="#C9A96E" stroke="#13161F" strokeWidth="2"/>
                <text x={x} y={144} fill="#8B8680" fontSize="9" textAnchor="middle">
                  {chartData.monthlyEntries[i] ? MONTHS_FR[parseInt(chartData.monthlyEntries[i][0].split('-')[1]) - 1] : ''}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Donut statuts */}
        <div className={styles.card} style={{ flex: 1 }}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Statuts commandes</h2>
          </div>
          <div className={styles.donutWrap}>
            <svg viewBox="0 0 100 100" width="140" height="140">
              {donutData.donutSegments.map((seg, i) => (
                seg.fraction > 0.001 && (
                  <path key={i}
                    d={`M 50,50 L ${seg.x1},${seg.y1} A 38,38 0 ${seg.large} 1 ${seg.x2},${seg.y2} Z`}
                    fill={seg.color} opacity="0.9"
                  />
                )
              ))}
              <circle cx="50" cy="50" r="24" fill="#1A1D27"/>
              <text x="50" y="47" textAnchor="middle" fill="#F0EDE8" fontSize="10" fontWeight="700">{donutData.total}</text>
              <text x="50" y="58" textAnchor="middle" fill="#8B8680" fontSize="7">commandes</text>
            </svg>
            <div className={styles.donutLegend}>
              {donutData.statusKeys.map(k => (
                <div key={k} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: orderStatusLabels[k]?.color || '#555' }}/>
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
        <div className={styles.card} style={{ flex: 3 }}>
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
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#8B8680' }}>
                    Aucune commande récente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Produits en alerte stock */}
        <div className={styles.card} style={{ flex: 2 }}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Alertes stock ({alerts.length})</h2>
            <Link to="/admin/stock" className={styles.seeAll}>Gérer le stock →</Link>
          </div>
          <div className={styles.topProducts}>
            {alerts.slice(0, 5).map((p, i) => (
              <div key={p.id} className={styles.topProduct}>
                <span className={styles.topRank} style={{ color: p.stock === 0 ? '#E74C3C' : '#D4860A' }}>
                  {p.stock === 0 ? '🚫' : '⚠️'}
                </span>
                <img src={p.image} alt={p.name} className={styles.topImg}/>
                <div className={styles.topInfo}>
                  <p className={styles.topName}>{p.name}</p>
                  <p className={styles.topRevenue} style={{ color: p.stock === 0 ? '#E74C3C' : '#D4860A' }}>
                    {p.stock === 0 ? 'Rupture' : `${p.stock} unités restantes`}
                  </p>
                </div>
                <span className={styles.topQty}>Seuil: {p.lowStockThreshold}</span>
              </div>
            ))}
            {alerts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#8B8680', fontSize: '0.85rem' }}>
                ✓ Aucun produit en alerte stock
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
