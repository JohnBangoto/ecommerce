import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

const hashTrackingToken = (value) => crypto.createHash('sha256').update(value).digest('hex');

const buildProduct = (data) => ({
  description: '',
  stock: 0,
  sizes: '',
  colors: '',
  rating: 4.5,
  reviewsCount: 0,
  isFeatured: false,
  isNew: false,
  ...data,
  images: data.images || data.image,
});

async function main() {
  console.log('Checking database state...');

  // ─── Seed idempotent ────────────────────────────────────────────────────────
  // On vérifie si des données existent déjà.
  // Si oui, on n'écrase rien — les données de production sont préservées.
  const [userCount, productCount] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
  ]);

  if (userCount > 0 && productCount > 0) {
    console.log(
      `Database already seeded (${userCount} users, ${productCount} products). Skipping seed to preserve existing data.`,
    );
    return;
  }

  console.log('Empty database detected. Running initial seed...');

  // ─── Création du compte admin ────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@luxora.com';
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ||
    (process.env.NODE_ENV === 'development' ? 'passer1234' : null);

  if (!adminPassword) {
    throw new Error('SEED_ADMIN_PASSWORD is required outside development.');
  }

  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn(
      'SEED_ADMIN_PASSWORD is not set. Using the development fallback password for the admin account.',
    );
  }

  // Créer l'admin uniquement s'il n'existe pas encore
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail.toLowerCase() } });

  if (!existingAdmin) {
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail.toLowerCase(),
        passwordHash: adminPasswordHash,
        firstName: 'Admin',
        lastName: 'Luxora',
        role: 'admin',
      },
    });
    console.log(`Created admin account: ${admin.email}`);
  } else {
    console.log(`Admin account already exists: ${existingAdmin.email}`);
  }

  // Créer le compte client de démo uniquement s'il n'existe pas encore
  const existingCustomer = await prisma.user.findUnique({ where: { email: 'client@luxora.com' } });

  if (!existingCustomer) {
    const customerPasswordHash = await bcrypt.hash('Client123!Demo', 12);
    const customer = await prisma.user.create({
      data: {
        email: 'client@luxora.com',
        passwordHash: customerPasswordHash,
        firstName: 'Amadou',
        lastName: 'Diallo',
        role: 'customer',
      },
    });
    console.log(`Created customer account: ${customer.email}`);
  }

  // ─── Création des catégories ────────────────────────────────────────────────
  const categoriesData = [
    { name: 'Mode', slug: 'mode' },
    { name: 'Électronique', slug: 'electronique' },
    { name: 'Maison', slug: 'maison' },
    { name: 'Beauté', slug: 'beaute' },
    { name: 'Sport', slug: 'sport' },
    { name: 'Alimentation', slug: 'alimentation' },
  ];

  console.log('Seeding categories...');
  const categoryMap = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categoryMap[cat.slug] = created.id;
  }

  // ─── Création des produits ───────────────────────────────────────────────────
  // On n'insère des produits que si la table est vide
  if (productCount === 0) {
    const products = [
      buildProduct({
        name: 'Veste en Cuir Artisanale',
        categoryId: categoryMap['mode'],
        price: 190000,
        stock: 15,
        isFeatured: true,
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80',
        description: 'Veste en cuir veritable, coupe ajustee, fabrication artisanale.',
        sizes: 'S,M,L,XL',
        colors: 'Noir,Marron,Cognac',
        rating: 4.8,
        reviewsCount: 12,
      }),
      buildProduct({
        name: 'Montre Connectee Elite',
        categoryId: categoryMap['electronique'],
        price: 261000,
        stock: 10,
        isFeatured: true,
        isNew: true,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
        description: 'Montre connectee avec GPS, suivi sante et autonomie prolongee.',
        colors: 'Noir,Argent,Or',
        rating: 4.7,
        reviewsCount: 8,
      }),
      buildProduct({
        name: 'Bougie Parfumee Artisanale',
        categoryId: categoryMap['maison'],
        price: 25000,
        stock: 50,
        isFeatured: true,
        image: 'https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=600&q=80',
        description: 'Bougie en cire de soja avec parfum naturel longue duree.',
        colors: 'Vanille-Ambre,Rose-Patchouli,Cedre-Encens',
        rating: 4.8,
        reviewsCount: 15,
      }),
      buildProduct({
        name: 'Serum Visage Anti-age',
        categoryId: categoryMap['beaute'],
        price: 51000,
        stock: 35,
        isFeatured: true,
        image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80',
        description: 'Serum a la vitamine C et acide hyaluronique.',
        rating: 4.8,
        reviewsCount: 9,
      }),
      buildProduct({
        name: 'Tapis de Yoga Premium',
        categoryId: categoryMap['sport'],
        price: 58500,
        stock: 28,
        image: 'https://images.unsplash.com/photo-1601925228998-a5ae3f12b6a2?w=600&q=80',
        description: 'Tapis en caoutchouc naturel avec excellente adherence.',
        colors: 'Noir,Vert foret,Terracotta',
        rating: 4.7,
        reviewsCount: 11,
      }),
      buildProduct({
        name: 'Coffret Thes Grands Crus',
        categoryId: categoryMap['alimentation'],
        price: 36000,
        stock: 45,
        isFeatured: true,
        image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=80',
        description: 'Selection premium de thés rares en coffret cadeau.',
        rating: 4.9,
        reviewsCount: 7,
      }),
    ];

    const createdProducts = [];
    for (const product of products) {
      const created = await prisma.product.create({ data: product });
      createdProducts.push(created);
      
      // Mouvement de stock initial
      await prisma.stockMovement.create({
        data: {
          productId: created.id,
          quantity: created.stock,
          type: 'supply',
          note: 'Initial stock seeding',
        },
      });
    }

    const reviewData = [
      {
        productId: createdProducts[0].id,
        author: 'Fatou Sy',
        rating: 5,
        comment: 'Tres belle qualite, finitions impeccables.',
      },
      {
        productId: createdProducts[1].id,
        author: 'Moussa Ndiaye',
        rating: 4,
        comment: 'Montre elegante et complete, autonomie solide.',
      },
      {
        productId: createdProducts[2].id,
        author: 'Awa Diop',
        rating: 5,
        comment: 'Parfum delicat et tres bonne tenue.',
      },
    ];

    for (const review of reviewData) {
      await prisma.review.create({
        data: {
          ...review,
          date: new Date().toLocaleDateString('fr-FR'),
        },
      });
    }

    console.log(`Seeded ${createdProducts.length} products with stock movements.`);
    console.log(`Seeded ${reviewData.length} reviews.`);
  }

  console.log('Database seed completed successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
