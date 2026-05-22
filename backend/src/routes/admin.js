import { PrismaClient } from '@prisma/client';
import express from 'express';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Helper pour décoder le format d'adresse stocké en base de données
const formatOrderResponse = (order) => {
  if (!order) return null;
  
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
  };
};

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Récupérer toutes les commandes (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste de toutes les commandes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       401:
 *         description: Non authentifié ou pas administrateur
 */
// ── [ADMIN] Liste globale de toutes les commandes pour l'administration ──
router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    res.json(orders.map(formatOrderResponse));
  } catch (error) {
    console.error('Erreur de chargement de toutes les commandes :', error);
    res.status(500).json({ message: 'Erreur lors du chargement des commandes.' });
  }
});

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Récupérer les statistiques du tableau de bord (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques du tableau de bord
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRevenue:
 *                   type: number
 *                   example: 5000
 *                 totalOrders:
 *                   type: integer
 *                   example: 42
 *                 outOfStock:
 *                   type: integer
 *                   example: 2
 *                 lowStock:
 *                   type: integer
 *                   example: 5
 *                 avgBasket:
 *                   type: number
 *                   example: 119.05
 *                 salesByCategory:
 *                   type: object
 *                 monthly:
 *                   type: object
 *                 topProducts:
 *                   type: array
 *                 byStatus:
 *                   type: object
 */
// ── [ADMIN] Obtenir les statistiques du tableau de bord ──
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 1. Récupérer toutes les commandes non annulées et les produits
    const allOrders = await prisma.order.findMany({
      include: { items: { include: { product: true } } },
    });
    
    const allProducts = await prisma.product.findMany();

    const activeOrders = allOrders.filter(o => o.status !== 'cancelled');
    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = allOrders.length;
    
    // Niveaux de stocks
    const outOfStock = allProducts.filter(p => p.stock === 0).length;
    const lowStock = allProducts.filter(p => p.stock > 0 && p.stock <= 5).length;
    
    const avgBasket = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;

    // Ventes par catégorie
    const salesByCategory = {};
    // Ventes mensuelles (format YYYY-MM)
    const monthly = {};
    // Top produits
    const productSales = {};

    activeOrders.forEach(o => {
      // Statistiques mensuelles
      const monthStr = o.createdAt.toISOString().slice(0, 7); // "YYYY-MM"
      monthly[monthStr] = (monthly[monthStr] || 0) + o.total;

      // Détails par articles
      o.items.forEach(item => {
        const cat = item.product?.category || 'autre';
        
        // Catégorie
        if (!salesByCategory[cat]) {
          salesByCategory[cat] = { revenue: 0, qty: 0 };
        }
        salesByCategory[cat].revenue += item.price * item.quantity;
        salesByCategory[cat].qty += item.quantity;

        // Top produits
        if (!productSales[item.name]) {
          productSales[item.name] = { qty: 0, revenue: 0, image: item.product?.image || '/placeholder.jpg' };
        }
        productSales[item.name].qty += item.quantity;
        productSales[item.name].revenue += item.price * item.quantity;
      });
    });

    // Trier et formater les Top Produits
    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Commandes groupées par statut
    const byStatus = allOrders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalRevenue,
      totalOrders,
      outOfStock,
      lowStock,
      avgBasket,
      salesByCategory,
      monthly,
      topProducts,
      byStatus,
    });
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques admin :', error);
    res.status(500).json({ message: 'Une erreur est survenue lors du calcul des statistiques.' });
  }
});

export default router;
