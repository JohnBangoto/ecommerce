import { Check, MapPin, Truck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useUIStore } from '../store/uiStore';
import formatPrice from '../utils/formatPrice';
import styles from './Commande.module.css';

const deliveryOptions = [
  { id: 'standard', label: 'Livraison Standard', desc: '3–5 jours ouvrés', price: 3500 },
  { id: 'express', label: 'Livraison Express', desc: '1–2 jours ouvrés', price: 7500 },
  { id: 'free', label: 'Livraison Gratuite', desc: '5–7 jours ouvrés', price: 0, condition: 50000 },
];

export default function Commande() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addToast = useUIStore((s) => s.addToast);
  const { items, getTotal } = useCartStore();
  const [selectedDelivery, setSelectedDelivery] = useState('standard');
  const { register, handleSubmit, formState: { errors } } = useForm();
  const total = getTotal();

  const delivery = deliveryOptions.find(d => d.id === selectedDelivery);
  const freeEligible = total >= 50000;
  const shippingCost = selectedDelivery === 'free' ? 0 : delivery?.price || 0;
  const grandTotal = total + shippingCost;

  useEffect(() => {
    if (!isAuthenticated) {
      addToast('Connexion requise pour finaliser votre commande.', 'warning');
      navigate('/login', { state: { from: location } });
    }
  }, [isAuthenticated, addToast, navigate, location]);

  const onSubmit = (data) => {
    navigate('/paiement', { state: { shippingData: data, delivery: selectedDelivery } });
  };

  return (
    <main className={styles.page}>
      <div className="container">
        {/* Progress */}
        <div className={styles.progress}>
          {['Panier', 'Livraison', 'Paiement', 'Confirmation'].map((step, i) => (
            <React.Fragment key={step}>
              <div className={`${styles.step} ${i <= 1 ? styles.stepActive : ''}`}>
                <div className={styles.stepCircle}>
                  {i < 1 ? <Check size={14} /> : i + 1}
                </div>
                <span className={styles.stepLabel}>{step}</span>
              </div>
              {i < 3 && <div className={`${styles.stepLine} ${i < 1 ? styles.stepLineDone : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className={styles.layout}>
          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
            {/* Adresse */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <MapPin size={20} className={styles.sectionIcon} />
                <h2 className={styles.sectionTitle}>Adresse de livraison</h2>
              </div>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Prénom *</label>
                  <input
                    className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
                    placeholder="Marie"
                    {...register('firstName', { required: 'Prénom requis' })}
                  />
                  {errors.firstName && <span className={styles.error}>{errors.firstName.message}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Nom *</label>
                  <input
                    className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
                    placeholder="Dupont"
                    {...register('lastName', { required: 'Nom requis' })}
                  />
                  {errors.lastName && <span className={styles.error}>{errors.lastName.message}</span>}
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label}>Email *</label>
                  <input
                    type="email"
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    placeholder="marie@email.fr"
                    {...register('email', {
                      required: 'Email requis',
                      pattern: { value: /^[^@]+@[^@]+\.[^@]+$/, message: 'Email invalide' }
                    })}
                  />
                  {errors.email && <span className={styles.error}>{errors.email.message}</span>}
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label}>Téléphone</label>
                  <input className={styles.input} placeholder="+221 77 123 45 67" {...register('phone')} />
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label}>Adresse *</label>
                  <input
                    className={`${styles.input} ${errors.address ? styles.inputError : ''}`}
                    placeholder="12 Avenue Cheikh Anta Diop"
                    {...register('address', { required: 'Adresse requise' })}
                  />
                  {errors.address && <span className={styles.error}>{errors.address.message}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Ville *</label>
                  <input
                    className={`${styles.input} ${errors.city ? styles.inputError : ''}`}
                    placeholder="Dakar"
                    {...register('city', { required: 'Ville requise' })}
                  />
                  {errors.city && <span className={styles.error}>{errors.city.message}</span>}
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label}>Région</label>
                  <select className={styles.input} {...register('country')}>
                    <option value="DK">Dakar</option>
                    <option value="TH">Thiès</option>
                    <option value="SL">Saint-Louis</option>
                    <option value="ZG">Ziguinchor</option>
                    <option value="KL">Kaolack</option>
                    <option value="DB">Diourbel</option>
                    <option value="LG">Louga</option>
                    <option value="FK">Fatick</option>
                    <option value="KF">Kaffrine</option>
                    <option value="KD">Kédougou</option>
                    <option value="KL2">Kolda</option>
                    <option value="MT">Matam</option>
                    <option value="SK">Sédhiou</option>
                    <option value="TB">Tambacounda</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Livraison */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <Truck size={20} className={styles.sectionIcon} />
                <h2 className={styles.sectionTitle}>Mode de livraison</h2>
              </div>
              <div className={styles.deliveryOptions}>
                {deliveryOptions.map(opt => {
                  const disabled = opt.id === 'free' && !freeEligible;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`${styles.deliveryOpt} ${selectedDelivery === opt.id ? styles.deliveryActive : ''} ${disabled ? styles.deliveryDisabled : ''}`}
                      onClick={() => !disabled && setSelectedDelivery(opt.id)}
                    >
                      <div className={styles.deliveryRadio}>
                        {selectedDelivery === opt.id && <div className={styles.deliveryRadioDot} />}
                      </div>
                      <div className={styles.deliveryInfo}>
                        <p className={styles.deliveryLabel}>{opt.label}</p>
                        <p className={styles.deliveryDesc}>{opt.desc} {disabled && '(dès 50 000 FCFA)'}</p>
                      </div>
                      <span className={styles.deliveryPrice}>
                        {opt.price === 0 ? 'Gratuit' : formatPrice(opt.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="submit" className={styles.submitBtn}>
              Continuer vers le paiement →
            </button>
          </form>

          {/* Summary */}
          <aside className={styles.summary}>
            <h2 className={styles.summaryTitle}>Récapitulatif</h2>
            <div className={styles.summaryItems}>
              {items.map(item => (
                <div key={item.key} className={styles.summaryItem}>
                  <div className={styles.summaryItemImg}>
                    <img src={item.product.image} alt={item.product.name} />
                    <span className={styles.summaryQty}>{item.quantity}</span>
                  </div>
                  <div className={styles.summaryItemInfo}>
                    <p className={styles.summaryItemName}>{item.product.name}</p>
                    {item.options?.size && <p className={styles.summaryItemOpt}>{item.options.size}</p>}
                  </div>
                  <span className={styles.summaryItemPrice}>
                    {formatPrice(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.summaryLines}>
              <div className={styles.summaryLine}><span>Sous-total</span><span>{formatPrice(total)}</span></div>
              <div className={styles.summaryLine}><span>Livraison</span><span>{shippingCost === 0 ? 'Gratuite' : formatPrice(shippingCost)}</span></div>
              <div className={`${styles.summaryLine} ${styles.summaryTotal}`}>
                <span>Total</span><span>{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
