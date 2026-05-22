import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routeFilesGlob = path.join(__dirname, 'routes/*.js').replace(/\\/g, '/');

const defaultServers = [
  {
    url: 'http://localhost:5000',
    description: 'Serveur local',
  },
];

export const buildSwaggerSpec = (serverUrl) => {
  const options = {
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'Luxora E-commerce API',
        version: '1.0.0',
        description: 'Documentation OpenAPI du backend Luxora.',
      },
      servers: serverUrl
        ? [
            {
              url: serverUrl,
              description: 'Serveur courant',
            },
          ]
        : defaultServers,
      tags: [
        {
          name: 'Authentification',
          description: 'Creation de compte, connexion et profil utilisateur.',
        },
        {
          name: 'Produits',
          description: 'Catalogue produit, avis et gestion produit admin.',
        },
        {
          name: 'Commandes',
          description: 'Checkout, suivi et gestion du statut des commandes.',
        },
        {
          name: 'Admin',
          description: 'Statistiques et liste globale des commandes.',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          MessageResponse: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Operation terminee avec succes.',
              },
            },
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Une erreur est survenue.',
              },
            },
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              email: { type: 'string', format: 'email', example: 'user@example.com' },
              firstName: { type: 'string', nullable: true, example: 'Jean' },
              lastName: { type: 'string', nullable: true, example: 'Dupont' },
              role: { type: 'string', enum: ['customer', 'admin'], example: 'customer' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          AuthResponse: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Connexion reussie !',
              },
              token: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
              user: {
                $ref: '#/components/schemas/User',
              },
            },
          },
          Review: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              productId: { type: 'integer', example: 12 },
              author: { type: 'string', example: 'Jean Dupont' },
              rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
              comment: { type: 'string', example: 'Excellent produit !' },
              date: { type: 'string', example: '22/05/2026' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          Product: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              name: { type: 'string', example: 'T-Shirt Luxora' },
              description: { type: 'string', example: 'Coupe oversize et tissu premium.' },
              price: { type: 'number', example: 29.99 },
              stock: { type: 'integer', example: 100 },
              category: { type: 'string', example: 'Vetements' },
              image: { type: 'string', example: '/uploads/image.jpg' },
              images: {
                type: 'array',
                items: { type: 'string' },
                example: ['/uploads/image.jpg'],
              },
              sizes: {
                type: 'array',
                items: { type: 'string' },
                example: ['S', 'M', 'L'],
              },
              colors: {
                type: 'array',
                items: { type: 'string' },
                example: ['Noir', 'Rouge'],
              },
              rating: { type: 'number', example: 4.5 },
              reviewsCount: { type: 'integer', example: 42 },
              isFeatured: { type: 'boolean', example: false },
              isNew: { type: 'boolean', example: true },
              reviewsList: {
                type: 'array',
                items: { $ref: '#/components/schemas/Review' },
              },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          ShippingAddress: {
            type: 'object',
            properties: {
              firstName: { type: 'string', example: 'Jean' },
              lastName: { type: 'string', example: 'Dupont' },
              address: { type: 'string', example: '10 rue des Fleurs' },
              city: { type: 'string', example: 'Lome' },
              zip: { type: 'string', example: '1000' },
              country: { type: 'string', example: 'Togo' },
              phone: { type: 'string', example: '+22890000000' },
              email: { type: 'string', format: 'email', example: 'client@example.com' },
            },
          },
          OrderItem: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              orderId: { type: 'string', example: 'CMD-1716382041' },
              productId: { type: 'integer', example: 12 },
              name: { type: 'string', example: 'T-Shirt Luxora' },
              quantity: { type: 'integer', example: 2 },
              price: { type: 'number', example: 29.99 },
              size: { type: 'string', nullable: true, example: 'M' },
              color: { type: 'string', nullable: true, example: 'Noir' },
            },
          },
          OrderTimelineStep: {
            type: 'object',
            properties: {
              step: { type: 'string', example: 'confirmed' },
              label: { type: 'string', example: 'Commande confirmee' },
              date: { type: 'string', nullable: true, format: 'date-time' },
              done: { type: 'boolean', example: true },
            },
          },
          Order: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'CMD-1716382041' },
              userId: { type: 'integer', nullable: true, example: 1 },
              total: { type: 'number', example: 99.99 },
              status: {
                type: 'string',
                enum: ['confirmed', 'prepared', 'shipped', 'delivered', 'cancelled'],
                example: 'confirmed',
              },
              paymentStatus: {
                type: 'string',
                enum: ['paid', 'pending'],
                example: 'paid',
              },
              shippingAddress: {
                $ref: '#/components/schemas/ShippingAddress',
              },
              trackingNumber: { type: 'string', example: 'SN123456789' },
              items: {
                type: 'array',
                items: { $ref: '#/components/schemas/OrderItem' },
              },
              customer: { type: 'string', example: 'Jean Dupont' },
              email: { type: 'string', format: 'email', example: 'client@example.com' },
              timeline: {
                type: 'array',
                items: { $ref: '#/components/schemas/OrderTimelineStep' },
              },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          OrderStatusUpdate: {
            type: 'object',
            required: ['status'],
            properties: {
              status: {
                type: 'string',
                enum: ['confirmed', 'prepared', 'shipped', 'delivered', 'cancelled'],
                example: 'shipped',
              },
            },
          },
          AdminStats: {
            type: 'object',
            properties: {
              totalRevenue: { type: 'number', example: 5000 },
              totalOrders: { type: 'integer', example: 42 },
              outOfStock: { type: 'integer', example: 2 },
              lowStock: { type: 'integer', example: 5 },
              avgBasket: { type: 'number', example: 119.05 },
              salesByCategory: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    revenue: { type: 'number', example: 1499.9 },
                    qty: { type: 'integer', example: 32 },
                  },
                },
              },
              monthly: {
                type: 'object',
                additionalProperties: {
                  type: 'number',
                  example: 1200,
                },
              },
              topProducts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'T-Shirt Luxora' },
                    qty: { type: 'integer', example: 12 },
                    revenue: { type: 'number', example: 359.88 },
                    image: { type: 'string', example: '/uploads/image.jpg' },
                  },
                },
              },
              byStatus: {
                type: 'object',
                additionalProperties: {
                  type: 'integer',
                  example: 4,
                },
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
