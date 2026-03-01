import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { PORT, CLIENT_ORIGINS, AI_SERVICE_URL } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import askRoutes from './routes/askRoutes.js';

const app = express();

// Security headers (configured to permit cross-origin dev if needed)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS configuration for local React development servers
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    const isExplicitlyAllowed = CLIENT_ORIGINS.includes(origin);
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    if (isExplicitlyAllowed || isLocalhost) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));
// Handle preflight requests
app.options('*', cors(corsOptions));

// Logging and Body parsing
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root Status
app.get('/', (req, res) => {
  res.json({
    service: 'Learnforge Node.js API Gateway',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      ask_proxy: 'POST /api/ask',
      auth_register: 'POST /api/auth/register',
      auth_login: 'POST /api/auth/login',
      auth_me: 'GET /api/auth/me',
      health: 'GET /health'
    },
    ai_service_target: AI_SERVICE_URL
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'learnforge-backend-node',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', askRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[Internal Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred on the gateway.'
  });
});

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`[Learnforge Gateway] Server running at: http://localhost:${PORT}`);
  console.log(`[Learnforge Gateway] Connected to FastAPI: ${AI_SERVICE_URL}`);
  console.log(`[Learnforge Gateway] Allowed CORS Origins: ${CLIENT_ORIGINS.join(', ')}`);
  console.log('='.repeat(60));
});

export default app;
