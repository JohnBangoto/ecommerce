import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CartDrawer from './components/cart/CartDrawer';
import ToastContainer from './components/ui/Toast';

// Front office pages
import Home from './pages/Home';
import Catalogue from './pages/Catalogue';
import Produit from './pages/Produit';
import Recherche from './pages/Recherche';
import Panier from './pages/Panier';
import Commande from './pages/Commande';
import Paiement from './pages/Paiement';
import Confirmation from './pages/Confirmation';
import Suivi from './pages/Suivi';
import Contact from './pages/Contact';

// Back office
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminProduits from './pages/admin/AdminProduits';
import AdminCommandes from './pages/admin/AdminCommandes';
import AdminStock from './pages/admin/AdminStock';
import AdminStats from './pages/admin/AdminStats';

import styles from './App.module.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Back Office (/admin/*) ── */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="produits" element={<AdminProduits />} />
          <Route path="commandes" element={<AdminCommandes />} />
          <Route path="stock" element={<AdminStock />} />
          <Route path="stats" element={<AdminStats />} />
        </Route>

        {/* ── Front Office ── */}
        <Route path="/*" element={
          <div className={styles.appWrapper}>
            <Header />
            <div className={styles.pageContent}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/catalogue" element={<Catalogue />} />
                <Route path="/produit/:id" element={<Produit />} />
                <Route path="/recherche" element={<Recherche />} />
                <Route path="/panier" element={<Panier />} />
                <Route path="/commande" element={<Commande />} />
                <Route path="/paiement" element={<Paiement />} />
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
