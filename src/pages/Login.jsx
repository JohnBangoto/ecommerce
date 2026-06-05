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
