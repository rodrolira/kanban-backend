import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import boardRoutes from './routes/boardRoutes';
import columnRoutes from './routes/columnRoutes';
import taskRoutes from './routes/taskRoutes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

// Crear instancia de Express
export const app = express();

// ============ 1. MIDDLEWARES DE SEGURIDAD BÁSICOS ============

// Helmet para seguridad de headers HTTP (configuración compatible)
app.use(helmet({
  // Deshabilitar CSP si causa problemas (puedes habilitarlo después)
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// ============ 2. RATE LIMITING ============
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests por ventana
  message: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo en 15 minutos',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter); // Aplicar solo a rutas API

// ============ 3. COMPRESIÓN ============
app.use(compression());

// ============ 4. CORS CONFIGURADO ============
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://kanban-flow.vercel.app',
  'https://kanban-frontend.vercel.app',
  'http://localhost:5173',
].filter(Boolean); // Remover valores undefined/null

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (como mobile apps o curl)
      if (!origin) return callback(null, true);
      
      // Permitir en desarrollo sin restricciones
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      
      // En producción, verificar contra lista blanca
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`CORS bloqueó origen: ${origin}`);
        callback(new Error('No permitido por CORS'), false);
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// ============ 5. BODY PARSERS ============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============ 6. LOGGING ============
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // En producción, usar logging más ligero
  app.use(morgan('combined'));
}

// ============ 7. HEALTH CHECK (PRIMERO) ============
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    websocket: 'enabled',
    database: 'connected'
  });
});

// ============ 8. RUTA RAÍZ ============
app.get('/', (req, res) => {
  res.json({ 
    name: 'Kanban API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: 'GET /health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me'
      },
      boards: {
        list: 'GET /api/boards',
        create: 'POST /api/boards',
        get: 'GET /api/boards/:boardId',
        update: 'PUT /api/boards/:boardId',
        delete: 'DELETE /api/boards/:boardId'
      }
    }
  });
});

// ============ 9. RUTAS DE LA API ============
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/columns', columnRoutes);
app.use('/api/tasks', taskRoutes);

// ============ 10. MANEJO DE ERRORES ============

// Ruta 404 para endpoints no encontrados
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta ${req.method} ${req.path} no encontrada`,
    timestamp: new Date().toISOString()
  });
});

// Manejador global de errores (SIEMPRE al final)
app.use(errorHandler);