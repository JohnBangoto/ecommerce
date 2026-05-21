import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Truck, RotateCcw, Shield, Headphones, Star } from 'lucide-react';
import { categories } from '../data/products';
import { useAdminStore } from '../store/adminStore';
import ProductCard from '../components/product/ProductCard';
import styles from './Home.module.css';

export default function Home() {
  const navigate = useNavigate();
  const products = useAdminStore(s => s.products);
  const featuredProducts = products.filter(p => p.isFeatured);
  const newProducts = products.filter(p => p.isNew);

  const trustItems = [
    { icon: <Truck size={24} />, title: 'Livraison Gratuite', desc: 'Dès 50 000 FCFA d\'achat' },
    { icon: <RotateCcw size={24} />, title: 'Retours Faciles', desc: '30 jours pour changer d\'avis' },
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
            <Link to="/catalogue?cat=nouveautes" className={styles.ctaSecondary}>
              Nouveautés
            </Link>
          </div>
        </div>
        {/* Stats */}
        <div className={styles.heroStats}>
          <div className={styles.stat}><span className={styles.statNum}>50+</span><span className={styles.statLabel}>Produits</span></div>
          <div className={styles.statDivider} />
          <div className={styles.stat}><span className={styles.statNum}>7</span><span className={styles.statLabel}>Catégories</span></div>
          <div className={styles.statDivider} />
          <div className={styles.stat}><span className={styles.statNum}>4.8★</span><span className={styles.statLabel}>Note moyenne</span></div>
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
            {categories.map(cat => (
              <Link
                key={cat.id}
                to={`/catalogue?cat=${cat.id}`}
                className={styles.catCard}
                style={{ '--cat-color': cat.color }}
              >
                <span className={styles.catIcon}>{cat.icon}</span>
                <span className={styles.catName}>{cat.name}</span>
                <span className={styles.catCount}>{cat.count} produits</span>
              </Link>
            ))}
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
            <Link to="/catalogue" className={styles.seeAll}>
              Voir tout <ArrowRight size={16} />
            </Link>
          </div>
          <div className={styles.productsGrid}>
            {featuredProducts.slice(0, 4).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* === BANNER PROMO === */}
      <section className={styles.banner}>
        <div className="container">
          <div className={styles.bannerInner}>
            <div className={styles.bannerContent}>
              <span className={styles.bannerTag}>Offre exclusive</span>
              <h2 className={styles.bannerTitle}>Livraison Gratuite<br />dès 50 000 FCFA d'achat</h2>
              <p className={styles.bannerDesc}>
                Profitez de la livraison offerte sur toutes vos commandes de plus de 50 000 FCFA au Sénégal.
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
            <Link to="/catalogue?cat=nouveautes" className={styles.seeAll}>
              Voir tout <ArrowRight size={16} />
            </Link>
          </div>
          <div className={styles.productsGrid}>
            {(newProducts.length > 0 ? newProducts : products).slice(0, 4).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
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
