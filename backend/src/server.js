import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import productRoutes from './routes/products.js';
import contactRoutes from './routes/contact.js';
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

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'"],
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

app.get('/api-docs.json', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json(buildSwaggerSpec(baseUrl));
});

app.use('/api-docs', swaggerUi.serveFiles(null, swaggerUiOptions));
app.get('/api-docs', swaggerUi.setup(null, swaggerUiOptions));
app.get('/api-docs/', swaggerUi.setup(null, swaggerUiOptions));

app.get('/', (req, res) => {
  res.json({
    message: 'Luxora backend is running.',
    documentation: '/api-docs',
  });
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

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
  console.log(`  Swagger documentation: http://localhost:${activePort}/api-docs`);
  console.log('=========================================');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    console.error('Choose one backend runtime mode only:');
    console.error(' - Local mode: `npm run dev:db` then `npm run dev`');
    console.error(' - Docker mode: `npm run docker:up` then `npm run dev:frontend:docker`');
    process.exit(1);
  }

  console.error('Server startup error:', error);
  process.exit(1);
});
