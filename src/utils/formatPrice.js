/**
 * Formatte un prix en Franc CFA (FCFA)
 * Ex: formatPrice(15000) => "15 000 FCFA"
 */
export function formatPrice(amount) {
  if (amount === null || amount === undefined) return '';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num) + ' FCFA';
}

export default formatPrice;
