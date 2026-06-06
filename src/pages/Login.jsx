import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import styles from './Login.module.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const addToast = useUIStore((s) => s.addToast);
  const { user, isAuthenticated, loading, error, login, register } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const { register: formRegister, handleSubmit, formState: { errors } } = useForm();

  const handleGoogleLogin = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const redirectUrl = `${window.location.origin}/login/callback`;
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        const destination = location.state?.from?.pathname || '/';
        navigate(destination, { replace: true });
      }
    }
  }, [isAuthenticated, user, location, navigate]);

  const onSubmit = async (data) => {
    try {
      if (isRegister) {
        await register(data);
        addToast('Inscription réussie, vous êtes connecté(e) !');
      } else {
        const loggedUser = await login(data);
        if (loggedUser && loggedUser.role === 'admin') {
          addToast('Connexion administrateur réussie !');
          navigate('/admin', { replace: true });
          return;
        }
        addToast('Connexion réussie !');
      }
    } catch (err) {
      addToast(err.message || 'Impossible de se connecter', 'warning');
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.head}>
          <h1>{isRegister ? 'Créer un compte' : 'Se connecter'}</h1>
          <p>
            {isRegister
              ? 'Inscrivez-vous pour commander et suivre vos commandes.'
              : 'Connectez-vous pour ajouter des produits au panier et finaliser vos achats.'}
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          {isRegister && (
            <div className={styles.grid}>
              <label className={styles.label}>
                Prénom
                <input
                  className={styles.input}
                  {...formRegister('firstName', { required: 'Prénom requis' })}
                />
                {errors.firstName && <span className={styles.error}>{errors.firstName.message}</span>}
              </label>
              <label className={styles.label}>
                Nom
                <input
                  className={styles.input}
                  {...formRegister('lastName', { required: 'Nom requis' })}
                />
                {errors.lastName && <span className={styles.error}>{errors.lastName.message}</span>}
              </label>
            </div>
          )}

          <label className={styles.label}>
            Email
            <input
              type="email"
              className={styles.input}
              {...formRegister('email', {
                required: 'Email requis',
                pattern: { value: /^[^@]+@[^@]+\.[^@]+$/, message: 'Email invalide' },
              })}
            />
            {errors.email && <span className={styles.error}>{errors.email.message}</span>}
          </label>

          <label className={styles.label}>
            Mot de passe
            <input
              type="password"
              className={styles.input}
              {...formRegister('password', {
                required: 'Mot de passe requis',
                minLength: { value: 6, message: '6 caractères minimum' },
              })}
            />
            {errors.password && <span className={styles.error}>{errors.password.message}</span>}
          </label>

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Traitement...' : isRegister ? 'Créer mon compte' : 'Se connecter'}
          </button>

          <div className={styles.divider}>
            <span>ou</span>
          </div>

          <button
            type="button"
            className={styles.googleBtn}
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuer avec Google
          </button>

          {error && <p className={styles.serverError}>{error}</p>}

          <div className={styles.toggleLine}>
            <span>
              {isRegister ? 'Déjà inscrit(e) ?' : 'Pas encore de compte ?'}
            </span>
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? 'Se connecter' : 'Créer un compte'}
            </button>
          </div>

          <p className={styles.fallback}>
            <Link to="/">Retour à l'accueil</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
