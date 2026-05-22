import { PrismaClient } from '@prisma/client';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Helper pour décoder le format d'adresse stocké en base de données
const formatOrderResponse = (order) => {
  if (!order) return null;
  
  // Formatage de la timeline
  const STEPS = ['confirmed', 'prepared', 'shipped', 'delivered'];
  const stepIdx = STEPS.indexOf(order.status);
  
  const timeline = [
    { step: 'confirmed', label: 'Commande confirmée', date: order.createdAt.toISOString(), done: true },
    { step: 'prepared',  label: 'Commande préparée',  date: stepIdx >= 1 ? order.createdAt.toISOString() : null, done: stepIdx >= 1 },
    { step: 'shipped',   label: 'Expédiée',           date: stepIdx >= 2 ? order.createdAt.toISOString() : null, done: stepIdx >= 2 },
    { step: 'delivered', label: 'Livrée',             date: stepIdx >= 3 ? order.createdAt.toISOString() : null, done: stepIdx >= 3 },
  ];

  let addressObj = {};
  try {
    addressObj = typeof order.shippingAddress === 'string' 
      ? JSON.parse(order.shippingAddress) 
      : order.shippingAddress;
  } catch (e) {
    addressObj = { address: order.shippingAddress };
  }

  return {
    ...order,
    shippingAddress: addressObj,
    customer: addressObj ? `${addressObj.firstName || ''} ${addressObj.lastName || ''}`.trim() : 'Client',
    email: addressObj?.email || 'client@email.com',
    timeline,
  };
};

/**
 * @swagger
 * /api/orders/checkout-simulated:
 *   post:
 *     summary: Créer une commande avec paiement simulé
 *     tags: [Commandes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, total, shippingAddress]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                     price:
 *                       type: number
 *               total:
 *                 type: number
 *                 example: 99.99
 *               shippingAddress:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   zip:
 *                     type: string
 *                   country:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   email:
 *                     type: string
 *     responses:
 *       201:
 *         description: Commande créée avec succès
 *       400:
 *         description: Données incomplètes ou stock insuffisant
 */
// ── Création de commande avec paiement simulé (Checkout) ──
// L'authentification est facultative pour permettre la commande en invité
router.post('/checkout-simulated', async (req, res) => {
  try {
    const { items, total, shippingAddress } = req.body;

    if (!items || items.length === 0 || !total || !shippingAddress) {
      return res.status(400).json({ message: 'Données de la commande incomplètes.' });
    }

    // Récupérer l'utilisateur s'il y a un token JWT valide
    let userId = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'luxora_super_secret_key_2026');
        userId = decoded.id;
      } catch (err) {
        // Ignorer l'erreur, l'utilisateur passera sa commande en invité
      }
    }

    // Générer l'ID de commande unique et le numéro de suivi
    const orderId = `CMD-${Date.now()}`;
    const trackingNumber = `SN${Math.random().toString().slice(2, 11)}`;

    // Démarrer une transaction Prisma pour créer la commande et décrémenter le stock
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Décrémenter les stocks de produits et vérifier la disponibilité
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new Error(`Produit ID ${item.productId} introuvable.`);
        }
        if (product.stock < item.quantity) {
          throw new Error(`Stock insuffisant pour le produit "${product.name}". Disponible : ${product.stock}`);
        }

        // Mettre à jour le stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: product.stock - item.quantity },
        });
      }

      // 2. Créer la commande
      const createdOrder = await tx.order.create({
        data: {
          id: orderId,
          userId,
          total: parseFloat(total),
          status: 'confirmed',
          paymentStatus: 'paid', // Simulé comme payé instantanément
          shippingAddress: JSON.stringify(shippingAddress),
          trackingNumber,
        },
      });

      // 3. Créer les lignes de commande (OrderItems)
      for (const item of items) {
        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: parseFloat(item.price),
            size: item.size || null,
            color: item.color || null,
          },
        });
      }

      return createdOrder;
    });

    // Recharger la commande avec ses relations
    const orderDetails = await prisma.order.findUnique({
      where: { id: newOrder.id },
      include: { items: true },
    });

    res.status(201).json({
      message: 'Commande validée et payée avec succès (Simulation) !',
      order: formatOrderResponse(orderDetails),
    });
  } catch (error) {
    console.error('Erreur lors du checkout simulé :', error);
    res.status(400).json({ message: error.message || 'Une erreur est survenue lors de la commande.' });
  }
});

/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Récupérer les commandes de l'utilisateur connecté
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des commandes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
// ── Obtenir les commandes de l'utilisateur connecté ──
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    res.json(orders.map(formatOrderResponse));
  } catch (error) {
    console.error('Erreur lors du chargement des commandes :', error);
    res.status(500).json({ message: 'Une erreur est survenue lors du chargement de vos commandes.' });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Récupérer une commande par son ID
 *     tags: [Commandes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID de la commande (ex: CMD-1234567890)"
 *     responses:
 *       200:
 *         description: Détails de la commande
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Commande non trouvée
 */
// ── Obtenir une commande par son ID (pour le suivi de commande) ──
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ message: 'Commande introuvable.' });
    }

    res.json(formatOrderResponse(order));
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande :', error);
    res.status(500).json({ message: 'Une erreur est survenue lors du chargement de la commande.' });
  }
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Mettre à jour le statut d'une commande (Admin)
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, prepared, shipped, delivered, cancelled]
 *                 example: shipped
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *       404:
 *         description: Commande non trouvée
 */
// ── [ADMIN] Mettre à jour le statut d'une commande ──
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const STEPS = ['confirmed', 'prepared', 'shipped', 'delivered', 'cancelled'];
    if (!STEPS.includes(status)) {
      return res.status(400).json({ message: 'Statut de commande invalide.' });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ message: 'Commande introuvable.' });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });

    res.json({
      message: 'Statut de la commande mis à jour !',
      order: formatOrderResponse(updated),
    });
  } catch (error) {
    console.error('Erreur de mise à jour du statut :', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la mise à jour de la commande.' });
  }
});

export default router;
