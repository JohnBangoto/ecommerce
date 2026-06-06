import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import styles from './CompleteProfile.module.css';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const { user, isAuthenticated, loading, error, completeProfile } = useAuthStore();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    // Si le profil est déjà complet, rediriger vers l'accueil
    if (user && user.firstName && user.lastName) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = async (data) => {
    try {
      await completeProfile({
        firstName: data.firstName,
        lastName: data.lastName,
      });
      addToast('Votre profil a été complété. Bienvenue sur Luxora !');
      navigate('/', { replace: true });
    } catch (err) {
      addToast(err.message || 'Impossible d\'enregistrer vos informations.', 'warning');
    }
  };

  if (!user) return null;

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.head}>
          <h1>Finaliser votre profil</h1>
          <p>
            Veuillez renseigner votre prénom et votre nom pour faciliter la livraison de vos prochaines commandes.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <label className={styles.label}>
            Email
            <input
              type="email"
              className={styles.input}
              value={user.email}
              disabled
            />
          </label>

          <label className={styles.label}>
            Prénom
            <input
              type="text"
              className={styles.input}
              placeholder="Ex: Amadou"
              {...register('firstName', { 
                required: 'Le prénom est requis.',
                minLength: { value: 2, message: 'Le prénom doit contenir au moins 2 caractères.' }
              })}
            />
            {errors.firstName && <span className={styles.error}>{errors.firstName.message}</span>}
          </label>

          <label className={styles.label}>
            Nom de famille
            <input
              type="text"
              className={styles.input}
              placeholder="Ex: Diallo"
              {...register('lastName', { 
                required: 'Le nom de famille est requis.',
                minLength: { value: 2, message: 'Le nom doit contenir au moins 2 caractères.' }
              })}
            />
            {errors.lastName && <span className={styles.error}>{errors.lastName.message}</span>}
          </label>

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Enregistrement...' : 'Valider et continuer'}
          </button>

          {error && <p className={styles.serverError}>{error}</p>}
        </form>
      </div>
    </main>
  );
}
