import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

const router = express.Router();

const categoryIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets.')
    .optional(),
});

const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets.')
      .optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one category field must be provided.',
  });

/**
 * Génère un slug à partir d'un nom (normalisation basique).
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprimer les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Retrieve all categories with product count
 *     tags: [Catégories]
 */
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return res.json(
      categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        productCount: cat._count.products,
        createdAt: cat.createdAt,
      })),
    );
  } catch (error) {
    console.error('Category list error:', error);
    return res.status(500).json({ message: 'Unable to load categories right now.' });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Retrieve a single category
 *     tags: [Catégories]
 */
router.get('/:id', validate({ params: categoryIdSchema }), async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    return res.json({
      id: category.id,
      name: category.name,
      slug: category.slug,
      productCount: category._count.products,
      createdAt: category.createdAt,
    });
  } catch (error) {
    console.error('Category detail error:', error);
    return res.status(500).json({ message: 'Unable to load the category right now.' });
  }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a category as an administrator
 *     tags: [Catégories]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  validate({ body: createCategorySchema }),
  async (req, res) => {
    try {
      const slug = req.body.slug || generateSlug(req.body.name);

      // Vérifier l'unicité du nom et du slug
      const existing = await prisma.category.findFirst({
        where: { OR: [{ name: req.body.name }, { slug }] },
      });

      if (existing) {
        return res.status(409).json({
          message: existing.name === req.body.name
            ? 'Une catégorie avec ce nom existe déjà.'
            : 'Une catégorie avec ce slug existe déjà.',
        });
      }

      const category = await prisma.category.create({
        data: {
          name: req.body.name,
          slug,
        },
        include: {
          _count: { select: { products: true } },
        },
      });

      return res.status(201).json({
        message: 'Category created successfully.',
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          productCount: category._count.products,
          createdAt: category.createdAt,
        },
      });
    } catch (error) {
      console.error('Category creation error:', error);
      return res.status(500).json({ message: 'Unable to create the category right now.' });
    }
  },
);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category as an administrator
 *     tags: [Catégories]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  validate({ params: categoryIdSchema, body: updateCategorySchema }),
  async (req, res) => {
    try {
      const existing = await prisma.category.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        return res.status(404).json({ message: 'Category not found.' });
      }

      const data = {};
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.slug !== undefined) data.slug = req.body.slug;

      // Si on change le nom sans changer le slug, régénérer le slug
      if (req.body.name && !req.body.slug) {
        data.slug = generateSlug(req.body.name);
      }

      // Vérifier les conflits (en excluant la catégorie courante)
      if (data.name || data.slug) {
        const conflict = await prisma.category.findFirst({
          where: {
            AND: [
              { id: { not: req.params.id } },
              { OR: [data.name ? { name: data.name } : {}, data.slug ? { slug: data.slug } : {}] },
            ],
          },
        });

        if (conflict) {
          return res.status(409).json({ message: 'Une catégorie avec ce nom ou ce slug existe déjà.' });
        }
      }

      const updated = await prisma.category.update({
        where: { id: req.params.id },
        data,
        include: {
          _count: { select: { products: true } },
        },
      });

      return res.json({
        message: 'Category updated successfully.',
        category: {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          productCount: updated._count.products,
          createdAt: updated.createdAt,
        },
      });
    } catch (error) {
      console.error('Category update error:', error);
      return res.status(500).json({ message: 'Unable to update the category right now.' });
    }
  },
);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category as an administrator
 *     tags: [Catégories]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  validate({ params: categoryIdSchema }),
  async (req, res) => {
    try {
      const category = await prisma.category.findUnique({
        where: { id: req.params.id },
        include: { _count: { select: { products: true } } },
      });

      if (!category) {
        return res.status(404).json({ message: 'Category not found.' });
      }

      if (category._count.products > 0) {
        return res.status(409).json({
          message: `Impossible de supprimer : cette catégorie contient ${category._count.products} produit(s). Réaffectez-les d'abord.`,
        });
      }

      await prisma.category.delete({ where: { id: req.params.id } });

      return res.json({ message: 'Category deleted successfully.' });
    } catch (error) {
      console.error('Category deletion error:', error);
      return res.status(500).json({ message: 'Unable to delete the category right now.' });
    }
  },
);

export default router;
