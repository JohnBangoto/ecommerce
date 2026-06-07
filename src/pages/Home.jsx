import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Truck, RotateCcw, Shield, Headphones, Star } from 'lucide-react';
import { useProductStore } from '../store/productStore';
import ProductCard from '../components/product/ProductCard';
import styles from './Home.module.css';

// Skeleton card
function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--color-surface, #f3f4f6)',
      borderRadius: 12,
      height: 320,
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

export default function Home() {
  const navigate = useNavigate();

  const {
    fetchProducts,
    fetchCategories,
    categories,
    productsLoading,
  } = useProductStore();

  const [featuredProducts, setFeaturedProducts] = React.useState([]);
  const [newProducts, setNewProducts] = React.useState([]);

  useEffect(() => {
    fetchCategories();

    // Produits vedettes
    fetchProducts({ isFeatured: 'true', limit: 4, page: 1 }).then(data => {
      setFeaturedProducts(data.products || []);
    });

    // Nouveautés
    fetchProducts({ isNew: 'true', limit: 4, page: 1 }).then(data => {
      setNewProducts(data.products || []);
    });
  }, []);

  const trustItems = [
    { icon: <Truck size={24} />, title: 'Livraison Gratuite', desc: "Dès 50 000 FCFA d'achat" },
    { icon: <RotateCcw size={24} />, title: 'Retours Faciles', desc: "30 jours pour changer d'avis" },
    { icon: <Shield size={24} />, title: 'Paiement Sécurisé', desc: 'Wave · Orange Money · CB' },
    { icon: <Headphones size={24} />, title: 'Service Client', desc: 'Lun–Ven 8h–18h (Dakar)' },
  ];

  return (
    <main className={styles.main}>
      {/* === HERO === */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <img
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=85"
            alt="Hero"
            className={styles.heroBgImg}
          />
          <div className={styles.heroOverlay} />
        </div>
        <div className={`container ${styles.heroContent}`}>
          <div className={styles.heroTag}>
            <Star size={12} fill="currentColor" /> Collection 2024
          </div>
          <h1 className={styles.heroTitle}>
            L'Élégance<br />
            <em>au Quotidien</em>
          </h1>
          <p className={styles.heroDesc}>
            Des produits soigneusement sélectionnés pour sublimer chaque instant de votre vie.
          </p>
          <div className={styles.heroCta}>
            <Link to="/catalogue" className={styles.ctaPrimary}>
              Découvrir la collection <ArrowRight size={18} />
            </Link>
            <Link to="/catalogue?isNew=true" className={styles.ctaSecondary}>
              Nouveautés
            </Link>
          </div>
        </div>
        {/* Stats */}
        <div className={styles.heroStats}>
          <div className={styles.stat}><span className={styles.statNum}>{categories.length > 0 ? `${categories.length}` : '…'}</span><span className={styles.statLabel}>Catégories</span></div>
          <div className={styles.statDivider} />
          <div className={styles.stat}><span className={styles.statNum}>4.8★</span><span className={styles.statLabel}>Note moyenne</span></div>
          <div className={styles.statDivider} />
          <div className={styles.stat}><span className={styles.statNum}>100%</span><span className={styles.statLabel}>Sécurisé</span></div>
        </div>
      </section>

      {/* === TRUST BAR === */}
      <section className={styles.trustBar}>
        <div className="container">
          <div className={styles.trustGrid}>
            {trustItems.map((item, i) => (
              <div key={i} className={styles.trustItem}>
                <span className={styles.trustIcon}>{item.icon}</span>
                <div>
                  <p className={styles.trustTitle}>{item.title}</p>
                  <p className={styles.trustDesc}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === CATÉGORIES === */}
      <section className={`section ${styles.categoriesSection}`}>
        <div className="container">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Nos Catégories</h2>
            <Link to="/catalogue" className={styles.seeAll}>
              Tout voir <ArrowRight size={16} />
            </Link>
          </div>
          <div className={styles.categoriesGrid}>
            {categories.length === 0
              ? [...Array(6)].map((_, i) => (
                  <div key={i} style={{ background: 'var(--color-surface,#f3f4f6)', borderRadius: 12, height: 100, animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))
              : categories.map(cat => (
                  <Link
                    key={cat.id}
                    to={`/catalogue?cat=${cat.slug}`}
                    className={styles.catCard}
                    style={{ '--cat-color': '#A5B4D4' }}
                  >
                    <span className={styles.catIcon}>🏷️</span>
                    <span className={styles.catName}>{cat.name}</span>
                    <span className={styles.catCount}>{cat.productCount} produit{cat.productCount !== 1 ? 's' : ''}</span>
                  </Link>
                ))
            }
          </div>
        </div>
      </section>

      {/* === PRODUITS VEDETTES === */}
      <section className={`section ${styles.productsSection}`}>
        <div className="container">
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionTag}>Sélection</span>
              <h2 className={styles.sectionTitle}>Coups de Cœur</h2>
            </div>
            <Link to="/catalogue?isFeatured=true" className={styles.seeAll}>
              Voir tout <ArrowRight size={16} />
            </Link>
          </div>
          <div className={styles.productsGrid}>
            {productsLoading && featuredProducts.length === 0
              ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
              : featuredProducts.length > 0
                ? featuredProducts.map(product => <ProductCard key={product.id} product={product} />)
                : <p style={{ color: 'var(--color-muted,#888)', gridColumn: '1/-1', textAlign: 'center' }}>Aucun produit vedette pour le moment.</p>
            }
          </div>
        </div>
      </section>

      {/* === BANNER PROMO === */}
      <section className={styles.banner}>
        <div className="container">
          <div className={styles.bannerInner}>
            <div className={styles.bannerContent}>
              <span className={styles.bannerTag}>Offre exclusive</span>
              <h2 className={styles.bannerTitle}>Livraison Gratuite<br />dès 50 000 FCFA d'achat</h2>
              <p className={styles.bannerDesc}>
                Profitez de la livraison offerte sur toutes vos commandes de plus de 50 000 FCFA au Sénégal.
              </p>
              <Link to="/catalogue" className={styles.bannerCta}>
                En profiter <ArrowRight size={16} />
              </Link>
            </div>
            <div className={styles.bannerImage}>
              <img
                src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600&q=80"
                alt="Promotion livraison"
              />
            </div>
          </div>
        </div>
      </section>

      {/* === NOUVEAUTÉS === */}
      <section className={`section ${styles.productsSection}`}>
        <div className="container">
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionTag}>Dernières arrivées</span>
              <h2 className={styles.sectionTitle}>Nouveautés</h2>
            </div>
            <Link to="/catalogue?isNew=true" className={styles.seeAll}>
              Voir tout <ArrowRight size={16} />
            </Link>
          </div>
          <div className={styles.productsGrid}>
            {productsLoading && newProducts.length === 0
              ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
              : newProducts.length > 0
                ? newProducts.map(product => <ProductCard key={product.id} product={product} />)
                : <p style={{ color: 'var(--color-muted,#888)', gridColumn: '1/-1', textAlign: 'center' }}>Aucune nouveauté pour le moment.</p>
            }
          </div>
        </div>
      </section>

      {/* === NEWSLETTER === */}
      <section className={styles.newsletter}>
        <div className="container">
          <div className={styles.newsletterInner}>
            <h2 className={styles.newsletterTitle}>Restez Inspiré·e</h2>
            <p className={styles.newsletterDesc}>
              Recevez nos sélections exclusives, offres spéciales et nouveautés en avant-première.
            </p>
            <form className={styles.newsletterForm} onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Votre adresse e-mail"
                className={styles.newsletterInput}
              />
              <button type="submit" className={styles.newsletterBtn}>
                S'abonner <ArrowRight size={16} />
              </button>
            </form>
            <p className={styles.newsletterNote}>
              En vous abonnant, vous acceptez de recevoir nos communications. Désabonnement possible à tout moment.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
