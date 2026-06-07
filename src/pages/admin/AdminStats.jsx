import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../utils/api';
import { orderStatusLabels } from '../../data/orders';
import formatPrice from '../../utils/formatPrice';
import styles from './AdminStats.module.css';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const STATUS_COLORS = { confirmed: '#1A7EC8', prepared: '#D4860A', shipped: '#2C9E7A', delivered: '#2D7A4F', cancelled: '#E74C3C' };
const CAT_COLORS = ['#C9A96E', '#7EB8C9', '#9EC97E', '#C97E9E', '#C9B87E', '#7E9EC9', '#B87EC9'];

const formatDateLocal = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [preset, setPreset] = useState('30days'); // 'today', '7days', '30days', '90days', 'custom'
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [granularity, setGranularity] = useState('week'); // 'day', 'week', 'month'

  // Initialize dates and preset
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29); // Default 30 days
    setFrom(formatDateLocal(start));
    setTo(formatDateLocal(end));
  }, []);

  // Fetch stats data on filters change
  const fetchStats = async () => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(
        `/admin/stats?from=${from}&to=${to}&granularity=${granularity}`
      );
      setStats(response);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
      setError(err.message || 'Impossible de calculer les statistiques.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [from, to, granularity]);

  // Handle preset clicks
  const handlePresetChange = (newPreset) => {
    setPreset(newPreset);
    if (newPreset === 'custom') return;

    const end = new Date();
    const start = new Date();

    if (newPreset === 'today') {
      setGranularity('day');
    } else if (newPreset === '7days') {
      start.setDate(end.getDate() - 6);
      setGranularity('day');
    } else if (newPreset === '30days') {
      start.setDate(end.getDate() - 29);
      setGranularity('week');
    } else if (newPreset === '90days') {
      start.setDate(end.getDate() - 89);
      setGranularity('month');
    }

    setFrom(formatDateLocal(start));
    setTo(formatDateLocal(end));
  };

  // Helper to format periods
  const formatPeriodLabel = (period, gran) => {
    if (!period) return '';
    if (gran === 'day') {
      const parts = period.split('-');
      if (parts.length < 3) return period;
      const mm = parts[1];
      const dd = parts[2];
      const monthIdx = parseInt(mm) - 1;
      return `${dd} ${MONTHS_FR[monthIdx] || mm}`;
    }
    if (gran === 'week') {
      return period.split('-')[1] || period;
    }
    const parts = period.split('-');
    const mm = parts[1] || period;
    const monthIdx = parseInt(mm) - 1;
    return MONTHS_FR[monthIdx] || period;
  };

  // Compute stats items
  const derivedData = useMemo(() => {
    if (!stats) return { catEntries: [], top10: [], donutSegments: [], total: 0, statusKeys: [], chartPoints: [], polyline: '', area: '', maxTimeSeries: 1 };

    // 1. Sales by category
    const catEntries = Object.entries(stats.salesByCategory || {})
      .map(([id, data]) => {
        const cat = categories.find(c => c.id === id || c.slug === id);
        return {
          id,
          name: cat?.name || id,
          icon: cat?.icon || '📦',
          revenue: data.revenue,
          qty: data.qty
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
    const maxCatRev = Math.max(...catEntries.map(e => e.revenue), 1);

    // 2. Top 10 products
    const top10 = stats.topProducts || [];
    const maxTop = Math.max(...top10.map(p => p.revenue), 1);

    // 3. Donut segments
    const statusKeys = Object.keys(stats.byStatus || {});
    const total = statusKeys.reduce((s, k) => s + stats.byStatus[k], 0);
    let cumAngle = -Math.PI / 2;
    const donutSegments = statusKeys.map(k => {
      const frac = stats.byStatus[k] / (total || 1);
      const angle = frac * 2 * Math.PI;
      const x1 = 60 + 52 * Math.cos(cumAngle);
      const y1 = 60 + 52 * Math.sin(cumAngle);
      cumAngle += angle;
      const x2 = 60 + 52 * Math.cos(cumAngle);
      const y2 = 60 + 52 * Math.sin(cumAngle);
      return { k, x1, y1, x2, y2, large: angle > Math.PI ? 1 : 0, frac, color: STATUS_COLORS[k] || '#555' };
    });

    // 4. SVG timeSeries chart
    const timeSeries = stats.timeSeries || [];
    const maxTimeSeries = Math.max(...timeSeries.map(p => p.revenue), 1);
    const chartW = 560, chartH = 180;
    const pad = { l: 55, r: 20, t: 20, b: 35 };
    
    const chartPoints = timeSeries.map((p, i) => ({
      x: pad.l + (i / Math.max(timeSeries.length - 1, 1)) * (chartW - pad.l - pad.r),
      y: pad.t + (1 - p.revenue / maxTimeSeries) * (chartH - pad.t - pad.b),
      v: p.revenue,
      period: p.period
    }));

    const polyline = chartPoints.map(p => `${p.x},${p.y}`).join(' ');
    const area = chartPoints.length > 0
      ? `M ${chartPoints[0].x},${chartH - pad.b} ` + chartPoints.map(p => `L ${p.x},${p.y}`).join(' ') + ` L ${chartPoints[chartPoints.length - 1].x},${chartH - pad.b} Z`
      : '';

    return { catEntries, maxCatRev, top10, maxTop, donutSegments, total, statusKeys, chartPoints, polyline, area, maxTimeSeries };
  }, [stats]);

  // Dynamic status list labels
  const totalOrdersCount = derivedData.total || 1;
  const deliveredCount = stats?.byStatus?.delivered || 0;
  const cancelledCount = stats?.byStatus?.cancelled || 0;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Statistiques de vente</h1>
          <p className={styles.subtitle}>Analyse complète de votre performance commerciale</p>
        </div>
      </div>

      {/* Date & Preset Filters */}
      <div className={styles.filtersContainer}>
        <div className={styles.presetButtons}>
          {[
            ['today', "Aujourd'hui"],
            ['7days', '7 Jours'],
            ['30days', '30 Jours'],
            ['90days', '90 Jours'],
            ['custom', 'Personnalisé']
          ].map(([p, label]) => (
            <button
              key={p}
              className={`${styles.btnPreset} ${preset === p ? styles.activePreset : ''}`}
              onClick={() => handlePresetChange(p)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.filterInputs}>
          {preset === 'custom' && (
            <div className={styles.dateInputs}>
              <div className={styles.inputGroup}>
                <label>Du</label>
                <input
                  type="date"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className={styles.dateInput}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Au</label>
                <input
                  type="date"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className={styles.dateInput}
                />
              </div>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label>Granularité</label>
            <select
              value={granularity}
              onChange={e => setGranularity(e.target.value)}
              className={styles.granularitySelect}
            >
              <option value="day">Jour par Jour</option>
              <option value="week">Par Semaine</option>
              <option value="month">Par Mois</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner}></div>
          <p>Calcul des statistiques en cours...</p>
        </div>
      ) : error ? (
        <div className={styles.errorWrap}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3>Erreur de calcul</h3>
          <p>{error}</p>
          <button onClick={fetchStats} className={styles.btnRetry}>Réessayer</button>
        </div>
      ) : stats ? (
        <>
          {/* KPIs Row */}
          <div className={styles.kpiRow}>
            {[
              { label: "Chiffre d'affaires", value: formatPrice(stats.totalRevenue), icon: '💶' },
              { label: 'Commandes', value: stats.totalOrders, icon: '📦' },
              { label: 'Panier moyen', value: formatPrice(stats.avgBasket), icon: '🛒' },
              { label: 'Taux de livraison', value: Math.round((deliveredCount / totalOrdersCount) * 100) + '%', icon: '✅' },
              { label: "Taux d'annulation", value: Math.round((cancelledCount / totalOrdersCount) * 100) + '%', icon: '❌' },
            ].map((k, i) => (
              <div key={i} className={styles.kpi}>
                <span className={styles.kpiEmoji}>{k.icon}</span>
                <div>
                  <p className={styles.kpiLabel}>{k.label}</p>
                  <p className={styles.kpiValue}>{k.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.row}>
            {/* SVG Chart curve */}
            <div className={styles.card} style={{ flex: 2 }}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Évolution temporelle du CA ({granularity === 'day' ? 'par jour' : granularity === 'week' ? 'par semaine' : 'par mois'})</h2>
              </div>
              {derivedData.chartPoints.length > 0 ? (
                <svg viewBox="0 0 560 180" className={styles.chart} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C9A96E" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="#C9A96E" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
                    <g key={i}>
                      <line x1={55} y1={20 + f * 125} x2={540} y2={20 + f * 125} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                      <text x={47} y={20 + f * 125 + 4} fill="#555" fontSize="9" textAnchor="end">
                        {Math.round(derivedData.maxTimeSeries * (1 - f) / 1000)}k FCFA
                      </text>
                    </g>
                  ))}
                  {derivedData.area && <path d={derivedData.area} fill="url(#grad2)"/>}
                  {derivedData.chartPoints.length > 1 && <polyline points={derivedData.polyline} fill="none" stroke="#C9A96E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
                  {derivedData.chartPoints.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r={4} fill="#C9A96E" stroke="#13161F" strokeWidth="2"/>
                      <text x={p.x} y={161} fill="#8B8680" fontSize="8" textAnchor="middle">
                        {formatPeriodLabel(p.period, granularity)}
                      </text>
                      {derivedData.chartPoints.length <= 15 && (
                        <text x={p.x} y={p.y - 10} fill="#C9A96E" fontSize="8" textAnchor="middle">
                          {Math.round(p.v / 1000)}k
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#8B8680', fontSize: '0.85rem' }}>
                  Aucune vente enregistrée sur cette période.
                </div>
              )}
            </div>

            {/* Donut statuts */}
            <div className={styles.card} style={{ flex: 1 }}>
              <div className={styles.cardHeader}><h2 className={styles.cardTitle}>Répartition des statuts</h2></div>
              <div className={styles.donutWrap}>
                <svg viewBox="0 0 120 120" width="160" height="160">
                  {derivedData.donutSegments.map((seg, i) => (
                    seg.frac > 0.001 && (
                      <path key={i}
                        d={`M 60,60 L ${seg.x1},${seg.y1} A 52,52 0 ${seg.large} 1 ${seg.x2},${seg.y2} Z`}
                        fill={seg.color} opacity="0.9"
                      />
                    )
                  ))}
                  <circle cx="60" cy="60" r="32" fill="#1A1D27"/>
                  <text x="60" y="57" textAnchor="middle" fill="#F0EDE8" fontSize="13" fontWeight="700">{derivedData.total}</text>
                  <text x="60" y="70" textAnchor="middle" fill="#8B8680" fontSize="8">commandes</text>
                </svg>
                <div className={styles.donutLegend}>
                  {derivedData.statusKeys.map(k => (
                    <div key={k} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: STATUS_COLORS[k] || '#555' }}/>
                      <span className={styles.legendLabel}>{orderStatusLabels[k]?.label || k}</span>
                      <span className={styles.legendVal}>{stats.byStatus[k]}</span>
                      <span className={styles.legendPct}>({Math.round(stats.byStatus[k] / totalOrdersCount * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.row}>
            {/* Sales by Category */}
            <div className={styles.card} style={{ flex: 1 }}>
              <div className={styles.cardHeader}><h2 className={styles.cardTitle}>CA par catégorie</h2></div>
              <div className={styles.catBars}>
                {derivedData.catEntries.map((cat, i) => (
                  <div key={cat.id} className={styles.catBar}>
                    <div className={styles.catLabel}>
                      <span>{cat.icon} {cat.name}</span>
                      <span className={styles.catRev}>{formatPrice(cat.revenue)}</span>
                    </div>
                    <div className={styles.catTrack}>
                      <div className={styles.catFill} style={{ width: `${(cat.revenue / derivedData.maxCatRev) * 100}%`, background: CAT_COLORS[i % CAT_COLORS.length] }}/>
                    </div>
                    <span className={styles.catQty}>{cat.qty} ventes</span>
                  </div>
                ))}
                {derivedData.catEntries.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#8B8680', fontSize: '0.85rem' }}>
                    Aucune vente par catégorie.
                  </div>
                )}
              </div>
            </div>

            {/* Top 10 Products */}
            <div className={styles.card} style={{ flex: 1 }}>
              <div className={styles.cardHeader}><h2 className={styles.cardTitle}>Top 10 produits</h2></div>
              <div className={styles.top10}>
                {derivedData.top10.map((p, i) => (
                  <div key={i} className={styles.top10Row}>
                    <span className={styles.top10Rank} style={{ color: i < 3 ? '#C9A96E' : '#8B8680' }}>#{i + 1}</span>
                    {p.image && <img src={p.image} alt={p.name} className={styles.top10Img}/>}
                    <div className={styles.top10Info}>
                      <p className={styles.top10Name}>{p.name}</p>
                      <div className={styles.top10Bar}>
                        <div className={styles.top10BarFill} style={{ width: `${(p.revenue / derivedData.maxTop) * 100}%` }}/>
                      </div>
                    </div>
                    <div className={styles.top10Stats}>
                      <span className={styles.top10Rev}>{formatPrice(p.revenue)}</span>
                      <span className={styles.top10Qty}>{p.qty} ventes</span>
                    </div>
                  </div>
                ))}
                {derivedData.top10.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#8B8680', fontSize: '0.85rem' }}>
                    Aucune vente enregistrée.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
