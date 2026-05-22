import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import { buildSwaggerSpec } from './swagger.js';

// Charger les variables d'environnement
dotenv.config();

// Imports des routes
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import productRoutes from './routes/products.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Configuration des chemins ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware CORS - Permet d'autoriser le frontend sur le port 5173 (Vite default)
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Middlewares globaux
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// S'assurer que le dossier des uploads existe et le servir de maniere statique
const uploadsPath = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use('/uploads', express.static(uploadsPath));

const swaggerUiOptions = {
  customSiteTitle: 'Luxora API Docs',
  swaggerOptions: {
    url: '/api-docs.json',
    docExpansion: 'list',
    filter: true,
    persistAuthorization: true,
    showRequestHeaders: true,
    showRequestDuration: true,
  },
};

app.get('/api-docs.json', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json(buildSwaggerSpec(baseUrl));
});

app.use('/api-docs', swaggerUi.serveFiles(null, swaggerUiOptions));
app.get('/api-docs', swaggerUi.setup(null, swaggerUiOptions));
app.get('/api-docs/', swaggerUi.setup(null, swaggerUiOptions));

// Route de test
app.get('/', (req, res) => {
  res.json({
    message: 'Serveur Luxora E-commerce operationnel !',
    documentation: '/api-docs',
  });
});

// Enregistrement des routes API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Middleware de gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur attrapee par Express :', err.stack);
  res.status(500).json({
    message: err.message || 'Une erreur interne est survenue sur le serveur.',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Lancement du serveur
const server = app.listen(PORT, () => {
  const address = server.address();
  const activePort = typeof address === 'object' && address ? address.port : PORT;

  console.log('=========================================');
  console.log(' Serveur en cours d\'execution sur :');
  console.log(`  http://localhost:${activePort}`);
  console.log(`  Documentation Swagger : http://localhost:${activePort}/api-docs`);
  console.log(' Dossier uploads statique configure.');
  console.log('=========================================');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Le port ${PORT} est deja utilise.`);
    console.error('Choisis un seul mode de lancement backend :');
    console.error(' - Mode local : `npm run dev:db` puis `npm run dev`');
    console.error(' - Mode Docker : `npm run docker:up` puis `npm run dev:frontend:docker`');
    console.error(' - Ou change `PORT` dans `backend/.env` si tu veux un autre port local.');
    process.exit(1);
  }

  console.error('Erreur serveur au demarrage :', error);
  process.exit(1);
});
