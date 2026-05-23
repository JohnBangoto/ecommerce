import { Heart, LogOut, Menu, Package, Search, ShoppingCart, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useUIStore } from '../../store/uiStore';
import styles from './Header.module.css';

export default function Header() {
  const navigate = useNavigate();
  const count = useCartStore((s) => s.getCount());
  const openCart = useCartStore((s) => s.openCart);
  const { searchQuery, setSearchQuery, isMenuOpen, toggleMenu, closeMenu } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    closeMenu();
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/recherche?q=${encodeURIComponent(searchQuery.trim())}`);
      closeMenu();
    }
  };

  const userInitial = user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  const userName = user?.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : user?.email;

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

          {/* User dropdown */}
          {isAuthenticated ? (
            <div className={styles.userMenu} ref={userMenuRef}>
              <button
                className={`${styles.userBtn} ${userMenuOpen ? styles.userBtnActive : ''}`}
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-label="Mon compte"
                aria-expanded={userMenuOpen}
              >
                <div className={styles.userAvatar}>{userInitial}</div>
                <span className={styles.userNameLabel}>{user?.firstName || 'Mon compte'}</span>
              </button>

              {userMenuOpen && (
                <div className={styles.dropdown} role="menu">
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownAvatar}>{userInitial}</div>
                    <div>
                      <p className={styles.dropdownName}>{userName}</p>
                      <p className={styles.dropdownEmail}>{user?.email}</p>
                    </div>
                  </div>
                  <div className={styles.dropdownDivider} />
                  <Link
                    to="/mes-commandes"
                    className={styles.dropdownItem}
                    onClick={() => setUserMenuOpen(false)}
                    role="menuitem"
                  >
                    <Package size={16} />
                    Mes commandes
                  </Link>
                  <div className={styles.dropdownDivider} />
                  <button
                    className={`${styles.dropdownItem} ${styles.dropdownLogout}`}
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <LogOut size={16} />
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className={styles.iconBtn} onClick={closeMenu} aria-label="Se connecter">
              <User size={20} />
            </Link>
          )}

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
            {isAuthenticated && (
              <>
                <Link to="/mes-commandes" className={styles.mobileNavLink} onClick={closeMenu}>
                  <Package size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                  Mes commandes
                </Link>
                <button className={`${styles.mobileNavLink} ${styles.mobileLogout}`} onClick={handleLogout}>
                  <LogOut size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                  Se déconnecter
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
