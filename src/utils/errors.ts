// Clase base para errores de la aplicación
export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;
  
    constructor(message: string, statusCode: number, isOperational = true) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = isOperational;
      
      // Capturar stack trace
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  // Errores específicos
  export class ValidationError extends AppError {
    constructor(message: string) {
      super(message, 400);
    }
  }
  
  export class AuthenticationError extends AppError {
    constructor(message: string = 'No autenticado') {
      super(message, 401);
    }
  }
  
  export class AuthorizationError extends AppError {
    constructor(message: string = 'No autorizado') {
      super(message, 403);
    }
  }
  
  export class NotFoundError extends AppError {
    constructor(resource: string) {
      super(`${resource} no encontrado`, 404);
    }
  }