import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { AuthenticationError, AuthorizationError } from '../utils/errors';

// Extender la interfaz Request de Express para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware: Verifica que el usuario esté autenticado
 * Se usa en rutas protegidas
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new AuthenticationError('Token no proporcionado');
    }

    // Verificar token
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
      throw new AuthenticationError('Token inválido o expirado');
    }

    // Adjuntar usuario decodificado al request
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Verifica que el usuario tenga rol de ADMIN
 * Debe usarse después de authenticate
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AuthenticationError('Usuario no autenticado'));
  }
  
  if (req.user.role !== 'ADMIN') {
    return next(new AuthorizationError('Se requiere rol de administrador'));
  }
  
  next();
};

/**
 * Middleware opcional: Verifica que el usuario sea el propietario del recurso
 * @param getResourceUserId - Función async que obtiene el userId del recurso
 */
export const requireOwnership = (getResourceUserId: (req: Request) => Promise<string>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AuthenticationError('Usuario no autenticado'));
      }

      const resourceUserId = await getResourceUserId(req);
      
      // Admin puede hacer todo, miembros solo sus recursos
      if (req.user.role === 'ADMIN' || req.user.userId === resourceUserId) {
        return next();
      }
      
      next(new AuthorizationError('No tienes permiso para modificar este recurso'));
    } catch (error) {
      next(error);
    }
  };
};