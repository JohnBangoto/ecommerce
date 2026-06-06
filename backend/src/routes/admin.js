import express from 'express';
import { env } from '../config/env.js';
import { formatOrderResponse } from '../lib/orders.js';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Retrieve every order as an administrator
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
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

    return res.json(orders.map(formatOrderResponse));
  } catch (error) {
    console.error('Admin order list error:', error);
    return res.status(500).json({ message: 'Unable to load the orders right now.' });
  }
});

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Retrieve the main administrator dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [allOrders, allProducts] = await Promise.all([
      prisma.order.findMany({
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
      }),
      prisma.product.findMany(),
    ]);

    const activeOrders = allOrders.filter((order) => order.status !== 'cancelled');
    const totalRevenue = activeOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = allOrders.length;
    const outOfStock = allProducts.filter((product) => product.stock === 0).length;
    const lowStock = allProducts.filter(
      (product) => product.stock > 0 && product.stock <= product.lowStockThreshold,
    ).length;
    const avgBasket = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;

    const salesByCategory = {};
    const monthly = {};
    const daily = {};
    const productSales = {};

    for (const order of activeOrders) {
      const dayKey = order.createdAt.toISOString().slice(0, 10);
      const monthKey = order.createdAt.toISOString().slice(0, 7);

      daily[dayKey] = (daily[dayKey] || 0) + order.total;
      monthly[monthKey] = (monthly[monthKey] || 0) + order.total;

      for (const item of order.items) {
        const category = item.product?.category?.slug || 'other';

        if (!salesByCategory[category]) {
          salesByCategory[category] = { revenue: 0, qty: 0 };
        }

        salesByCategory[category].revenue += item.price * item.quantity;
        salesByCategory[category].qty += item.quantity;

        if (!productSales[item.name]) {
          productSales[item.name] = {
            qty: 0,
            revenue: 0,
            image: item.product?.image || null,
          };
        }

        productSales[item.name].qty += item.quantity;
        productSales[item.name].revenue += item.price * item.quantity;
      }
    }

    const topProducts = Object.entries(productSales)
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const byStatus = allOrders.reduce((accumulator, order) => {
      accumulator[order.status] = (accumulator[order.status] || 0) + 1;
      return accumulator;
    }, {});

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayOrders = allOrders.filter((order) => order.createdAt >= startOfToday).length;
    const pendingOrders = allOrders.filter((order) =>
      ['confirmed', 'prepared'].includes(order.status),
    ).length;

    return res.json({
      totalRevenue,
      totalOrders,
      outOfStock,
      lowStock,
      avgBasket,
      salesByCategory,
      daily,
      monthly,
      topProducts,
      byStatus,
      todayOrders,
      pendingOrders,
      recentOrders: allOrders
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5)
        .map(formatOrderResponse),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ message: 'Unable to calculate the dashboard statistics right now.' });
  }
});

export default router;
