import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

// Middleware de manejo de errores (debe ir después de todas las rutas)
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Error operacional (esperado)
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }

  // Error de Prisma (base de datos)
  if (error.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      success: false,
      error: 'Error en la base de datos',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }

  // Error de JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }

  // Error desconocido (bug)
  console.error('Error no manejado:', error);
  
  return res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};