import crypto from 'crypto';
import express from 'express';
import { z } from 'zod';
import { formatOrderResponse, ORDER_STATUSES } from '../lib/orders.js';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, getOptionalAuthenticatedUser, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

const router = express.Router();

const orderIdSchema = z.object({
  id: z.string().trim().min(3).max(80),
});

const trackOrderQuerySchema = z.object({
  token: z.string().trim().min(16).max(128),
});

const shippingAddressSchema = z.object({
  firstName: z.string({ error: 'Le prénom est requis.' }).trim().min(1, 'Le prénom est requis.').max(100),
  lastName:  z.string({ error: 'Le nom est requis.' }).trim().min(1, 'Le nom est requis.').max(100),
  address:   z.string({ error: "L'adresse est requise." }).trim().min(2, "L'adresse est trop courte.").max(255),
  city:      z.string({ error: 'La ville est requise.' }).trim().min(1, 'La ville est requise.').max(120),
  zip:       z.string().trim().max(20).optional(),
  country:   z.string({ error: 'Le pays est requis.' }).trim().min(1, 'Le pays est requis.').max(120),
  // phone est totalement optionnel — on accepte undefined, null, ou chaîne vide
  phone: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? undefined : String(val).trim()),
    z.string().max(30).optional(),
  ),
  email: z.string({ error: "L'email est requis." }).trim().email("Format d'email invalide.").max(255).transform((v) => v.toLowerCase()),
});

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        quantity:  z.coerce.number().int().positive().max(100),
        size:  z.preprocess((v) => (v == null || v === '' ? undefined : String(v)), z.string().max(50).optional()),
        color: z.preprocess((v) => (v == null || v === '' ? undefined : String(v)), z.string().max(50).optional()),
      }),
    )
    .min(1, 'Le panier est vide.')
    .max(50),
  shippingAddress: shippingAddressSchema,
  paymentMethod:   z.string().trim().max(50).optional(),
  total:           z.coerce.number().nonnegative().optional(),
});

const statusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

const buildOrderId = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = crypto.randomUUID().split('-')[0].toUpperCase();
  return `CMD-${datePart}-${suffix}`;
};

const buildTrackingNumber = () => `TRK-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
const hashTrackingToken = (value) => crypto.createHash('sha256').update(value).digest('hex');

const loadOrderById = (id) =>
  prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      shippingAddress: true,
      items: {
        include: {
          product: {
            select: {
              image: true,
              category: true,
            },
          },
        },
      },
    },
  });

/**
 * @swagger
 * /api/orders/checkout-simulated:
 *   post:
 *     summary: Create an order with simulated payment
 *     tags: [Commandes]
 */
router.post('/checkout-simulated', validate({ body: checkoutSchema }), async (req, res) => {
  try {
    const optionalUser = await getOptionalAuthenticatedUser(req);
    const { items, shippingAddress } = req.body;

    if (req.headers.authorization && !optionalUser) {
      return res.status(401).json({ message: 'Votre session a expiré. Veuillez vous reconnecter.' });
    }

    const finalUserId = optionalUser ? optionalUser.id : null;

    const orderId = buildOrderId();
    const trackingNumber = buildTrackingNumber();
    const trackingToken = crypto.randomBytes(24).toString('hex');
    const trackingAccessHash = hashTrackingToken(trackingToken);

    const newOrder = await prisma.$transaction(async (tx) => {
      const resolvedItems = [];
      let computedTotal = 0;

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product ${item.productId} was not found.`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}.`);
        }

        const lineTotal = product.price * item.quantity;
        computedTotal += lineTotal;

        // Update product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: product.stock - item.quantity,
          },
        });

        // Create stock movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: -item.quantity,
            type: 'sale',
            note: `Order ${orderId}`,
          },
        });

        resolvedItems.push({
          orderId,
          productId: product.id,
          name: product.name,
          quantity: item.quantity,
          price: product.price,
          size: item.size || null,
          color: item.color || null,
        });
      }

      await tx.order.create({
        data: {
          id: orderId,
          userId: finalUserId,
          total: Number(computedTotal.toFixed(2)),
          status: 'confirmed',
          paymentStatus: 'paid',
          shippingAddress: {
            create: {
              firstName: shippingAddress.firstName,
              lastName: shippingAddress.lastName,
              address: shippingAddress.address,
              city: shippingAddress.city,
              zip: shippingAddress.zip || null,
              country: shippingAddress.country,
              phone: shippingAddress.phone || null,
              email: shippingAddress.email,
            },
          },
          trackingNumber,
          trackingAccessHash,
        },
      });

      await tx.orderItem.createMany({
        data: resolvedItems,
      });

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          shippingAddress: true,
          items: {
            include: {
              product: {
                select: {
                  image: true,
                  category: true,
                },
              },
            },
          },
        },
      });
    });

    return res.status(201).json({
      message: 'Order created successfully.',
      order: {
        ...formatOrderResponse(newOrder),
        trackingToken,
      },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(400).json({
      message: error.message || 'Unable to create the order right now.',
    });
  }
});

/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Retrieve the authenticated user orders
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        shippingAddress: true,
        items: {
          include: {
            product: {
              select: {
                image: true,
                category: true,
              },
            },
          },
        },
      },
    });

    return res.json(orders.map(formatOrderResponse));
  } catch (error) {
    console.error('Failed to load user orders:', error);
    return res.status(500).json({ message: 'Unable to load the order history right now.' });
  }
});

/**
 * @swagger
 * /api/orders/track/{id}:
 *   get:
 *     summary: Track a guest order with a secure token
 *     tags: [Commandes]
 */
router.get('/track/:id', validate({ params: orderIdSchema, query: trackOrderQuerySchema }), async (req, res) => {
  try {
    const order = await loadOrderById(req.params.id);

    if (!order || !order.trackingAccessHash) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const providedHash = hashTrackingToken(req.query.token);
    if (providedHash !== order.trackingAccessHash) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    return res.json(formatOrderResponse(order));
  } catch (error) {
    console.error('Guest tracking error:', error);
    return res.status(500).json({ message: 'Unable to load the order right now.' });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Retrieve an order for its owner or an administrator
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticateToken, validate({ params: orderIdSchema }), async (req, res) => {
  try {
    const order = await loadOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = order.userId && order.userId === req.user.id;

    if (!isAdmin && !isOwner) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    return res.json(formatOrderResponse(order));
  } catch (error) {
    console.error('Order detail error:', error);
    return res.status(500).json({ message: 'Unable to load the order right now.' });
  }
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update an order status as an administrator
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id/status',
  authenticateToken,
  requireAdmin,
  validate({ params: orderIdSchema, body: statusUpdateSchema }),
  async (req, res) => {
    try {
      const order = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: {
          items: true,
        },
      });

      if (!order) {
        return res.status(404).json({ message: 'Order not found.' });
      }

      const previousStatus = order.status;
      const newStatus = req.body.status;

      // ── Stock restoration on cancellation ──────────────────────────────────
      const isCancelling = newStatus === 'cancelled' && previousStatus !== 'cancelled';

      const updatedOrder = await prisma.$transaction(async (tx) => {
        if (isCancelling) {
          for (const item of order.items) {
            // Restore stock
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
            // Record movement
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                quantity: item.quantity, // positive = returned to stock
                type: 'cancellation',
                note: `Order ${order.id} cancelled`,
              },
            });
          }
        }

        return tx.order.update({
          where: { id: req.params.id },
          data: { status: newStatus },
          include: {
            shippingAddress: true,
            items: {
              include: {
                product: {
                  select: {
                    image: true,
                    category: true,
                  },
                },
              },
            },
          },
        });
      });

      return res.json({
        message: 'Order status updated successfully.',
        order: formatOrderResponse(updatedOrder),
        stockRestored: isCancelling,
      });
    } catch (error) {
      console.error('Order status update error:', error);
      return res.status(500).json({ message: 'Unable to update the order status right now.' });
    }
  },
);

export default router;
