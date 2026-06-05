import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import styles from './AdminLogin.module.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const addToast = useUIStore((s) => s.addToast);
  const { adminLogin, isAdminAuthenticated } = useAdminAuthStore();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const customerUser = useAuthStore((s) => s.user);

  useEffect(() => {
    if (customerUser && customerUser.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [customerUser, navigate]);

  useEffect(() => {
    if (isAdminAuthenticated) {
      // If already authenticated, go to admin dashboard
      navigate('/admin');
    }
  }, [isAdminAuthenticated, navigate]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await adminLogin(data);
      addToast('Connexion admin réussie !');
      navigate('/admin');
    } catch (err) {
      addToast(err.message || 'Impossible de se connecter', 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.head}>
          <h1>Connexion Admin</h1>
          <p>Connectez-vous avec un compte administrateur pour accéder au back-office.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              {...register('email', { required: 'Email requis' })}
            />
            {errors.email && <span className={styles.error}>{errors.email.message}</span>}
          </label>

          <label className={styles.label}>
            Mot de passe
            <input
              type="password"
              className={styles.input}
              {...register('password', { required: 'Mot de passe requis' })}
            />
            {errors.password && <span className={styles.error}>{errors.password.message}</span>}
          </label>

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <p className={styles.fallback}><Link to="/">Retour boutique</Link></p>
        </form>
      </div>
    </main>
  );
}
