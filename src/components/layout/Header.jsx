import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, Heart, User } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useUIStore } from '../../store/uiStore';
import styles from './Header.module.css';

export default function Header() {
  const navigate = useNavigate();
  const count = useCartStore((s) => s.getCount());
  const openCart = useCartStore((s) => s.openCart);
  const { searchQuery, setSearchQuery, isMenuOpen, toggleMenu, closeMenu } = useUIStore();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/recherche?q=${encodeURIComponent(searchQuery.trim())}`);
      closeMenu();
    }
  };

  const navLinks = [
    { to: '/', label: 'Accueil' },
    { to: '/catalogue', label: 'Catalogue' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        {/* Logo */}
        <Link to="/" className={styles.logo} onClick={closeMenu}>
          <span className={styles.logoIcon}>✦</span>
          <span className={styles.logoText}>LUXORA</span>
        </Link>

        {/* Navigation desktop */}
        <nav className={styles.nav}>
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} className={styles.navLink}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Recherche desktop */}
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn} aria-label="Rechercher">
            <Search size={16} />
          </button>
        </form>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.iconBtn} aria-label="Favoris">
            <Heart size={20} />
          </button>
          <button className={styles.iconBtn} aria-label="Mon compte">
            <User size={20} />
          </button>
          <button
            className={styles.cartBtn}
            onClick={openCart}
            aria-label={`Panier (${count} articles)`}
          >
            <ShoppingCart size={20} />
            {count > 0 && <span className={styles.cartBadge}>{count}</span>}
          </button>
          <button
            className={`${styles.iconBtn} ${styles.menuBtn}`}
            onClick={toggleMenu}
            aria-label="Menu"
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className={styles.mobileMenu}>
          <form className={styles.mobileSearch} onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchBtn}>
              <Search size={16} />
            </button>
          </form>
          <nav className={styles.mobileNav}>
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} className={styles.mobileNavLink} onClick={closeMenu}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
