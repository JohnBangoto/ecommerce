import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Phone, MapPin, Clock, Send, ChevronDown, CheckCircle } from 'lucide-react';
import { api } from '../utils/api';
import { useUIStore } from '../store/uiStore';
import styles from './Contact.module.css';

const faqs = [
  { q: 'Quels sont les délais de livraison ?', a: 'La livraison standard prend 3–5 jours ouvrés. La livraison express est disponible en 1–2 jours ouvrés.' },
  { q: 'Comment retourner un article ?', a: 'Vous disposez de 30 jours après réception pour retourner un article. Contactez notre service client pour obtenir une étiquette de retour gratuite.' },
  { q: 'Les paiements sont-ils sécurisés ?', a: 'Oui, tous les paiements sont chiffrés avec SSL 256-bit. Nous acceptons Visa, Mastercard, PayPal et virement bancaire.' },
  { q: 'Puis-je modifier ou annuler ma commande ?', a: 'Une commande peut être modifiée ou annulée dans les 2h suivant la passation. Contactez-nous rapidement par téléphone pour toute modification urgente.' },
  { q: 'Comment suivre ma commande ?', a: 'Dès expédition, vous recevez un email avec votre numéro de suivi. Vous pouvez également utiliser notre page de suivi de commande.' },
];

const subjects = [
  'Suivi de commande',
  'Retour / Remboursement',
  'Problème de paiement',
  'Question produit',
  'Partenariat',
  'Autre',
];

export default function Contact() {
  const [openFaq, setOpenFaq] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const addToast = useUIStore((s) => s.addToast);
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const onSubmit = async (data) => {
    try {
      await api.post('/contact', data);
      setSubmitted(true);
      addToast('Votre message a été envoyé avec succès !');
      reset();
      setTimeout(() => setSubmitted(false), 6000);
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Impossible d\'envoyer le message.', 'warning');
    }
  };

  return (
    <main className={styles.page}>
      <div className="container">
        {/* Hero */}
        <div className={styles.hero}>
          <span className={styles.heroTag}>Support & Contact</span>
          <h1 className={styles.heroTitle}>Nous sommes là pour vous</h1>
          <p className={styles.heroDesc}>Une question ? Un problème ? Notre équipe répond sous 24h.</p>
        </div>

        {/* Contact Cards */}
        <div className={styles.contactCards}>
          <div className={styles.contactCard}>
            <div className={styles.cardIcon}><Phone size={22} /></div>
            <h3 className={styles.cardTitle}>Téléphone</h3>
            <p className={styles.cardVal}>+221 33 821 45 67</p>
            <p className={styles.cardDesc}>Lun–Ven, 9h–18h</p>
          </div>
          <div className={styles.contactCard}>
            <div className={styles.cardIcon}><Mail size={22} /></div>
            <h3 className={styles.cardTitle}>Email</h3>
            <p className={styles.cardVal}>contact@luxora.sn</p>
            <p className={styles.cardDesc}>Réponse sous 24h</p>
          </div>
          <div className={styles.contactCard}>
            <div className={styles.cardIcon}><MapPin size={22} /></div>
            <h3 className={styles.cardTitle}>Adresse</h3>
            <p className={styles.cardVal}>12 Avenue Cheikh Anta Diop</p>
            <p className={styles.cardDesc}>10001 Dakar, Sénégal</p>
          </div>
          <div className={styles.contactCard}>
            <div className={styles.cardIcon}><Clock size={22} /></div>
            <h3 className={styles.cardTitle}>Horaires</h3>
            <p className={styles.cardVal}>Lun–Ven 9h–18h</p>
            <p className={styles.cardDesc}>Sam 10h–14h</p>
          </div>
        </div>

        <div className={styles.mainGrid}>
          {/* Form */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Envoyez-nous un message</h2>
            <p className={styles.sectionDesc}>Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais.</p>

            {submitted && (
              <div className={styles.successMsg}>
                <CheckCircle size={20} />
                <span>Message envoyé avec succès ! Nous vous répondrons sous 24h.</span>
              </div>
            )}

            <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Prénom *</label>
                  <input
                    className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
                    placeholder="Marie"
                    {...register('firstName', { required: 'Requis' })}
                  />
                  {errors.firstName && <span className={styles.error}>{errors.firstName.message}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Nom *</label>
                  <input
                    className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
                    placeholder="Dupont"
                    {...register('lastName', { required: 'Requis' })}
                  />
                  {errors.lastName && <span className={styles.error}>{errors.lastName.message}</span>}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Email *</label>
                <input
                  type="email"
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  placeholder="marie@email.fr"
                  {...register('email', { required: 'Requis', pattern: { value: /^[^@]+@[^@]+\.[^@]+$/, message: 'Email invalide' } })}
                />
                {errors.email && <span className={styles.error}>{errors.email.message}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Sujet *</label>
                <div className={styles.selectWrap}>
                  <select
                    className={`${styles.input} ${errors.subject ? styles.inputError : ''}`}
                    {...register('subject', { required: 'Requis' })}
                  >
                    <option value="">Choisir un sujet...</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={16} className={styles.selectIcon} />
                </div>
                {errors.subject && <span className={styles.error}>{errors.subject.message}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Numéro de commande (optionnel)</label>
                <input
                  className={styles.input}
                  placeholder="CMD-2024-001"
                  {...register('orderId')}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Message *</label>
                <textarea
                  className={`${styles.textarea} ${errors.message ? styles.inputError : ''}`}
                  rows={6}
                  placeholder="Décrivez votre demande en détail..."
                  {...register('message', { required: 'Message requis', minLength: { value: 20, message: 'Minimum 20 caractères' } })}
                />
                {errors.message && <span className={styles.error}>{errors.message.message}</span>}
              </div>

              <button type="submit" className={styles.submitBtn}>
                <Send size={16} /> Envoyer le message
              </button>
            </form>
          </div>

          {/* FAQ */}
          <div className={styles.faqSection}>
            <h2 className={styles.sectionTitle}>Questions fréquentes</h2>
            <p className={styles.sectionDesc}>Trouvez rapidement la réponse à votre question.</p>
            <div className={styles.faqList}>
              {faqs.map((faq, i) => (
                <div key={i} className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ''}`}>
                  <button
                    className={styles.faqQuestion}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className={styles.faqIcon} />
                  </button>
                  {openFaq === i && (
                    <div className={styles.faqAnswer}>
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Map placeholder */}
            <div className={styles.mapBox}>
              <img
                src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&q=80"
                alt="Paris"
                className={styles.mapImg}
              />
              <div className={styles.mapOverlay}>
                <MapPin size={28} className={styles.mapPin} />
                <p className={styles.mapLabel}>12 Av. Cheikh Anta Diop, Dakar</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
