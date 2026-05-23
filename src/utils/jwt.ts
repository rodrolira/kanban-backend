import jwt from 'jsonwebtoken';

// Obtener la secret key del entorno
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Interfaz para el payload del token
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Genera un JWT para un usuario autenticado
 */
export const generateToken = (payload: TokenPayload): string => {
  // Usar any para evitar problemas de tipos con expiresIn
  const options: any = {
    expiresIn: JWT_EXPIRES_IN
  };
  
  return jwt.sign(payload, JWT_SECRET, options);
};

/**
 * Verifica y decodifica un JWT
 */
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    // Eliminar 'Bearer ' si existe
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.verify(cleanToken, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};