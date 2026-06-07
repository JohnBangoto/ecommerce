import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

const router = express.Router();

// All stock routes require admin
router.use(authenticateToken, requireAdmin);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const productIdParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
});

const stockListQuerySchema = z.object({
  search:   z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
  level:    z.enum(['all', 'ok', 'low', 'out']).optional().default('all'),
  page:     z.coerce.number().int().min(1).optional().default(1),
  limit:    z.coerce.number().int().min(1).max(100).optional().default(30),
});

const adjustStockSchema = z.object({
  // Either delta (±) OR newQty (absolute) — at least one required
  delta:   z.coerce.number().int().optional(),
  newQty:  z.coerce.number().int().min(0).optional(),
  type:    z.enum(['supply', 'adjustment', 'manual']).optional().default('adjustment'),
  note:    z.string().trim().max(500).optional(),
}).refine(
  (d) => d.delta !== undefined || d.newQty !== undefined,
  { message: 'Provide either delta or newQty.' },
);

const movementsQuerySchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
  type:      z.enum(['sale', 'supply', 'adjustment', 'manual', 'cancellation']).optional(),
  from:      z.string().datetime({ offset: true }).optional(),
  to:        z.string().datetime({ offset: true }).optional(),
  page:      z.coerce.number().int().min(1).optional().default(1),
  limit:     z.coerce.number().int().min(1).max(100).optional().default(50),
});

// ─── GET /api/admin/stock — Liste produits avec niveaux de stock ───────────────

/**
 * @swagger
 * /api/admin/stock:
 *   get:
 *     summary: List all products with stock levels
 *     description: Returns paginated product list with stock level indicator (ok/low/out). Filterable by search, category slug, and stock level.
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Filter by product name
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter by category slug
 *       - in: query
 *         name: level
 *         schema: { type: string, enum: [all, ok, low, out] }
 *         description: Filter by stock level
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: Paginated product stock list
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', validate({ query: stockListQuerySchema }), async (req, res) => {
  try {
    const { search, category, level, page, limit } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    if (level === 'out') {
      where.stock = 0;
    } else if (level === 'low') {
      // stock > 0 AND stock <= lowStockThreshold
      where.AND = [
        { stock: { gt: 0 } },
        // raw comparison: stock <= lowStockThreshold — must use a workaround via JS filter
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { stock: 'asc' },
        include: { category: true },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Apply low-stock JS filter (Prisma can't compare two columns in a where easily without raw)
    let filtered = products;
    if (level === 'low') {
      filtered = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold);
    } else if (level === 'ok') {
      filtered = products.filter((p) => p.stock > p.lowStockThreshold);
    }

    const formatted = filtered.map((p) => ({
      id:               p.id,
      name:             p.name,
      image:            p.image,
      category:         p.category?.name || '',
      categorySlug:     p.category?.slug || '',
      stock:            p.stock,
      lowStockThreshold: p.lowStockThreshold,
      level:            p.stock === 0 ? 'out' : p.stock <= p.lowStockThreshold ? 'low' : 'ok',
      isActive:         p.isActive,
    }));

    // Summary counters (global, not filtered)
    const allProducts = await prisma.product.findMany({ select: { stock: true, lowStockThreshold: true } });
    const summary = {
      out: allProducts.filter((p) => p.stock === 0).length,
      low: allProducts.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length,
      ok:  allProducts.filter((p) => p.stock > p.lowStockThreshold).length,
      total: allProducts.length,
    };

    return res.json({
      products: formatted,
      total: level === 'all' ? total : formatted.length,
      page,
      totalPages: Math.ceil((level === 'all' ? total : formatted.length) / limit),
      summary,
    });
  } catch (err) {
    console.error('Stock list error:', err);
    return res.status(500).json({ message: 'Unable to load stock data.' });
  }
});

// ─── GET /api/admin/stock/alerts — Produits en rupture ou sous seuil ──────────

/**
 * @swagger
 * /api/admin/stock/alerts:
 *   get:
 *     summary: Get low stock and out-of-stock product alerts
 *     description: Returns all products that are either out of stock or below their lowStockThreshold, sorted by criticality (out first, then low).
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of stock alerts
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/alerts', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { stock: 'asc' },
    });

    const alerts = products
      .filter((p) => p.stock === 0 || p.stock <= p.lowStockThreshold)
      .map((p) => ({
        id:               p.id,
        name:             p.name,
        image:            p.image,
        category:         p.category?.name || '',
        stock:            p.stock,
        lowStockThreshold: p.lowStockThreshold,
        level:            p.stock === 0 ? 'out' : 'low',
      }));

    return res.json({ alerts, total: alerts.length });
  } catch (err) {
    console.error('Stock alerts error:', err);
    return res.status(500).json({ message: 'Unable to load stock alerts.' });
  }
});

// ─── GET /api/admin/stock/movements — Historique paginé ──────────────────────

/**
 * @swagger
 * /api/admin/stock/movements:
 *   get:
 *     summary: Get paginated stock movement history
 *     description: Returns all stock movements (sales, supply, adjustments, cancellations) with optional filters.
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema: { type: integer }
 *         description: Filter by product ID
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [sale, supply, adjustment, manual, cancellation] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Paginated movement history
 */
router.get('/movements', validate({ query: movementsQuerySchema }), async (req, res) => {
  try {
    const { productId, type, from, to, page, limit } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (productId) where.productId = productId;
    if (type)      where.type = type;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return res.json({
      movements: movements.map((m) => ({
        id:          m.id,
        productId:   m.productId,
        productName: m.product?.name || '',
        productImage: m.product?.image || '',
        quantity:    m.quantity,
        type:        m.type,
        note:        m.note,
        createdAt:   m.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Stock movements error:', err);
    return res.status(500).json({ message: 'Unable to load stock movements.' });
  }
});

// ─── POST /api/admin/stock/:productId/adjust — Ajustement manuel ──────────────

/**
 * @swagger
 * /api/admin/stock/{productId}/adjust:
 *   post:
 *     summary: Manually adjust the stock of a product
 *     description: |
 *       Apply a stock adjustment by providing either:
 *       - `delta`: a relative change (e.g. +20, -5)
 *       - `newQty`: an absolute new stock value
 *
 *       Creates a StockMovement record and updates the product stock atomically.
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StockAdjustRequest'
 *     responses:
 *       200:
 *         description: Stock adjusted successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:productId/adjust', validate({ params: productIdParamSchema, body: adjustStockSchema }), async (req, res) => {
  try {
    const { productId } = req.params;
    const { delta, newQty, type, note } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const previousStock = product.stock;
    let finalStock;
    let movementQuantity;

    if (newQty !== undefined) {
      finalStock = newQty;
      movementQuantity = newQty - previousStock;
    } else {
      finalStock = Math.max(0, previousStock + delta);
      movementQuantity = finalStock - previousStock; // Clamp ensures delta may be different
    }

    if (finalStock === previousStock) {
      return res.status(400).json({ message: 'Stock value unchanged.' });
    }

    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { stock: finalStock },
        include: { category: true },
      }),
      prisma.stockMovement.create({
        data: {
          productId,
          quantity: movementQuantity,
          type,
          note: note || `Manual adjustment by admin (${movementQuantity > 0 ? '+' : ''}${movementQuantity})`,
        },
      }),
    ]);

    return res.json({
      message: 'Stock adjusted successfully.',
      previousStock,
      newStock: finalStock,
      delta: movementQuantity,
      product: {
        id:    updatedProduct.id,
        name:  updatedProduct.name,
        stock: updatedProduct.stock,
        level: updatedProduct.stock === 0 ? 'out'
             : updatedProduct.stock <= updatedProduct.lowStockThreshold ? 'low'
             : 'ok',
      },
      movement: {
        id:       movement.id,
        quantity: movement.quantity,
        type:     movement.type,
        note:     movement.note,
        createdAt: movement.createdAt,
      },
    });
  } catch (err) {
    console.error('Stock adjust error:', err);
    return res.status(500).json({ message: 'Unable to adjust stock.' });
  }
});

export default router;
