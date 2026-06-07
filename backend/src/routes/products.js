import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { upload, uploadImagesToSupabase, deleteImageFromSupabase, deleteImagesFromSupabase } from '../middlewares/upload.js';
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
  condition: z.enum(['new', 'used', 'refurbished']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(24),
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
  isFeatured: z.union([z.boolean(), z.enum(['true', 'false'])]).optional().default(false),
  isNew: z.union([z.boolean(), z.enum(['true', 'false'])]).optional().default(true),
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
    // Permet de préciser quelles images existantes garder (URLs CSV)
    keepImages: z.string().optional(),
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
    categoryId: product.categoryId,
    categoryName: product.category?.name || '',
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
 *     summary: Retrieve products with filters and pagination
 *     tags: [Produits]
 */
router.get('/', validate({ query: productListQuerySchema }), async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, isFeatured, isNew, condition, isActive, page, limit } = req.query;
    const where = {};

    // Par défaut, le catalogue public ne montre que les produits actifs
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    } else {
      where.isActive = true;
    }

    if (category && category !== 'all') {
      where.category = { slug: category };
    }

    if (isFeatured === 'true') {
      where.isFeatured = true;
    }

    if (isNew === 'true') {
      where.isNew = true;
    }

    if (condition) {
      where.condition = condition;
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

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: includeProductRelations,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({
      products: products.map(formatProductResponse),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    });
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
  upload.array('images', 10),
  validate({ body: createProductSchema }),
  async (req, res) => {
    try {
      let imageUrls = [];

      if (req.files && req.files.length > 0) {
        imageUrls = await uploadImagesToSupabase(req.files);
      }

      const imagePath = imageUrls.length > 0 ? imageUrls[0] : '/placeholder.jpg';
      const imagesCSV = imageUrls.length > 0 ? imageUrls.join(',') : imagePath;

      const product = await prisma.product.create({
        data: {
          name: req.body.name,
          description: req.body.description,
          price: Number(req.body.price),
          stock: Number(req.body.stock || 0),
          categoryId: Number(req.body.categoryId),
          image: imagePath,
          images: imagesCSV,
          sizes: req.body.sizes,
          colors: req.body.colors,
          isNew: stringToBoolean(req.body.isNew) !== false,
          isFeatured: stringToBoolean(req.body.isFeatured) === true,
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
  upload.array('images', 10),
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

      // Gestion des images : conserver les existantes + ajouter les nouvelles
      const existingImages = existingProduct.images
        ? existingProduct.images.split(',').map((u) => u.trim()).filter(Boolean)
        : [existingProduct.image].filter(Boolean);

      // keepImages = liste CSV des URLs existantes à conserver
      let keptImages = existingImages;
      if (req.body.keepImages !== undefined) {
        const keepList = req.body.keepImages.split(',').map((u) => u.trim()).filter(Boolean);
        // Supprimer de Supabase les images supprimées
        const removedImages = existingImages.filter((url) => !keepList.includes(url));
        if (removedImages.length > 0) {
          await deleteImagesFromSupabase(removedImages);
        }
        keptImages = keepList;
      }

      // Uploader les nouvelles images
      let newImageUrls = [];
      if (req.files && req.files.length > 0) {
        newImageUrls = await uploadImagesToSupabase(req.files);
      }

      const allImages = [...keptImages, ...newImageUrls];

      if (allImages.length > 0) {
        data.images = allImages.join(',');
        data.image = allImages[0];
      } else if (existingImages.length === 0) {
        data.image = '/placeholder.jpg';
        data.images = '/placeholder.jpg';
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

    // Supprimer toutes les images du produit sur Supabase
    const imageUrls = product.images
      ? product.images.split(',').map((u) => u.trim()).filter(Boolean)
      : [product.image].filter(Boolean);

    await deleteImagesFromSupabase(imageUrls);

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
