import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'

// Nettoyage automatique du localStorage contenant les anciennes commandes de mock
try {
  const adminStore = localStorage.getItem('luxora-admin-store');
  if (adminStore) {
    const parsed = JSON.parse(adminStore);
    if (parsed && parsed.state && Array.isArray(parsed.state.orders) && parsed.state.orders.length > 0) {
      // Vider les commandes pour forcer le chargement depuis le backend local
      parsed.state.orders = [];
      localStorage.setItem('luxora-admin-store', JSON.stringify(parsed));
      console.log('luxora-admin-store: Anciennes commandes mockées vidées avec succès !');
    }
  }

  const orderStore = localStorage.getItem('luxora-order-store');
  if (orderStore) {
    const parsed = JSON.parse(orderStore);
    if (parsed && parsed.state && Array.isArray(parsed.state.orders) && parsed.state.orders.length > 0) {
      parsed.state.orders = [];
      localStorage.setItem('luxora-order-store', JSON.stringify(parsed));
      console.log('luxora-order-store: Anciennes commandes mockées vidées avec succès !');
    }
  }
} catch (e) {
  console.error('Erreur lors du nettoyage du localStorage :', e);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

