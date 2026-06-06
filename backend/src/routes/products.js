import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { upload, uploadImageToSupabase, deleteImageFromSupabase } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';

const router = express.Router();

const productIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const productListQuerySchema = z.object({
  category: z.string().trim().max(60).optional(),
  search: z.string().trim().max(120).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  isFeatured: z.enum(['true', 'false']).optional(),
  isNew: z.enum(['true', 'false']).optional(),
});

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

const stringToBoolean = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return value === 'true';
};

const createProductSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(10000).optional().default(''),
  price: z.coerce.number().nonnegative(),
  stock: z.coerce.number().int().min(0).optional().default(0),
  categoryId: z.coerce.number().int().positive(),
  sizes: z.string().trim().max(500).optional().default(''),
  colors: z.string().trim().max(500).optional().default(''),
  condition: z.enum(['new', 'used', 'refurbished']).optional().default('new'),
  isActive: z.union([z.boolean(), z.enum(['true', 'false'])]).optional().default(true),
  lowStockThreshold: z.coerce.number().int().min(0).optional().default(5),
});

const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().max(10000).optional(),
    price: z.coerce.number().nonnegative().optional(),
    stock: z.coerce.number().int().min(0).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    sizes: z.string().trim().max(500).optional(),
    colors: z.string().trim().max(500).optional(),
    isFeatured: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
    isNew: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
    condition: z.enum(['new', 'used', 'refurbished']).optional(),
    isActive: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
    lowStockThreshold: z.coerce.number().int().min(0).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one product field must be provided.',
  });

const formatProductResponse = (product) => {
  if (!product) {
    return null;
  }

  return {
    ...product,
    category: product.category?.slug || product.category || '',
    sizes: product.sizes ? product.sizes.split(',').map((value) => value.trim()).filter(Boolean) : [],
    colors: product.colors ? product.colors.split(',').map((value) => value.trim()).filter(Boolean) : [],
    images: product.images
      ? product.images.split(',').map((value) => value.trim()).filter(Boolean)
      : [product.image],
    reviewsList: product.reviews || [],
  };
};

const includeProductRelations = {
  reviews: {
    orderBy: { createdAt: 'desc' },
  },
  category: true,
};

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Retrieve products with filters
 *     tags: [Produits]
 */
router.get('/', validate({ query: productListQuerySchema }), async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, isFeatured, isNew } = req.query;
    const where = {};

    if (category && category !== 'all') {
      where.category = { slug: category };
    }

    if (isFeatured === 'true') {
      where.isFeatured = true;
    }

    if (isNew === 'true') {
      where.isNew = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
        { category: { slug: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: includeProductRelations,
    });

    return res.json(products.map(formatProductResponse));
  } catch (error) {
    console.error('Product list error:', error);
    return res.status(500).json({ message: 'Unable to load the products right now.' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Retrieve a product by its id
 *     tags: [Produits]
 */
router.get('/:id', validate({ params: productIdSchema }), async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: includeProductRelations,
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    return res.json(formatProductResponse(product));
  } catch (error) {
    console.error('Product detail error:', error);
    return res.status(500).json({ message: 'Unable to load the product right now.' });
  }
});

/**
 * @swagger
 * /api/products/{id}/reviews:
 *   post:
 *     summary: Add a review to a product
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/reviews', authenticateToken, validate({ params: productIdSchema, body: reviewSchema }), async (req, res) => {
  try {
    const [product, user] = await Promise.all([
      prisma.product.findUnique({ where: { id: req.params.id } }),
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { firstName: true, lastName: true, email: true },
      }),
    ]);

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const author =
      user.firstName || user.lastName
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : user.email;

    const review = await prisma.review.create({
      data: {
        productId: req.params.id,
        author,
        rating: req.body.rating,
        comment: req.body.comment || '',
        date: new Date().toLocaleDateString('fr-FR'),
      },
    });

    const allReviews = await prisma.review.findMany({
      where: { productId: req.params.id },
      select: { rating: true },
    });

    const reviewsCount = allReviews.length;
    const rating = Number(
      (allReviews.reduce((sum, entry) => sum + entry.rating, 0) / reviewsCount).toFixed(1),
    );

    await prisma.product.update({
      where: { id: req.params.id },
      data: {
        rating,
        reviewsCount,
      },
    });

    return res.status(201).json({
      message: 'Review added successfully.',
      review,
    });
  } catch (error) {
    console.error('Review creation error:', error);
    return res.status(500).json({ message: 'Unable to add the review right now.' });
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a product as an administrator
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  upload.single('image'),
  validate({ body: createProductSchema }),
  async (req, res) => {
    try {
      let imagePath = '/placeholder.jpg';
      if (req.file) {
        imagePath = await uploadImageToSupabase(req.file);
      }

      const product = await prisma.product.create({
        data: {
          name: req.body.name,
          description: req.body.description,
          price: Number(req.body.price),
          stock: Number(req.body.stock || 0),
          categoryId: Number(req.body.categoryId),
          image: imagePath,
          images: imagePath,
          sizes: req.body.sizes,
          colors: req.body.colors,
          isNew: true,
          isFeatured: false,
          condition: req.body.condition || 'new',
          isActive: stringToBoolean(req.body.isActive) !== false,
          lowStockThreshold: Number(req.body.lowStockThreshold || 5),
        },
        include: includeProductRelations,
      });

      if (product.stock > 0) {
        await prisma.stockMovement.create({
          data: {
            productId: product.id,
            quantity: product.stock,
            type: 'supply',
            note: 'Initial stock on creation',
          },
        });
      }

      return res.status(201).json({
        message: 'Product created successfully.',
        product: formatProductResponse(product),
      });
    } catch (error) {
      console.error('Product creation error:', error);
      return res.status(500).json({ message: 'Unable to create the product right now.' });
    }
  },
);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product as an administrator
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  upload.single('image'),
  validate({ params: productIdSchema, body: updateProductSchema }),
  async (req, res) => {
    try {
      const existingProduct = await prisma.product.findUnique({
        where: { id: req.params.id },
      });

      if (!existingProduct) {
        return res.status(404).json({ message: 'Product not found.' });
      }

      const data = {};
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.description !== undefined) data.description = req.body.description;
      if (req.body.price !== undefined) data.price = Number(req.body.price);
      if (req.body.categoryId !== undefined) data.categoryId = Number(req.body.categoryId);
      if (req.body.sizes !== undefined) data.sizes = req.body.sizes;
      if (req.body.colors !== undefined) data.colors = req.body.colors;
      if (req.body.isFeatured !== undefined) data.isFeatured = stringToBoolean(req.body.isFeatured);
      if (req.body.isNew !== undefined) data.isNew = stringToBoolean(req.body.isNew);
      if (req.body.condition !== undefined) data.condition = req.body.condition;
      if (req.body.isActive !== undefined) data.isActive = stringToBoolean(req.body.isActive);
      if (req.body.lowStockThreshold !== undefined) data.lowStockThreshold = Number(req.body.lowStockThreshold);

      let stockDiff = 0;
      if (req.body.stock !== undefined) {
        const newStock = Number(req.body.stock);
        stockDiff = newStock - existingProduct.stock;
        data.stock = newStock;
      }

      if (req.file) {
        if (existingProduct.image && existingProduct.image !== '/placeholder.jpg') {
          await deleteImageFromSupabase(existingProduct.image);
        }
        data.image = await uploadImageToSupabase(req.file);
        data.images = data.image;
      }

      const updatedProduct = await prisma.product.update({
        where: { id: req.params.id },
        data,
        include: includeProductRelations,
      });

      if (stockDiff !== 0) {
        await prisma.stockMovement.create({
          data: {
            productId: updatedProduct.id,
            quantity: stockDiff,
            type: stockDiff > 0 ? 'supply' : 'adjustment',
            note: `Stock updated from dashboard (was ${existingProduct.stock}, now ${updatedProduct.stock})`,
          },
        });
      }

      return res.json({
        message: 'Product updated successfully.',
        product: formatProductResponse(updatedProduct),
      });
    } catch (error) {
      console.error('Product update error:', error);
      return res.status(500).json({ message: 'Unable to update the product right now.' });
    }
  },
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product as an administrator
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticateToken, requireAdmin, validate({ params: productIdSchema }), async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    if (product.image && product.image !== '/placeholder.jpg') {
      await deleteImageFromSupabase(product.image);
    }

    await prisma.product.delete({
      where: { id: req.params.id },
    });

    return res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Product deletion error:', error);
    return res.status(500).json({ message: 'Unable to delete the product right now.' });
  }
});

export default router;
