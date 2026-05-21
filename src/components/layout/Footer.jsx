import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>✦</span>
            <span className={styles.logoText}>LUXORA</span>
          </div>
          <p className={styles.tagline}>
            L'élégance au quotidien. Des produits soigneusement sélectionnés pour une vie raffinée.
          </p>
          <div className={styles.socials}>
            {/* Instagram */}
            <a href="#" className={styles.socialLink} aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            {/* Facebook */}
            <a href="#" className={styles.socialLink} aria-label="Facebook">
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            {/* X / Twitter */}
            <a href="#" className={styles.socialLink} aria-label="X (Twitter)">
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l16 16M4 20L20 4"/></svg>
            </a>
          </div>
        </div>

        {/* Liens rapides */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>Navigation</h4>
          <ul className={styles.colLinks}>
            <li><Link to="/">Accueil</Link></li>
            <li><Link to="/catalogue">Catalogue</Link></li>
            <li><Link to="/recherche">Recherche</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>

        {/* Catégories */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>Catégories</h4>
          <ul className={styles.colLinks}>
            <li><Link to="/catalogue?cat=mode">Mode & Vêtements</Link></li>
            <li><Link to="/catalogue?cat=electronique">Électronique</Link></li>
            <li><Link to="/catalogue?cat=maison">Maison & Déco</Link></li>
            <li><Link to="/catalogue?cat=beaute">Beauté & Soins</Link></li>
            <li><Link to="/catalogue?cat=sport">Sport & Loisirs</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>Contact</h4>
          <ul className={styles.contactList}>
            <li>
              <MapPin size={14} />
              <span>12 Avenue Cheikh Anta Diop, Dakar</span>
            </li>
            <li>
              <Phone size={14} />
              <span>+221 33 821 45 67</span>
            </li>
            <li>
              <Mail size={14} />
              <span>contact@luxora.sn</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className={styles.bottom}>
        <div className="container">
          <div className={styles.bottomInner}>
            <p>© 2024 Luxora Sénégal. Tous droits réservés.</p>
            <div className={styles.legal}>
              <a href="#">Mentions légales</a>
              <a href="#">Politique de confidentialité</a>
              <a href="#">CGV</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
