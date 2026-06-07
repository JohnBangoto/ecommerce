import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiReference } from '@scalar/express-api-reference';
import { env } from './config/env.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import contactRoutes from './routes/contact.js';
import orderRoutes from './routes/orders.js';
import productRoutes from './routes/products.js';
import stockRoutes from './routes/stock.js';
import { buildSwaggerSpec } from './swagger.js';

const app = express();
const PORT = env.PORT;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsPath = path.join(__dirname, '../public/uploads');

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

const apiLimiter = rateLimit({
  windowMs: env.API_RATE_LIMIT_WINDOW_MS,
  max: env.API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https:'],
        connectSrc: ["'self'", 'https:'],
        fontSrc: ["'self'", 'https:'],
        workerSrc: ["'self'", 'blob:'],
      },
    },
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS.'));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/uploads', express.static(uploadsPath));

// ── OpenAPI spec endpoint ─────────────────────────────────────────────────────
app.get('/api-docs.json', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json(buildSwaggerSpec(baseUrl));
});

// ── Scalar API Reference UI ───────────────────────────────────────────────────
app.use(
  '/api-docs',
  apiReference({
    spec: { url: '/api-docs.json' },
    theme: 'kepler',
    layout: 'sidebar',
    defaultHttpClient: { targetKey: 'javascript', clientKey: 'fetch' },
    metaData: {
      title: 'Luxora API — Documentation',
    },
    authentication: {
      preferredSecurityScheme: 'bearerAuth',
    },
  }),
);

app.get('/', (req, res) => {
  res.json({
    message: 'Luxora backend is running.',
    documentation: '/api-docs',
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin/stock', stockRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }

  if (err?.message === 'Origin not allowed by CORS.') {
    return res.status(403).json({ message: err.message });
  }

  console.error('Express error:', err);

  return res.status(err?.statusCode || 500).json({
    message: err?.message || 'An internal server error occurred.',
    error: env.isProduction ? undefined : err,
  });
});

const server = app.listen(PORT, () => {
  const address = server.address();
  const activePort = typeof address === 'object' && address ? address.port : PORT;

  console.log('=========================================');
  console.log(' Luxora backend is running on:');
  console.log(`  http://localhost:${activePort}`);
  console.log(`  Scalar API docs: http://localhost:${activePort}/api-docs`);
  console.log('=========================================');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    process.exit(1);
  }
  console.error('Server startup error:', error);
  process.exit(1);
});
