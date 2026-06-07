import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routeFilesGlob = path.join(__dirname, 'routes/*.js').replace(/\\/g, '/');

const defaultServers = [
  { url: 'http://localhost:5000', description: 'Local dev server' },
];

export const buildSwaggerSpec = (serverUrl) => {
  const options = {
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'Luxora E-commerce API',
        version: '2.0.0',
        description: `
## Luxora Backend API

REST API complète pour la plateforme e-commerce **Luxora**.

### Authentification
Tous les endpoints protégés utilisent un JWT Bearer Token.
Connectez-vous via \`POST /api/auth/login\` pour obtenir votre token, puis cliquez sur **Authorize** et collez-le.

### Rôles
| Rôle | Accès |
|------|-------|
| \`customer\` | Catalogue, commandes personnelles, avis |
| \`admin\` | Tout + gestion produits/catégories/stock/stats |
        `,
        contact: { name: 'Luxora Tech', email: 'tech@luxora.com' },
      },
      servers: serverUrl
        ? [{ url: serverUrl, description: 'Current server' }]
        : defaultServers,
      tags: [
        { name: 'Authentification', description: 'Inscription, connexion, profil utilisateur.' },
        { name: 'Produits',  description: 'Catalogue produit, recherche, filtres, avis.' },
        { name: 'Catégories', description: 'Gestion des catégories produits.' },
        { name: 'Commandes', description: 'Checkout, suivi et historique des commandes.' },
        { name: 'Stock',     description: 'Gestion du stock, ajustements manuels, historique des mouvements.' },
        { name: 'Admin',     description: 'Tableau de bord, statistiques, liste admin des commandes et produits.' },
        { name: 'Contact',   description: 'Formulaire de contact et messages support.' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT obtenu via POST /api/auth/login',
          },
        },
        responses: {
          Unauthorized: {
            description: 'Token manquant ou invalide.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { message: 'Authentication required.' },
              },
            },
          },
          Forbidden: {
            description: 'Droits insuffisants (admin requis).',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { message: 'Administrator privileges are required.' },
              },
            },
          },
          NotFound: {
            description: 'Ressource introuvable.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { message: 'Resource not found.' },
              },
            },
          },
          BadRequest: {
            description: 'Données invalides.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { message: 'Invalid request payload.', errors: [] },
              },
            },
          },
          ServerError: {
            description: 'Erreur serveur interne.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { message: 'An internal server error occurred.' },
              },
            },
          },
        },
        schemas: {
          // ── Common ─────────────────────────────────────────────────────────
          MessageResponse: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Operation successful.' },
            },
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'An error occurred.' },
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'string', example: 'email' },
                    message: { type: 'string', example: 'Invalid email.' },
                  },
                },
              },
            },
          },
          Pagination: {
            type: 'object',
            properties: {
              total:      { type: 'integer', example: 100 },
              page:       { type: 'integer', example: 1 },
              totalPages: { type: 'integer', example: 5 },
              limit:      { type: 'integer', example: 20 },
            },
          },

          // ── Auth ───────────────────────────────────────────────────────────
          User: {
            type: 'object',
            properties: {
              id:        { type: 'integer', example: 1 },
              email:     { type: 'string', format: 'email', example: 'user@example.com' },
              firstName: { type: 'string', nullable: true, example: 'Jean' },
              lastName:  { type: 'string', nullable: true, example: 'Dupont' },
              role:      { type: 'string', enum: ['customer', 'admin'], example: 'customer' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          AuthResponse: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Login successful.' },
              token:   { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              user:    { $ref: '#/components/schemas/User' },
            },
          },

          // ── Products ───────────────────────────────────────────────────────
          Review: {
            type: 'object',
            properties: {
              id:           { type: 'integer', example: 1 },
              productId:    { type: 'integer', example: 12 },
              author:       { type: 'string', example: 'Jean Dupont' },
              rating:       { type: 'integer', minimum: 1, maximum: 5, example: 5 },
              comment:      { type: 'string', example: 'Excellent produit !' },
              date:         { type: 'string', example: '22/05/2026' },
              createdAt:    { type: 'string', format: 'date-time' },
            },
          },
          Product: {
            type: 'object',
            properties: {
              id:               { type: 'integer', example: 1 },
              name:             { type: 'string', example: 'Veste Luxora Premium' },
              description:      { type: 'string', example: 'Coupe cintrée, tissu premium.' },
              price:            { type: 'number', example: 75000 },
              stock:            { type: 'integer', example: 50 },
              categoryId:       { type: 'integer', example: 2 },
              categoryName:     { type: 'string', example: 'Vêtements' },
              category:         { type: 'string', example: 'vetements' },
              image:            { type: 'string', example: 'https://cdn.supabase.co/storage/v1/object/public/products/image.jpg' },
              images:           { type: 'array', items: { type: 'string' }, example: ['https://cdn.example.com/img1.jpg'] },
              sizes:            { type: 'array', items: { type: 'string' }, example: ['S', 'M', 'L', 'XL'] },
              colors:           { type: 'array', items: { type: 'string' }, example: ['Noir', 'Blanc'] },
              rating:           { type: 'number', example: 4.5 },
              reviewsCount:     { type: 'integer', example: 42 },
              isFeatured:       { type: 'boolean', example: false },
              isNew:            { type: 'boolean', example: true },
              isActive:         { type: 'boolean', example: true },
              condition:        { type: 'string', enum: ['new', 'used', 'refurbished'], example: 'new' },
              lowStockThreshold: { type: 'integer', example: 5 },
              reviewsList:      { type: 'array', items: { $ref: '#/components/schemas/Review' } },
              createdAt:        { type: 'string', format: 'date-time' },
            },
          },

          // ── Categories ─────────────────────────────────────────────────────
          Category: {
            type: 'object',
            properties: {
              id:           { type: 'integer', example: 1 },
              name:         { type: 'string', example: 'Montres de Luxe' },
              slug:         { type: 'string', example: 'montres-de-luxe' },
              productCount: { type: 'integer', example: 12 },
              createdAt:    { type: 'string', format: 'date-time' },
            },
          },

          // ── Orders ─────────────────────────────────────────────────────────
          ShippingAddress: {
            type: 'object',
            properties: {
              firstName: { type: 'string', example: 'Jean' },
              lastName:  { type: 'string', example: 'Dupont' },
              address:   { type: 'string', example: '10 rue des Fleurs' },
              city:      { type: 'string', example: 'Lomé' },
              zip:       { type: 'string', example: '1000' },
              country:   { type: 'string', example: 'Togo' },
              phone:     { type: 'string', nullable: true, example: '+22890000000' },
              email:     { type: 'string', format: 'email', example: 'client@example.com' },
            },
          },
          OrderItem: {
            type: 'object',
            properties: {
              id:        { type: 'integer', example: 1 },
              orderId:   { type: 'string', example: 'CMD-20260607-A1B2C3' },
              productId: { type: 'integer', example: 12 },
              name:      { type: 'string', example: 'Veste Luxora Premium' },
              quantity:  { type: 'integer', example: 2 },
              price:     { type: 'number', example: 75000 },
              size:      { type: 'string', nullable: true, example: 'M' },
              color:     { type: 'string', nullable: true, example: 'Noir' },
              image:     { type: 'string', nullable: true },
            },
          },
          OrderTimelineStep: {
            type: 'object',
            properties: {
              step:  { type: 'string', example: 'confirmed' },
              label: { type: 'string', example: 'Commande confirmée' },
              date:  { type: 'string', nullable: true, format: 'date-time' },
              done:  { type: 'boolean', example: true },
            },
          },
          Order: {
            type: 'object',
            properties: {
              id:              { type: 'string', example: 'CMD-20260607-A1B2C3' },
              userId:          { type: 'integer', nullable: true, example: 1 },
              total:           { type: 'number', example: 150000 },
              status:          { type: 'string', enum: ['confirmed', 'prepared', 'shipped', 'delivered', 'cancelled'], example: 'confirmed' },
              paymentStatus:   { type: 'string', enum: ['paid', 'pending'], example: 'paid' },
              trackingNumber:  { type: 'string', example: 'TRK-A1B2C3D4' },
              shippingAddress: { $ref: '#/components/schemas/ShippingAddress' },
              items:           { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
              customer:        { type: 'string', example: 'Jean Dupont' },
              email:           { type: 'string', format: 'email' },
              timeline:        { type: 'array', items: { $ref: '#/components/schemas/OrderTimelineStep' } },
              createdAt:       { type: 'string', format: 'date-time' },
            },
          },
          OrderStatusUpdate: {
            type: 'object',
            required: ['status'],
            properties: {
              status: { type: 'string', enum: ['confirmed', 'prepared', 'shipped', 'delivered', 'cancelled'], example: 'shipped' },
            },
          },

          // ── Stock ──────────────────────────────────────────────────────────
          StockLevel: {
            type: 'string',
            enum: ['ok', 'low', 'out'],
            description: 'ok = above threshold, low = below threshold but > 0, out = 0',
          },
          StockProduct: {
            type: 'object',
            properties: {
              id:               { type: 'integer', example: 1 },
              name:             { type: 'string', example: 'Veste Luxora Premium' },
              image:            { type: 'string', example: 'https://cdn.example.com/img.jpg' },
              category:         { type: 'string', example: 'Vêtements' },
              stock:            { type: 'integer', example: 3 },
              lowStockThreshold: { type: 'integer', example: 5 },
              level:            { $ref: '#/components/schemas/StockLevel' },
              isActive:         { type: 'boolean' },
            },
          },
          StockMovement: {
            type: 'object',
            properties: {
              id:           { type: 'integer', example: 42 },
              productId:    { type: 'integer', example: 1 },
              productName:  { type: 'string', example: 'Veste Luxora Premium' },
              productImage: { type: 'string', example: 'https://cdn.example.com/img.jpg' },
              quantity:     { type: 'integer', description: 'Positive = added, negative = removed', example: -2 },
              type:         { type: 'string', enum: ['sale', 'supply', 'adjustment', 'manual', 'cancellation'], example: 'sale' },
              note:         { type: 'string', nullable: true, example: 'Order CMD-20260607-A1B2C3' },
              createdAt:    { type: 'string', format: 'date-time' },
            },
          },
          StockAdjustRequest: {
            type: 'object',
            description: 'Provide either `delta` (relative) or `newQty` (absolute).',
            properties: {
              delta:  { type: 'integer', description: 'Relative change. E.g. +10 or -5.', example: 20 },
              newQty: { type: 'integer', minimum: 0, description: 'New absolute stock value.', example: 50 },
              type:   { type: 'string', enum: ['supply', 'adjustment', 'manual'], default: 'adjustment', example: 'supply' },
              note:   { type: 'string', maxLength: 500, example: 'Réapprovisionnement fournisseur' },
            },
          },
          StockSummary: {
            type: 'object',
            properties: {
              out:   { type: 'integer', example: 2 },
              low:   { type: 'integer', example: 5 },
              ok:    { type: 'integer', example: 43 },
              total: { type: 'integer', example: 50 },
            },
          },

          // ── Contact ────────────────────────────────────────────────────────
          ContactMessageRequest: {
            type: 'object',
            required: ['firstName', 'lastName', 'email', 'subject', 'message'],
            properties: {
              firstName: { type: 'string', example: 'Jean' },
              lastName:  { type: 'string', example: 'Dupont' },
              email:     { type: 'string', format: 'email', example: 'jean@example.com' },
              subject:   { type: 'string', example: 'Problème de livraison' },
              orderId:   { type: 'string', nullable: true, example: 'CMD-20260607-A1B2C3' },
              message:   { type: 'string', minLength: 10, example: 'Bonjour, ma commande est en retard...' },
            },
          },
          ContactMessage: {
            type: 'object',
            properties: {
              id:        { type: 'integer', example: 1 },
              firstName: { type: 'string', example: 'Jean' },
              lastName:  { type: 'string', example: 'Dupont' },
              email:     { type: 'string', format: 'email' },
              subject:   { type: 'string', example: 'Problème de livraison' },
              orderId:   { type: 'string', nullable: true },
              message:   { type: 'string' },
              isRead:    { type: 'boolean', example: false },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },

          // ── Admin stats ────────────────────────────────────────────────────
          TimeSeriesPoint: {
            type: 'object',
            properties: {
              period:  { type: 'string', description: 'YYYY-MM-DD / YYYY-Www / YYYY-MM depending on granularity', example: '2026-06' },
              revenue: { type: 'number', example: 1250000 },
              orders:  { type: 'integer', example: 12 },
            },
          },
          AdminStats: {
            type: 'object',
            properties: {
              totalRevenue:   { type: 'number', example: 5000000 },
              totalOrders:    { type: 'integer', example: 42 },
              outOfStock:     { type: 'integer', example: 2 },
              lowStock:       { type: 'integer', example: 5 },
              avgBasket:      { type: 'number', example: 119047 },
              todayOrders:    { type: 'integer', example: 3 },
              pendingOrders:  { type: 'integer', example: 8 },
              unreadMessages: { type: 'integer', example: 4 },
              from:           { type: 'string', format: 'date-time' },
              to:             { type: 'string', format: 'date-time' },
              granularity:    { type: 'string', enum: ['day', 'week', 'month'], example: 'month' },
              orderCount:     { type: 'integer', description: 'Orders in the from/to period', example: 15 },
              timeSeries: {
                type: 'array',
                items: { $ref: '#/components/schemas/TimeSeriesPoint' },
              },
              salesByCategory: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    revenue: { type: 'number', example: 1499000 },
                    qty:     { type: 'integer', example: 32 },
                  },
                },
              },
              topProducts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name:    { type: 'string', example: 'Veste Luxora Premium' },
                    qty:     { type: 'integer', example: 12 },
                    revenue: { type: 'number', example: 900000 },
                    image:   { type: 'string', nullable: true },
                  },
                },
              },
              byStatus: {
                type: 'object',
                additionalProperties: { type: 'integer', example: 4 },
              },
              recentOrders: {
                type: 'array',
                items: { $ref: '#/components/schemas/Order' },
              },
            },
          },
        },
      },
    },
    apis: [routeFilesGlob],
  };

  return swaggerJsdoc(options);
};

export const swaggerSpec = buildSwaggerSpec();
