import express from 'express';
import { z } from 'zod';

import { formatOrderResponse } from '../lib/orders.js';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

const router = express.Router();

const adminProductQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
  isActive: z.enum(['true', 'false', 'all']).optional().default('all'),
  condition: z.enum(['new', 'used', 'refurbished', 'all']).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const formatAdminProduct = (product) => ({
  ...product,
  category: product.category?.slug || '',
  categoryId: product.categoryId,
  categoryName: product.category?.name || '',
  sizes: product.sizes ? product.sizes.split(',').map((v) => v.trim()).filter(Boolean) : [],
  colors: product.colors ? product.colors.split(',').map((v) => v.trim()).filter(Boolean) : [],
  images: product.images
    ? product.images.split(',').map((v) => v.trim()).filter(Boolean)
    : [product.image],
});

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

// ─── Stats schemas & helpers ──────────────────────────────────────────────────

const statsQuerySchema = z.object({
  from:        z.string().optional(),
  to:          z.string().optional(),
  granularity: z.enum(['day', 'week', 'month']).optional().default('month'),
});

const isoWeekKey = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const getPeriodKey = (date, granularity) => {
  if (granularity === 'day')  return date.toISOString().slice(0, 10);
  if (granularity === 'week') return isoWeekKey(date);
  return date.toISOString().slice(0, 7);
};

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Dashboard statistics with optional date range and granularity
 *     description: |
 *       Returns KPIs (revenue, orders, low stock, etc.), a time series for the
 *       selected period, top products, sales by category, recent orders, and
 *       unread message count.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *         description: Start date (ISO 8601). Defaults to 30 days ago.
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *         description: End date (ISO 8601). Defaults to today.
 *       - in: query
 *         name: granularity
 *         schema: { type: string, enum: [day, week, month], default: month }
 *         description: Time series grouping granularity
 *     responses:
 *       200:
 *         description: Full dashboard statistics object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminStats'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/stats', authenticateToken, requireAdmin, validate({ query: statsQuerySchema }), async (req, res) => {
  try {
    const { from, to, granularity } = req.query;

    // Default: last 30 days
    const toDate  = to   ? new Date(to)   : new Date();
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    toDate.setHours(23, 59, 59, 999);
    fromDate.setHours(0, 0, 0, 0);

    const [allOrders, allProducts, unreadMessages] = await Promise.all([
      prisma.order.findMany({
        include: {
          shippingAddress: true,
          items: {
            include: {
              product: {
                select: { image: true, category: true },
              },
            },
          },
        },
      }),
      prisma.product.findMany(),
      prisma.contactMessage.count({ where: { isRead: false } }),
    ]);

    const activeOrders = allOrders.filter((o) => o.status !== 'cancelled');
    const totalRevenue = activeOrders.reduce((s, o) => s + o.total, 0);
    const avgBasket = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;

    const outOfStock = allProducts.filter((p) => p.stock === 0).length;
    const lowStock   = allProducts.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;

    // ── Time series (within from/to) ─────────────────────────────────────────
    const periodOrders = allOrders.filter(
      (o) => o.createdAt >= fromDate && o.createdAt <= toDate && o.status !== 'cancelled',
    );

    const timeSeriesMap = {};
    for (const order of periodOrders) {
      const key = getPeriodKey(order.createdAt, granularity);
      if (!timeSeriesMap[key]) {
        timeSeriesMap[key] = { period: key, revenue: 0, orders: 0 };
      }
      timeSeriesMap[key].revenue += order.total;
      timeSeriesMap[key].orders  += 1;
    }
    const timeSeries = Object.values(timeSeriesMap).sort((a, b) => a.period.localeCompare(b.period));

    // ── Sales by category (all-time) ──────────────────────────────────────────
    const salesByCategory = {};
    const monthly = {};
    const daily   = {};
    const productSales = {};

    for (const order of activeOrders) {
      const dayKey   = order.createdAt.toISOString().slice(0, 10);
      const monthKey = order.createdAt.toISOString().slice(0, 7);
      daily[dayKey]     = (daily[dayKey]   || 0) + order.total;
      monthly[monthKey] = (monthly[monthKey] || 0) + order.total;

      for (const item of order.items) {
        const cat = item.product?.category?.slug || 'other';
        if (!salesByCategory[cat]) salesByCategory[cat] = { revenue: 0, qty: 0 };
        salesByCategory[cat].revenue += item.price * item.quantity;
        salesByCategory[cat].qty     += item.quantity;

        if (!productSales[item.name]) {
          productSales[item.name] = { qty: 0, revenue: 0, image: item.product?.image || null };
        }
        productSales[item.name].qty     += item.quantity;
        productSales[item.name].revenue += item.price * item.quantity;
      }
    }

    const topProducts = Object.entries(productSales)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const byStatus = allOrders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayOrders   = allOrders.filter((o) => o.createdAt >= startOfToday).length;
    const pendingOrders = allOrders.filter((o) => ['confirmed', 'prepared'].includes(o.status)).length;
    const orderCount    = periodOrders.length;

    return res.json({
      // Global KPIs
      totalRevenue,
      totalOrders: allOrders.length,
      outOfStock,
      lowStock,
      avgBasket,
      // Dashboard counters
      todayOrders,
      pendingOrders,
      unreadMessages,
      // Period stats
      from: fromDate.toISOString(),
      to:   toDate.toISOString(),
      granularity,
      orderCount,
      timeSeries,
      // Charts & tables
      salesByCategory,
      daily,
      monthly,
      topProducts,
      byStatus,
      recentOrders: [...allOrders]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5)
        .map(formatOrderResponse),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ message: 'Unable to calculate the dashboard statistics right now.' });
  }
});

/**
 * @swagger
 * /api/admin/products:
 *   get:
 *     summary: Retrieve products as administrator (all statuses, with filters and pagination)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/products', authenticateToken, requireAdmin, validate({ query: adminProductQuerySchema }), async (req, res) => {
  try {
    const { search, category, isActive, condition, page, limit } = req.query;
    const where = {};

    if (isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    if (condition && condition !== 'all') {
      where.condition = condition;
    }

    if (category && category !== 'all') {
      where.category = { slug: category };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { category: true },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({
      products: products.map(formatAdminProduct),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    });
  } catch (error) {
    console.error('Admin product list error:', error);
    return res.status(500).json({ message: 'Unable to load the products right now.' });
  }
});

export default router;
