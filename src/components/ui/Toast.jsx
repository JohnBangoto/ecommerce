import React from 'react';
import { CheckCircle, Clock, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import styles from './Toast.module.css';

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className={styles.container}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]}`}
        >
          <span className={styles.icon}>
            {toast.type === 'success' ? <CheckCircle size={16} /> :
             toast.type === 'warning' ? <Clock size={16} /> :
             <X size={16} />}
          </span>
          <span className={styles.message}>{toast.message}</span>
          <button
            className={styles.closeBtn}
            onClick={() => removeToast(toast.id)}
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
