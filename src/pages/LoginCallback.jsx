import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

export default function LoginCallback() {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const [errorState, setErrorState] = useState(null);
  const loginAttempted = useRef(false);

  useEffect(() => {
    // Prevent double invocation in React StrictMode
    if (loginAttempted.current) return;
    
    const parseAndLogin = async () => {
      try {
        const hash = window.location.hash || '';
        const query = window.location.search || '';
        
        let accessToken = null;
        
        if (hash) {
          const params = new URLSearchParams(hash.replace(/^#/, ''));
          accessToken = params.get('access_token');
        } else if (query) {
          const params = new URLSearchParams(query);
          accessToken = params.get('access_token');
        }
        
        if (!accessToken) {
          throw new Error('Jeton d\'accès introuvable dans la redirection.');
        }

        loginAttempted.current = true;
        const user = await googleLogin(accessToken);
        
        addToast('Connexion Google réussie !');
        
        // Vérifier si le profil est incomplet (prénom/nom manquants)
        if (!user.firstName || !user.lastName) {
          navigate('/complete-profile', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error('OAuth Callback Error:', err);
        setErrorState(err.message || 'Échec de la connexion avec Google.');
        addToast(err.message || 'Impossible de se connecter avec Google.', 'warning');
      }
    };

    parseAndLogin();
  }, [googleLogin, navigate, addToast]);

  if (errorState) {
    return (
      <main style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 'calc(100vh - 120px)', padding: '2rem',
        textAlign: 'center', background: '#fcfbf9'
      }}>
        <div style={{
          maxWidth: '460px', width: '100%', background: 'white',
          border: '1px solid #e5dfd9', borderRadius: '24px', padding: '2.5rem',
          boxShadow: '0 12px 32px rgba(0,0,0,0.04)'
        }}>
          <p style={{ fontSize: '3rem', margin: '0 0 1rem' }}>⚠️</p>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.75rem', color: '#1a1714', margin: '0 0 0.75rem' }}>
            Erreur d'authentification
          </h2>
          <p style={{ color: '#6b6560', lineHeight: 1.6, margin: '0 0 2rem' }}>
            {errorState}
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            style={{
              width: '100%', padding: '1rem', background: '#c9a96e', color: 'white',
              border: 'none', borderRadius: '999px', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Retourner à la page de connexion
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 'calc(100vh - 120px)', padding: '2rem',
      background: '#fcfbf9'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '50px', height: '50px', border: '3px solid #e5dfd9',
          borderTopColor: '#c9a96e', borderRadius: '50%', animation: 'spin 1s linear infinite',
          margin: '0 auto 1.5rem'
        }} />
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: '#1a1714', margin: '0 0 0.5rem' }}>
          Connexion en cours
        </h2>
        <p style={{ color: '#6b6560', fontSize: '0.95rem' }}>
          Veuillez patienter pendant la validation de vos identifiants...
        </p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
