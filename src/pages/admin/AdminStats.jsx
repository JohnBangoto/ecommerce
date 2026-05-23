import React, { useMemo, useEffect } from 'react';
import { useAdminStore } from '../../store/adminStore';
import { orderStatusLabels } from '../../data/orders';
import { categories } from '../../data/products';
import formatPrice from '../../utils/formatPrice';
import styles from './AdminStats.module.css';

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const STATUS_COLORS = { confirmed:'#1A7EC8', prepared:'#D4860A', shipped:'#2C9E7A', delivered:'#2D7A4F', cancelled:'#E74C3C' };
const CAT_COLORS = ['#C9A96E','#7EB8C9','#9EC97E','#C97E9E','#C9B87E','#7E9EC9','#B87EC9'];

export default function AdminStats() {
  const { getDashboardStats, orders, products, loadOrders } = useAdminStore();

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const stats = useMemo(() => getDashboardStats(), [orders, products]);

  // CA par catégorie
  const catEntries = Object.entries(stats.salesByCategory)
    .map(([id, data]) => ({ id, name: categories.find(c=>c.id===id)?.name || id, icon: categories.find(c=>c.id===id)?.icon || '', ...data }))
    .sort((a,b) => b.revenue - a.revenue);
  const maxCatRev = Math.max(...catEntries.map(e=>e.revenue), 1);

  // Évolution mensuelle
  const monthlyEntries = Object.entries(stats.monthly).sort(([a],[b])=>a.localeCompare(b));
  const maxMonthly = Math.max(...monthlyEntries.map(([,v])=>v), 1);
  const chartW = 560, chartH = 180;
  const pad = { l:55, r:20, t:20, b:35 };
  const pts = monthlyEntries.map(([,v],i) => ({
    x: pad.l + (i / Math.max(monthlyEntries.length-1,1)) * (chartW-pad.l-pad.r),
    y: pad.t + (1 - v/maxMonthly) * (chartH-pad.t-pad.b),
    v,
  }));
  const polyline = pts.map(p=>`${p.x},${p.y}`).join(' ');
  const area = pts.length>0
    ? `M ${pts[0].x},${chartH-pad.b} `+pts.map(p=>`L ${p.x},${p.y}`).join(' ')+` L ${pts[pts.length-1].x},${chartH-pad.b} Z`
    : '';

  // Top 10 produits
  const allProductSales = {};
  orders.filter(o=>o.status!=='cancelled').forEach(o=>{
    o.items.forEach(item=>{
      if(!allProductSales[item.name]) allProductSales[item.name]={ qty:0, revenue:0, image:item.image };
      allProductSales[item.name].qty += item.quantity;
      allProductSales[item.name].revenue += item.price * item.quantity;
    });
  });
  const top10 = Object.entries(allProductSales)
    .map(([name,d])=>({ name, ...d }))
    .sort((a,b)=>b.revenue-a.revenue)
    .slice(0,10);
  const maxTop = Math.max(...top10.map(p=>p.revenue), 1);

  // Donut
  const statusKeys = Object.keys(stats.byStatus);
  const total = statusKeys.reduce((s,k)=>s+stats.byStatus[k],0);
  let cumAngle = -Math.PI/2;
  const donutSegments = statusKeys.map(k=>{
    const frac = stats.byStatus[k]/(total||1);
    const angle = frac * 2 * Math.PI;
    const x1 = 60+52*Math.cos(cumAngle), y1 = 60+52*Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = 60+52*Math.cos(cumAngle), y2 = 60+52*Math.sin(cumAngle);
    return { k, x1, y1, x2, y2, large:angle>Math.PI?1:0, frac, color:STATUS_COLORS[k]||'#555' };
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Statistiques de vente</h1>
          <p className={styles.subtitle}>Analyse complète de votre performance commerciale</p>
        </div>
      </div>

      {/* KPIs rapides */}
      <div className={styles.kpiRow}>
        {[
          { label:'Chiffre d\'affaires', value: formatPrice(stats.totalRevenue), icon:'💶' },
          { label:'Commandes', value: stats.totalOrders, icon:'📦' },
          { label:'Panier moyen', value: formatPrice(stats.avgBasket), icon:'🛒' },
          { label:'Taux de livraison', value: Math.round(((stats.byStatus.delivered||0)/total)*100)+'%', icon:'✅' },
          { label:'Taux d\'annulation', value: Math.round(((stats.byStatus.cancelled||0)/total)*100)+'%', icon:'❌' },
        ].map((k,i)=>(
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
        {/* Évolution CA */}
        <div className={styles.card} style={{flex:2}}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Évolution mensuelle du CA</h2>
          </div>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className={styles.chart} preserveAspectRatio="none">
            <defs>
              <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A96E" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#C9A96E" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {[0,0.25,0.5,0.75,1].map((f,i)=>(
              <g key={i}>
                <line x1={pad.l} y1={pad.t+f*(chartH-pad.t-pad.b)} x2={chartW-pad.r} y2={pad.t+f*(chartH-pad.t-pad.b)} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                 <text x={pad.l-8} y={pad.t+f*(chartH-pad.t-pad.b)+4} fill="#555" fontSize="9" textAnchor="end">{Math.round(maxMonthly*(1-f)/1000)}k FCFA</text>
              </g>
            ))}
            {area && <path d={area} fill="url(#grad2)"/>}
            {pts.length>1 && <polyline points={polyline} fill="none" stroke="#C9A96E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
            {pts.map((p,i)=>(
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#C9A96E" stroke="#13161F" strokeWidth="2"/>
                <text x={p.x} y={chartH-pad.b+16} fill="#8B8680" fontSize="9" textAnchor="middle">
                  {monthlyEntries[i] ? MONTHS_FR[parseInt(monthlyEntries[i][0].split('-')[1])-1] : ''}
                </text>
                <text x={p.x} y={p.y-10} fill="#C9A96E" fontSize="8" textAnchor="middle">{Math.round(p.v/1000)}k</text>
              </g>
            ))}
          </svg>
        </div>

        {/* Donut statuts */}
        <div className={styles.card} style={{flex:1}}>
          <div className={styles.cardHeader}><h2 className={styles.cardTitle}>Répartition des statuts</h2></div>
          <div className={styles.donutWrap}>
            <svg viewBox="0 0 120 120" width="160" height="160">
              {donutSegments.map((seg,i)=>(
                seg.frac>0.001 && (
                  <path key={i}
                    d={`M 60,60 L ${seg.x1},${seg.y1} A 52,52 0 ${seg.large} 1 ${seg.x2},${seg.y2} Z`}
                    fill={seg.color} opacity="0.9"
                  />
                )
              ))}
              <circle cx="60" cy="60" r="32" fill="#1A1D27"/>
              <text x="60" y="57" textAnchor="middle" fill="#F0EDE8" fontSize="13" fontWeight="700">{total}</text>
              <text x="60" y="70" textAnchor="middle" fill="#8B8680" fontSize="8">commandes</text>
            </svg>
            <div className={styles.donutLegend}>
              {statusKeys.map(k=>(
                <div key={k} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{background:STATUS_COLORS[k]||'#555'}}/>
                  <span className={styles.legendLabel}>{orderStatusLabels[k]?.label||k}</span>
                  <span className={styles.legendVal}>{stats.byStatus[k]}</span>
                  <span className={styles.legendPct}>({Math.round(stats.byStatus[k]/total*100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.row}>
        {/* CA par catégorie */}
        <div className={styles.card} style={{flex:1}}>
          <div className={styles.cardHeader}><h2 className={styles.cardTitle}>CA par catégorie</h2></div>
          <div className={styles.catBars}>
            {catEntries.map((cat,i)=>(
              <div key={cat.id} className={styles.catBar}>
                <div className={styles.catLabel}>
                  <span>{cat.icon} {cat.name}</span>
                  <span className={styles.catRev}>{formatPrice(cat.revenue)}</span>
                </div>
                <div className={styles.catTrack}>
                  <div className={styles.catFill} style={{ width:`${(cat.revenue/maxCatRev)*100}%`, background: CAT_COLORS[i%CAT_COLORS.length] }}/>
                </div>
                <span className={styles.catQty}>{cat.qty} ventes</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 10 produits */}
        <div className={styles.card} style={{flex:1}}>
          <div className={styles.cardHeader}><h2 className={styles.cardTitle}>Top 10 produits</h2></div>
          <div className={styles.top10}>
            {top10.map((p,i)=>(
              <div key={i} className={styles.top10Row}>
                <span className={styles.top10Rank} style={{color: i<3?'#C9A96E':'#8B8680'}}>#{i+1}</span>
                <img src={p.image} alt={p.name} className={styles.top10Img}/>
                <div className={styles.top10Info}>
                  <p className={styles.top10Name}>{p.name}</p>
                  <div className={styles.top10Bar}>
                    <div className={styles.top10BarFill} style={{ width:`${(p.revenue/maxTop)*100}%` }}/>
                  </div>
                </div>
                <div className={styles.top10Stats}>
                  <span className={styles.top10Rev}>{formatPrice(p.revenue)}</span>
                  <span className={styles.top10Qty}>{p.qty} ventes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
