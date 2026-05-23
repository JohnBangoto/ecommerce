export const ORDER_STATUSES = ['confirmed', 'prepared', 'shipped', 'delivered', 'cancelled'];

const ORDER_TIMELINE_STEPS = [
  { step: 'confirmed', label: 'Commande confirmee' },
  { step: 'prepared', label: 'Commande preparee' },
  { step: 'shipped', label: 'Expediee' },
  { step: 'delivered', label: 'Livree' },
];

export const parseShippingAddress = (value) => {
  if (!value) {
    return {};
  }

  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return { address: String(value) };
  }
};

export const buildOrderTimeline = (status, createdAt) => {
  const stepIndex = ORDER_TIMELINE_STEPS.findIndex((step) => step.step === status);

  return ORDER_TIMELINE_STEPS.map((step, index) => ({
    step: step.step,
    label: step.label,
    date: stepIndex >= index ? createdAt.toISOString() : null,
    done: stepIndex >= index,
  }));
};

export const formatOrderResponse = (order) => {
  if (!order) {
    return null;
  }

  const shippingAddress = parseShippingAddress(order.shippingAddress);
  const customerName =
    shippingAddress.firstName || shippingAddress.lastName
      ? `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim()
      : shippingAddress.name || 'Client';

  const items = (order.items || []).map((item) => ({
    id: item.id,
    orderId: item.orderId,
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    size: item.size,
    color: item.color,
    image: item.product?.image || item.image || null,
  }));

  return {
    ...order,
    date: order.createdAt.toISOString(),
    subtotal: order.total,
    shipping: 0,
    shippingAddress: {
      ...shippingAddress,
      name: customerName,
      postalCode: shippingAddress.postalCode || shippingAddress.zip || '',
    },
    paymentMethod: shippingAddress.paymentMethod || '—',
    customer: customerName,
    email: shippingAddress.email || '',
    items,
    timeline: buildOrderTimeline(order.status, order.createdAt),
  };
};
