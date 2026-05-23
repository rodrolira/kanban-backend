import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
const xss = require('xss-clean');
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import boardRoutes from './routes/boardRoutes';
import columnRoutes from './routes/columnRoutes';
import taskRoutes from './routes/taskRoutes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

// Crear instancia de Express
export const app = express();

// 1. Security Middlewares
app.use(helmet()); // Seguridad de headers HTTP

// 2. Rate limiting (evitar ataques de fuerza bruta)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests por ventana
  message: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo en 15 minutos',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter); // Aplicar solo a rutas API

// 3. Data sanitization contra NoSQL injection
app.use(mongoSanitize());

// 4. Data sanitization contra XSS
app.use(xss());

// 5. CORS configurado para producción
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://tu-app.vercel.app',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (como mobile apps o curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// 6. Body parsers con límites
app.use(express.json({ limit: '10kb' })); // Limitar tamaño de body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 7. Logging condicional
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // En producción, usar logging más ligero
  app.use(morgan('combined'));
}

// Health check endpoint (útil para monitoreo)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Aquí luego montaremos las rutas
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/columns', columnRoutes);
app.use('/api/tasks', taskRoutes);

// Ruta 404 para endpoints no encontrados
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta ${req.method} ${req.path} no encontrada`,
  });
});

// Manejador global de errores (SIEMPRE al final)
app.use(errorHandler);
