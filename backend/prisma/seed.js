import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Début du peuplement de la base de données (seeding)...');

  // 1. Nettoyer la base de données
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  console.log('Anciennes données supprimées.');

  // 2. Création des utilisateurs
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const clientPasswordHash = await bcrypt.hash('client123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@luxora.com',
      passwordHash: adminPasswordHash,
      firstName: 'Directeur',
      lastName: 'Luxora',
      role: 'admin',
    },
  });

  // Admin supplémentaire de secours (identifiants: admin / admin)
  const adminSimpleHash = await bcrypt.hash('admin', 10);
  const adminFallback = await prisma.user.create({
    data: {
      email: 'admin',
      passwordHash: adminSimpleHash,
      firstName: 'Admin',
      lastName: 'Backup',
      role: 'admin',
    },
  });

  const client = await prisma.user.create({
    data: {
      email: 'client@luxora.com',
      passwordHash: clientPasswordHash,
      firstName: 'Amadou',
      lastName: 'Diallo',
      role: 'customer',
    },
  });

  console.log('Utilisateurs créés :', { admin: admin.email, client: client.email });

  // 3. Création des produits
  const productsToSeed = [
    // MODE
    {
      id: 1,
      name: 'Veste en Cuir Artisanale',
      category: 'mode',
      price: 190000,
      stock: 15,
      isNew: false,
      isFeatured: true,
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80,https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600&q=80',
      description: 'Veste en cuir véritable, coupe ajustée, doublure en soie naturelle. Fabriquée artisanalement en Italie.',
      sizes: 'XS,S,M,L,XL',
      colors: 'Noir,Marron,Cognac',
      rating: 4.8,
      reviewsCount: 124,
    },
    {
      id: 2,
      name: 'Robe Soirée Élégante',
      category: 'mode',
      price: 115000,
      stock: 8,
      isNew: true,
      isFeatured: true,
      image: 'https://images.unsplash.com/photo-1566479179817-0b1f7e49c1e7?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1566479179817-0b1f7e49c1e7?w=600&q=80',
      description: 'Robe longue en soie, parfaite pour les soirées. Coupe fluide et élégante.',
      sizes: 'XS,S,M,L',
      colors: 'Noir,Rouge,Bleu nuit',
      rating: 4.9,
      reviewsCount: 87,
    },
    {
      id: 3,
      name: 'Manteau Cachemire Luxe',
      category: 'mode',
      price: 300000,
      stock: 5,
      isNew: false,
      isFeatured: true,
      image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&q=80',
      description: 'Manteau 100% cachemire, chaleureux et raffiné. Coupe droite intemporelle.',
      sizes: 'S,M,L,XL',
      colors: 'Beige,Gris,Camel',
      rating: 4.7,
      reviewsCount: 56,
    },
    {
      id: 4,
      name: 'Sneakers Premium Blanc',
      category: 'mode',
      price: 85000,
      stock: 22,
      isNew: true,
      isFeatured: false,
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
      description: 'Sneakers en cuir pleine fleur, semelle en caoutchouc naturel. Confort optimal.',
      sizes: '38,39,40,41,42,43,44,45',
      colors: 'Blanc,Noir',
      rating: 4.6,
      reviewsCount: 203,
    },
    {
      id: 5,
      name: 'Sac à Main Cuir Structuré',
      category: 'mode',
      price: 160000,
      stock: 12,
      isNew: false,
      isFeatured: true,
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
      description: 'Sac structuré en cuir végétal, compartiments organisés, bandoulière amovible.',
      sizes: '',
      colors: 'Noir,Camel,Bordeaux',
      rating: 4.9,
      reviewsCount: 67,
    },
    {
      id: 6,
      name: 'Chemise Lin Premium',
      category: 'mode',
      price: 58500,
      stock: 30,
      isNew: false,
      isFeatured: false,
      image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80',
      description: 'Chemise 100% lin lavé, coupe décontractée et élégante. Idéale été/automne.',
      sizes: 'S,M,L,XL,XXL',
      colors: 'Blanc,Bleu ciel,Beige,Vert sauge',
      rating: 4.5,
      reviewsCount: 145,
    },

    // ELECTRONIQUE
    {
      id: 7,
      name: 'Casque Audio Sans Fil Pro',
      category: 'electronique',
      price: 195000,
      stock: 18,
      isNew: false,
      isFeatured: true,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
      description: 'Casque avec réduction de bruit active, 40h autonomie, son Hi-Fi cristallin.',
      sizes: '',
      colors: 'Noir,Blanc,Argent',
      rating: 4.8,
      reviewsCount: 312,
    },
    {
      id: 8,
      name: 'Montre Connectée Élite',
      category: 'electronique',
      price: 261000,
      stock: 10,
      isNew: true,
      isFeatured: true,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
      description: 'Montre connectée avec GPS intégré, suivi santé avancé, boîtier titane.',
      sizes: '',
      colors: 'Noir,Or,Argent',
      rating: 4.7,
      reviewsCount: 189,
    },
    {
      id: 9,
      name: 'Tablette Graphique Pro',
      category: 'electronique',
      price: 360000,
      stock: 6,
      isNew: false,
      isFeatured: false,
      image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&q=80',
      description: 'Tablette graphique haute précision, stylet 4096 niveaux de pression, écran OLED.',
      sizes: '',
      colors: 'Gris ardoise',
      rating: 4.9,
      reviewsCount: 78,
    },
    {
      id: 10,
      name: 'Enceinte Bluetooth Portable',
      category: 'electronique',
      price: 97500,
      stock: 25,
      isNew: false,
      isFeatured: false,
      image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80',
      description: 'Enceinte waterproof 360°, 24h autonomie, son stéréo puissant et clair.',
      sizes: '',
      colors: 'Noir,Bleu,Rouge',
      rating: 4.6,
      reviewsCount: 234,
    },
    {
      id: 11,
      name: 'Appareil Photo Hybride',
      category: 'electronique',
      price: 850000,
      stock: 4,
      isNew: false,
      isFeatured: true,
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80',
      description: '24 Mpx, stabilisation optique 5 axes, vidéo 4K60fps, boîtier weather-sealed.',
      sizes: '',
      colors: 'Noir',
      rating: 4.9,
      reviewsCount: 95,
    },

    // MAISON
    {
      id: 12,
      name: 'Bougie Parfumée Artisanale',
      category: 'maison',
      price: 25000,
      stock: 50,
      isNew: false,
      isFeatured: true,
      image: 'https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=600&q=80',
      description: 'Bougie en cire de soja, parfum naturel, 60h de combustion. Fabriquée artisanalement.',
      sizes: '',
      colors: 'Vanille-Ambre,Rose-Patchouli,Cèdre-Encens',
      rating: 4.8,
      reviewsCount: 456,
    },
    {
      id: 13,
      name: 'Vase en Céramique Artisanal',
      category: 'maison',
      price: 42500,
      stock: 20,
      isNew: true,
      isFeatured: false,
      image: 'https://images.unsplash.com/photo-1612198790700-0c8e9fe79a8c?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1612198790700-0c8e9fe79a8c?w=600&q=80',
      description: 'Vase en grès tourné à la main, glaçure mat naturelle. Pièce unique.',
      sizes: '',
      colors: 'Beige sable,Gris cendré,Vert sauge',
      rating: 4.7,
      reviewsCount: 89,
    },
    {
      id: 14,
      name: 'Plaid Laine Mérinos',
      category: 'maison',
      price: 82000,
      stock: 14,
      isNew: false,
      isFeatured: false,
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
      description: 'Plaid 100% laine mérinos, douceur incomparable, 130x170cm.',
      sizes: '',
      colors: 'Camel,Gris,Ecru,Terracotta',
      rating: 4.9,
      reviewsCount: 167,
    },

    // BEAUTE
    {
      id: 15,
      name: 'Sérum Visage Anti-Âge',
      category: 'beaute',
      price: 51000,
      stock: 35,
      isNew: false,
      isFeatured: true,
      image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80',
      description: 'Sérum concentré en Vitamine C et acide hyaluronique. Éclat et fermeté visibles en 7 jours.',
      sizes: '',
      colors: '',
      rating: 4.8,
      reviewsCount: 289,
    },
    {
      id: 16,
      name: 'Parfum Eau de Parfum 100ml',
      category: 'beaute',
      price: 95000,
      stock: 20,
      isNew: true,
      isFeatured: true,
      image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&q=80',
      description: 'Notes de tête : bergamote et jasmin. Cœur : rose de mai. Fond : vétiver et musc blanc.',
      sizes: '30ml,50ml,100ml',
      colors: '',
      rating: 4.9,
      reviewsCount: 178,
    },

    // SPORT
    {
      id: 17,
      name: 'Tapis de Yoga Premium',
      category: 'sport',
      price: 58500,
      stock: 28,
      isNew: false,
      isFeatured: false,
      image: 'https://images.unsplash.com/photo-1601925228998-a5ae3f12b6a2?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1601925228998-a5ae3f12b6a2?w=600&q=80',
      description: 'Tapis 6mm en caoutchouc naturel, antidérapant, marqueurs d\'alignement.',
      sizes: '',
      colors: 'Noir,Violet,Vert forêt,Terracotta',
      rating: 4.7,
      reviewsCount: 312,
    },
    {
      id: 18,
      name: 'Gourde Inox 1L Isotherme',
      category: 'sport',
      price: 27500,
      stock: 40,
      isNew: false,
      isFeatured: false,
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80',
      description: 'Gourde en acier inoxydable 18/8, garde froid 24h, chaud 12h.',
      sizes: '',
      colors: 'Noir mat,Blanc,Argent,Rose,Bleu cobalt',
      rating: 4.8,
      reviewsCount: 567,
    },

    // ALIMENTATION
    {
      id: 19,
      name: 'Coffret Thés Grands Crus',
      category: 'alimentation',
      price: 36000,
      stock: 45,
      isNew: false,
      isFeatured: true,
      image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=80',
      description: 'Coffret de 12 thés exceptionnels : Darjeeling, Gyokuro, Pu-erh, Oolong...',
      sizes: '',
      colors: '',
      rating: 4.9,
      reviewsCount: 234,
    },
    {
      id: 20,
      name: "Huile d'Olive Extra Vierge",
      category: 'alimentation',
      price: 21000,
      stock: 60,
      isNew: false,
      isFeatured: false,
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80',
      description: "Huile d'olive de première pression à froid, acidité < 0.3%, origine Crète.",
      sizes: '500ml,1L,5L',
      colors: '',
      rating: 4.8,
      reviewsCount: 156,
    },

    // JOUETS
    {
      id: 21,
      name: 'Puzzle Bois 500 Pièces',
      category: 'jouets',
      price: 29500,
      stock: 22,
      isNew: true,
      isFeatured: false,
      image: 'https://images.unsplash.com/photo-1606503153255-59d5e417c6a8?w=600&q=80',
      images: 'https://images.unsplash.com/photo-1606503153255-59d5e417c6a8?w=600&q=80',
      description: 'Puzzle en bois de tilleul, pièces irrégulières organiques, motifs artisanaux.',
      sizes: '',
      colors: '',
      rating: 4.7,
      reviewsCount: 89,
    },
  ];

  for (const prod of productsToSeed) {
    await prisma.product.create({
      data: prod,
    });
  }

  console.log(`${productsToSeed.length} produits insérés.`);

  // 4. Génération de quelques avis de démonstration
  const reviewsToSeed = [
    { productId: 1, author: 'Amadou Diallo', rating: 5, comment: 'Superbe qualité ! Très satisfait de mon achat, je recommande fortement.' },
    { productId: 1, author: 'Fatou Sy', rating: 4, comment: 'Produit conforme à la description. La livraison a été très rapide.' },
    { productId: 7, author: 'Moussa Ndiaye', rating: 5, comment: "Excellent rapport qualité-prix. C'est exactement ce que je cherchais." },
    { productId: 8, author: 'Awa Diop', rating: 5, comment: 'Magnifique ! Les détails et les finitions sont parfaits.' },
    { productId: 12, author: 'Cheikh Kane', rating: 4, comment: 'Très confortable et très beau design. Service client irréprochable.' },
  ];

  for (const rev of reviewsToSeed) {
    await prisma.review.create({
      data: {
        productId: rev.productId,
        author: rev.author,
        rating: rev.rating,
        comment: rev.comment,
        date: new Date().toLocaleDateString('fr-FR'),
      },
    });
  }

  console.log(`${reviewsToSeed.length} avis clients insérés.`);

  // 5. Création de quelques commandes de démonstration (en FCFA)
  // On crée des correspondances réalistes en multipliant les valeurs mockées par ~650
  const mockOrdersToSeed = [
    {
      id: 'CMD-2026-001',
      total: 245000, // FCFA
      status: 'delivered',
      paymentStatus: 'paid',
      trackingNumber: 'SN987654321',
      shippingAddress: JSON.stringify({
        firstName: 'Marie',
        lastName: 'Dupont',
        email: 'marie.dupont@email.fr',
        phone: '771234567',
        address: '12 Avenue Cheikh Anta Diop',
        city: 'Dakar',
        zip: '10001',
        country: 'Sénégal',
      }),
      items: [
        { productId: 7, name: 'Casque Audio Sans Fil Pro', quantity: 1, price: 195000, color: 'Noir' },
        { productId: 12, name: 'Bougie Parfumée Artisanale', quantity: 2, price: 25000, color: 'Vanille-Ambre' },
      ],
    },
    {
      id: 'CMD-2026-002',
      total: 261000, // FCFA
      status: 'shipped',
      paymentStatus: 'paid',
      trackingNumber: 'SN123456789',
      shippingAddress: JSON.stringify({
        firstName: 'Jean',
        lastName: 'Martin',
        email: 'jean.martin@email.fr',
        phone: '789876543',
        address: '45 Rue de la Corniche',
        city: 'Saint-Louis',
        zip: '46001',
        country: 'Sénégal',
      }),
      items: [
        { productId: 8, name: 'Montre Connectée Élite', quantity: 1, price: 261000, color: 'Argent' },
      ],
    },
    {
      id: 'CMD-2026-003',
      total: 351000, // FCFA
      status: 'prepared',
      paymentStatus: 'paid',
      trackingNumber: 'SN111222333',
      shippingAddress: JSON.stringify({
        firstName: 'Sophie',
        lastName: 'Lambert',
        email: 'sophie.lambert@email.fr',
        phone: '761112233',
        address: '8 Rue du Commerce',
        city: 'Thiès',
        zip: '21001',
        country: 'Sénégal',
      }),
      items: [
        { productId: 3, name: 'Manteau Cachemire Luxe', quantity: 1, price: 300000, color: 'Camel' },
        { productId: 15, name: 'Sérum Visage Anti-Âge', quantity: 1, price: 51000 },
      ],
    },
  ];

  for (const o of mockOrdersToSeed) {
    const createdOrder = await prisma.order.create({
      data: {
        id: o.id,
        userId: client.id,
        total: o.total,
        status: o.status,
        paymentStatus: o.paymentStatus,
        shippingAddress: o.shippingAddress,
        trackingNumber: o.trackingNumber,
      },
    });

    for (const item of o.items) {
      await prisma.orderItem.create({
        data: {
          orderId: createdOrder.id,
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          color: item.color || null,
        },
      });
    }
  }

  console.log(`${mockOrdersToSeed.length} commandes d'exemple insérées.`);
  console.log('Seeding terminé avec succès !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
