import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import CartDrawer from './components/cart/CartDrawer';
import Footer from './components/layout/Footer';
import Header from './components/layout/Header';
import ToastContainer from './components/ui/Toast';
import Login from './pages/Login';
import { useAuthStore } from './store/authStore';

// Front office pages
import Catalogue from './pages/Catalogue';
import Commande from './pages/Commande';
import Confirmation from './pages/Confirmation';
import Contact from './pages/Contact';
import Home from './pages/Home';
import MesCommandes from './pages/MesCommandes';
import Paiement from './pages/Paiement';
import Panier from './pages/Panier';
import Produit from './pages/Produit';
import Recherche from './pages/Recherche';
import Suivi from './pages/Suivi';

// Back office
import AdminLayout from './components/admin/AdminLayout';
import AdminCommandes from './pages/admin/AdminCommandes';
import AdminLogin from './pages/admin/AdminLogin';
import AdminProduits from './pages/admin/AdminProduits';
import AdminStats from './pages/admin/AdminStats';
import AdminStock from './pages/admin/AdminStock';
import Dashboard from './pages/admin/Dashboard';
import { useAdminAuthStore } from './store/adminAuthStore';

import styles from './App.module.css';

function RequireAuth({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function RequireAdmin({ children }) {
  const isAdminAuthenticated = useAdminAuthStore((s) => s.isAdminAuthenticated);
  const adminUser = useAdminAuthStore((s) => s.adminUser);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (user && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (!isAdminAuthenticated || !adminUser || adminUser.role !== 'admin') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}

function FrontOfficeGuard({ children }) {
  const isAdminAuthenticated = useAdminAuthStore((s) => s.isAdminAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (isAdminAuthenticated || user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

export default function App() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (user?.role === 'admin' && token) {
      // Migrate admin session to admin store
      useAdminAuthStore.setState({
        adminUser: user,
        adminToken: token,
        isAdminAuthenticated: true,
      });
      localStorage.setItem('luxora-admin-token', token);
      logout();
    }
  }, [user, token, logout]);

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Back Office (/admin/*) ── */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<Dashboard />} />
          <Route path="produits" element={<AdminProduits />} />
          <Route path="commandes" element={<AdminCommandes />} />
          <Route path="stock" element={<AdminStock />} />
          <Route path="stats" element={<AdminStats />} />
        </Route>

        {/* ── Front Office ── */}
        <Route path="/*" element={
          <FrontOfficeGuard>
            <div className={styles.appWrapper}>
              <Header />
              <div className={styles.pageContent}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/catalogue" element={<Catalogue />} />
                  <Route path="/produit/:id" element={<Produit />} />
                  <Route path="/recherche" element={<Recherche />} />
                  <Route path="/panier" element={<Panier />} />
                  <Route path="/commande" element={<RequireAuth><Commande /></RequireAuth>} />
                  <Route path="/paiement" element={<RequireAuth><Paiement /></RequireAuth>} />
                  <Route path="/mes-commandes" element={<RequireAuth><MesCommandes /></RequireAuth>} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/confirmation/:orderId" element={<Confirmation />} />
                  <Route path="/confirmation" element={<Confirmation />} />
                  <Route path="/suivi/:orderId" element={<Suivi />} />
                  <Route path="/suivi" element={<Suivi />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              <Footer />
              <CartDrawer />
              <ToastContainer />
            </div>
          </FrontOfficeGuard>
        } />
      </Routes>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '1.5rem', padding: '6rem 1rem', textAlign: 'center'
    }}>
      <p style={{ fontSize: '5rem', lineHeight: 1 }}>🔍</p>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem', color: '#1A1714' }}>
        Page introuvable
      </h1>
      <p style={{ color: '#6B6560' }}>La page que vous cherchez n'existe pas.</p>
      <a href="/" style={{
        padding: '0.75rem 2rem', background: '#C9A96E', color: 'white',
        borderRadius: '9999px', fontWeight: 600, textDecoration: 'none'
      }}>Retour à l'accueil</a>
    </div>
  );
}
