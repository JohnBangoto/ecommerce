import { Building2, Check, CreditCard, Lock, Shield } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import { useUIStore } from '../store/uiStore';
import formatPrice from '../utils/formatPrice';
import styles from './Paiement.module.css';

const paymentMethods = [
  { id: 'card', label: 'Carte bancaire', icon: <CreditCard size={20} /> },
  { id: 'wave', label: 'Wave', icon: (
    <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="#1DC8EE"/>
      <path d="M10 22c2-4 4-7 7-7s4 3 6 3 4-3 7-3" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M10 27c2-4 4-7 7-7s4 3 6 3 4-3 7-3" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6"/>
    </svg>
  )},
  { id: 'orange', label: 'Orange Money', icon: (
    <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="#FF6600"/>
      <circle cx="20" cy="20" r="9" fill="white"/>
      <circle cx="20" cy="20" r="5" fill="#FF6600"/>
    </svg>
  )},
  { id: 'virement', label: 'Virement bancaire', icon: <Building2 size={20} /> },
];

export default function Paiement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, getTotal, clearCart } = useCartStore();
  const addOrder = useOrderStore((s) => s.addOrder);
  const addToast = useUIStore((s) => s.addToast);
  const [method, setMethod] = useState('virement');
  const [processing, setProcessing] = useState(false);
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const total = getTotal();
  const shippingCost = total >= 50000 ? 0 : 3500;
  const grandTotal = total + shippingCost;

  const shippingData = location.state?.shippingData;

  const cartCount = items.reduce((acc, i) => acc + i.quantity, 0);

  // Garde de sécurité : si les données de livraison sont absentes (refresh, navigation directe),
  // ou si le panier est vide, rediriger vers l'étape d'adresse ou catalogue plutôt que d'envoyer des données invalides
  useEffect(() => {
    if (cartCount === 0) {
      addToast('Votre panier est vide.', 'warning');
      navigate('/catalogue', { replace: true });
    } else if (!shippingData) {
      addToast('Veuillez renseigner votre adresse de livraison.', 'warning');
      navigate('/commande', { replace: true });
    }
  }, [shippingData, cartCount, addToast, navigate]);

  const onSubmit = async () => {
    if (!shippingData) return; // Double sécurité

    setProcessing(true);
    try {
      await new Promise(r => setTimeout(r, 2000)); // Simulate API
      const order = await addOrder({
        items: items.map(i => ({
          productId: i.product.id,
          quantity: i.quantity,
          // Correctement extraits depuis les options du cartStore
          size: i.options?.size || undefined,
          color: i.options?.color || undefined,
        })),
        total: grandTotal,
        shippingAddress: shippingData,
        paymentMethod: method,
      });
      clearCart();
      addToast('Votre commande a été passée avec succès. Elle est transmise à l\'administrateur.', 'success');
      navigate(`/confirmation/${order.id}`);
    } catch (err) {
      console.error(err);
      addToast(err?.message || 'Une erreur est survenue lors de la validation de votre commande.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className="container">
        {/* Progress */}
        <div className={styles.progress}>
          {['Panier', 'Livraison', 'Paiement', 'Confirmation'].map((step, i) => (
            <React.Fragment key={step}>
              <div className={`${styles.step} ${i <= 2 ? styles.stepActive : ''}`}>
                <div className={styles.stepCircle}>
                  {i < 2 ? <Check size={14} /> : i + 1}
                </div>
                <span className={styles.stepLabel}>{step}</span>
              </div>
              {i < 3 && <div className={`${styles.stepLine} ${i < 2 ? styles.stepLineDone : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className={styles.layout}>
          {/* Payment Form */}
          <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Méthode de paiement</h2>
              <div className={styles.methods}>
                {paymentMethods.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className={`${styles.methodBtn} ${method === m.id ? styles.methodActive : ''}`}
                    onClick={() => setMethod(m.id)}
                  >
                    {m.icon}
                    {m.label}
                    {method === m.id && <Check size={14} className={styles.methodCheck} />}
                  </button>
                ))}
              </div>
            </div>

            {method === 'card' && (
              <div className={styles.section}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>Informations de la carte</h3>
                  <div className={styles.cardBrands}>
                    <span className={styles.cardBrand}>VISA</span>
                    <span className={styles.cardBrand}>MC</span>
                  </div>
                </div>

                <div className={styles.cardPreview}>
                  <div className={styles.cardChip} />
                  <p className={styles.cardNum}>{watch('cardNumber') ? watch('cardNumber').replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim() : '•••• •••• •••• ••••'}</p>
                  <div className={styles.cardBottom}>
                    <div>
                      <p className={styles.cardPreviewLabel}>Titulaire</p>
                      <p className={styles.cardPreviewVal}>{watch('cardName') || 'NOM PRÉNOM'}</p>
                    </div>
                    <div>
                      <p className={styles.cardPreviewLabel}>Expire</p>
                      <p className={styles.cardPreviewVal}>{watch('expiry') || 'MM/AA'}</p>
                    </div>
                  </div>
                </div>

                <div className={styles.fields}>
                  <div className={styles.field}>
                    <label className={styles.label}>Numéro de carte *</label>
                    <input
                      className={`${styles.input} ${errors.cardNumber ? styles.inputError : ''}`}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      {...register('cardNumber', {
                        pattern: { value: /^[\d\s]{16,19}$/, message: 'Numéro invalide' }
                      })}
                    />
                    {errors.cardNumber && <span className={styles.error}>{errors.cardNumber.message}</span>}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Titulaire *</label>
                    <input
                      className={`${styles.input} ${errors.cardName ? styles.inputError : ''}`}
                      placeholder="MARIE DUPONT"
                      style={{ textTransform: 'uppercase' }}
                      {...register('cardName')}
                    />
                    {errors.cardName && <span className={styles.error}>{errors.cardName.message}</span>}
                  </div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Date d'expiration *</label>
                      <input
                        className={`${styles.input} ${errors.expiry ? styles.inputError : ''}`}
                        placeholder="MM/AA"
                        maxLength={5}
                        {...register('expiry', {
                          pattern: { value: /^\d{2}\/\d{2}$/, message: 'Format MM/AA' }
                        })}
                      />
                      {errors.expiry && <span className={styles.error}>{errors.expiry.message}</span>}
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>CVV *</label>
                      <input
                        className={`${styles.input} ${errors.cvv ? styles.inputError : ''}`}
                        placeholder="123"
                        maxLength={4}
                        type="password"
                        {...register('cvv', {
                          pattern: { value: /^\d{3,4}$/, message: 'CVV invalide' }
                        })}
                      />
                      {errors.cvv && <span className={styles.error}>{errors.cvv.message}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {method === 'wave' && (
              <div className={styles.section}>
                <div className={styles.mobileMoneyInfo} style={{'--brand':'#1DC8EE'}}>
                  <div className={styles.mobileMoneyHeader}>
                    <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
                      <circle cx="20" cy="20" r="20" fill="#1DC8EE"/>
                      <path d="M8 22c3-6 5-9 9-9s5 4 8 4 5-4 9-4" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
                      <path d="M8 28c3-6 5-9 9-9s5 4 8 4 5-4 9-4" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55"/>
                    </svg>
                    <div>
                      <p className={styles.mobileMoneyName}>Wave</p>
                      <p className={styles.mobileMoneyDesc}>Paiement instantané via l'application Wave</p>
                    </div>
                  </div>
                  <div className={styles.field} style={{marginTop:'1rem'}}>
                    <label className={styles.label}>Numéro de téléphone Wave *</label>
                    <div className={styles.phoneInput}>
                      <span className={styles.phonePrefix}>🇸🇳 +221</span>
                      <input
                        className={styles.input}
                        placeholder="77 123 45 67"
                        {...register('wavePhone')}
                      />
                    </div>
                    {errors.wavePhone && <span className={styles.error}>{errors.wavePhone.message}</span>}
                  </div>
                  <p className={styles.mobileMoneyNote}>📱 Vous recevrez une notification sur l'application Wave pour confirmer le paiement.</p>
                </div>
              </div>
            )}

            {method === 'orange' && (
              <div className={styles.section}>
                <div className={styles.mobileMoneyInfo} style={{'--brand':'#FF6600'}}>
                  <div className={styles.mobileMoneyHeader}>
                    <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
                      <circle cx="20" cy="20" r="20" fill="#FF6600"/>
                      <circle cx="20" cy="20" r="9" fill="white"/>
                      <circle cx="20" cy="20" r="5" fill="#FF6600"/>
                    </svg>
                    <div>
                      <p className={styles.mobileMoneyName}>Orange Money</p>
                      <p className={styles.mobileMoneyDesc}>Paiement sécurisé via Orange Money</p>
                    </div>
                  </div>
                  <div className={styles.field} style={{marginTop:'1rem'}}>
                    <label className={styles.label}>Numéro Orange Money *</label>
                    <div className={styles.phoneInput}>
                      <span className={styles.phonePrefix}>🇸🇳 +221</span>
                      <input
                        className={styles.input}
                        placeholder="77 123 45 67"
                        {...register('orangePhone')}
                      />
                    </div>
                    {errors.orangePhone && <span className={styles.error}>{errors.orangePhone.message}</span>}
                  </div>
                  <p className={styles.mobileMoneyNote}>📱 Composez <strong>#144#</strong> ou utilisez l'application Orange Money pour valider.</p>
                </div>
              </div>
            )}

            {method === 'virement' && (
              <div className={styles.section}>
                <div className={styles.virementInfo}>
                  <p className={styles.virementDesc}>Effectuez votre virement sur ce compte :</p>
                  <div className={styles.bankDetails}>
                    <div className={styles.bankRow}><span>IBAN</span><strong>FR76 1234 5678 9012 3456 789</strong></div>
                    <div className={styles.bankRow}><span>BIC</span><strong>LUXORFR21</strong></div>
                    <div className={styles.bankRow}><span>Référence</span><strong>CMD-{Date.now().toString().slice(-6)}</strong></div>
                  </div>
                  <p className={styles.virementNote}>⚠️ Votre commande sera confirmée dès réception du paiement (2–3 jours ouvrés).</p>
                </div>
              </div>
            )}

            <div className={styles.securityBadge}>
              <Lock size={14} />
              <span>Paiement crypté SSL 256-bit — Vos données sont en sécurité</span>
            </div>

            <button type="submit" className={styles.payBtn} disabled={processing}>
              {processing ? (
                <span className={styles.processing}>
                  <span className={styles.spinner} />
                  Traitement en cours...
                </span>
              ) : (
                <><Shield size={18} /> Passer commande {formatPrice(grandTotal)}</>
              )}
            </button>
          </form>

          {/* Summary */}
          <aside className={styles.summary}>
            <h2 className={styles.summaryTitle}>Votre commande</h2>
            <div className={styles.summaryItems}>
              {items.map(item => (
                <div key={item.key} className={styles.summaryItem}>
                  <div className={styles.summaryImg}>
                    <img src={item.product.image} alt={item.product.name} />
                    <span className={styles.summaryQty}>{item.quantity}</span>
                  </div>
                  <span className={styles.summaryName}>{item.product.name}</span>
                  <span className={styles.summaryPrice}>{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className={styles.summaryLines}>
              <div className={styles.summaryLine}><span>Sous-total</span><span>{formatPrice(total)}</span></div>
              <div className={styles.summaryLine}><span>Livraison</span><span>{shippingCost === 0 ? 'Gratuite' : formatPrice(shippingCost)}</span></div>
              <div className={`${styles.summaryLine} ${styles.summaryTotal}`}>
                <span>Total TTC</span><span>{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
