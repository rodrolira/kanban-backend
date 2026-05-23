import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

// Clase de error personalizada (si no existe)
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Manejador de errores global
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log del error (siempre en producción para debugging)
  console.error('=== ERROR CAPTURADO ===');
  console.error('Ruta:', `${req.method} ${req.path}`);
  console.error('Mensaje:', error.message);
  
  if (process.env.NODE_ENV !== 'production') {
    console.error('Stack:', error.stack);
  }

  // Error operacional (esperado)
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }

  // Error de Prisma (base de datos)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Códigos comunes de Prisma
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe un registro con esos datos'
      });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Registro no encontrado'
      });
    }
    
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

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expirado'
    });
  }

  // Error de validación de express-validator
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  // Error desconocido (bug)
  console.error('Error no manejado:', error);
  
  return res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { 
      details: error.message,
      stack: error.stack 
    })
  });
};