import { PrismaClient } from '@prisma/client';
import express from 'express';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';

const router = express.Router();
const prisma = new PrismaClient();

// Helper pour formater un produit de la DB au format attendu par le frontend
const formatProductResponse = (product) => {
  if (!product) return null;
  return {
    ...product,
    sizes: product.sizes ? product.sizes.split(',').filter(Boolean) : [],
    colors: product.colors ? product.colors.split(',').filter(Boolean) : [],
    images: product.images ? product.images.split(',').filter(Boolean) : [product.image],
    reviewsList: product.reviews || [],
  };
};

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Récupérer tous les produits avec filtres
 *     tags: [Produits]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrer par catégorie
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par nom ou description
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Prix minimum
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Prix maximum
 *       - in: query
 *         name: isFeatured
 *         schema:
 *           type: boolean
 *         description: Produits en vedette uniquement
 *       - in: query
 *         name: isNew
 *         schema:
 *           type: boolean
 *         description: Nouveaux produits uniquement
 *     responses:
 *       200:
 *         description: Liste des produits
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
// ── Obtenir tous les produits (avec filtres & recherche) ──
router.get('/', async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, isFeatured, isNew } = req.query;

    const where = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    if (isFeatured === 'true') {
      where.isFeatured = true;
    }

    if (isNew === 'true') {
      where.isNew = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { category: { contains: search } },
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reviews: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const formattedProducts = products.map(formatProductResponse);
    res.json(formattedProducts);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits :', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des produits.' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Récupérer un produit par son ID
 *     tags: [Produits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du produit
 *     responses:
 *       200:
 *         description: Détails du produit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produit non trouvé
 */
// ── Obtenir un produit par son ID ──
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID produit invalide.' });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        reviews: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }

    res.json(formatProductResponse(product));
  } catch (error) {
    console.error('Erreur lors du chargement du produit :', error);
    res.status(500).json({ message: 'Une erreur est survenue lors du chargement du produit.' });
  }
});

/**
 * @swagger
 * /api/products/{id}/reviews:
 *   post:
 *     summary: Ajouter un avis sur un produit
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: Excellent produit !
 *     responses:
 *       201:
 *         description: Avis ajouté avec succès
 *       404:
 *         description: Produit non trouvé
 */
// ── Ajouter un avis client sur un produit ──
router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { rating, comment } = req.body;
    const author = req.user.firstName 
      ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() 
      : req.user.email;

    if (isNaN(productId)) {
      return res.status(400).json({ message: 'ID produit invalide.' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'La note (rating) doit être comprise entre 1 et 5.' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }

    // Créer l'avis
    const review = await prisma.review.create({
      data: {
        productId,
        author,
        rating: parseInt(rating),
        comment: comment || '',
        date: new Date().toLocaleDateString('fr-FR'),
      },
    });

    // Recalculer la note moyenne et le nombre d'avis
    const allReviews = await prisma.review.findMany({ where: { productId } });
    const count = allReviews.length;
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = parseFloat((totalRating / count).toFixed(1));

    // Mettre à jour le produit
    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: avgRating,
        reviewsCount: count,
      },
    });

    res.status(201).json({
      message: 'Avis ajouté avec succès !',
      review,
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'avis :', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de l\'ajout de l\'avis.' });
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Créer un nouveau produit (Admin)
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, price, category]
 *             properties:
 *               name:
 *                 type: string
 *                 example: T-Shirt Luxora
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *                 example: 29.99
 *               stock:
 *                 type: integer
 *                 example: 100
 *               category:
 *                 type: string
 *                 example: Vêtements
 *               image:
 *                 type: string
 *                 format: binary
 *               sizes:
 *                 type: string
 *                 example: S,M,L,XL
 *               colors:
 *                 type: string
 *                 example: Noir,Rouge,Bleu
 *     responses:
 *       201:
 *         description: Produit créé avec succès
 */
// ── [ADMIN] Créer un nouveau produit (avec image locale) ──
router.post('/', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, stock, category, sizes, colors } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ message: 'Le nom, le prix et la catégorie sont obligatoires.' });
    }

    // Gérer le fichier image chargé
    let imagePath = '/placeholder.jpg';
    if (req.file) {
      // Stocker le chemin relatif pour être servi de manière statique
      imagePath = `/uploads/${req.file.filename}`;
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || '',
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        category,
        image: imagePath,
        images: imagePath, // L'image principale est aussi dans la galerie
        sizes: sizes || '', // Déjà formaté en chaîne séparée par des virgules
        colors: colors || '',
        isNew: true,
        isFeatured: false,
      },
    });

    res.status(201).json({
      message: 'Produit créé avec succès !',
      product: formatProductResponse(product),
    });
  } catch (error) {
    console.error('Erreur de création de produit :', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la création du produit.' });
  }
});

// ── [ADMIN] Modifier un produit existant ──
/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Modifier un produit existant (Admin)
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du produit
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               category:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               sizes:
 *                 type: string
 *                 example: S,M,L,XL
 *               colors:
 *                 type: string
 *                 example: Noir,Rouge,Bleu
 *               isFeatured:
 *                 type: boolean
 *               isNew:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Produit mis a jour avec succes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produit non trouve
 */
router.put('/:id', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID produit invalide.' });
    }

    const { name, description, price, stock, category, sizes, colors, isFeatured, isNew } = req.body;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }

    const data = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (price) data.price = parseFloat(price);
    if (stock !== undefined) data.stock = parseInt(stock);
    if (category) data.category = category;
    if (sizes !== undefined) data.sizes = sizes;
    if (colors !== undefined) data.colors = colors;
    if (isFeatured !== undefined) data.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (isNew !== undefined) data.isNew = isNew === 'true' || isNew === true;

    // Si une nouvelle image est chargée
    if (req.file) {
      data.image = `/uploads/${req.file.filename}`;
      // On met également à jour la galerie d'images avec la nouvelle image principale
      data.images = `/uploads/${req.file.filename}`;
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
    });

    res.json({
      message: 'Produit mis à jour avec succès !',
      product: formatProductResponse(updated),
    });
  } catch (error) {
    console.error('Erreur lors de la modification du produit :', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la modification du produit.' });
  }
});

// ── [ADMIN] Supprimer un produit ──
/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Supprimer un produit (Admin)
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du produit
 *     responses:
 *       200:
 *         description: Produit supprime avec succes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       404:
 *         description: Produit non trouve
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID produit invalide.' });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }

    await prisma.product.delete({ where: { id } });

    res.json({ message: 'Produit supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur de suppression de produit :', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la suppression du produit.' });
  }
});

export default router;
