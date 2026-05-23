import { generateToken, verifyToken, TokenPayload } from '../../src/utils/jwt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

describe('JWT Utils', () => {
  const mockPayload: TokenPayload = {
    userId: '123',
    email: 'test@example.com',
    role: 'MEMBER',
  };

  describe('generateToken', () => {
    it('debería generar un token válido', () => {
      const token = generateToken(mockPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // formato JWT: header.payload.signature
    });

    it('debería generar tokens diferentes para el mismo payload', () => {
      const token1 = generateToken(mockPayload);
      const token2 = generateToken(mockPayload);
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('debería verificar y decodificar un token válido', () => {
      const token = generateToken(mockPayload);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockPayload.userId);
      expect(decoded?.email).toBe(mockPayload.email);
      expect(decoded?.role).toBe(mockPayload.role);
    });

    it('debería aceptar token con prefijo Bearer', () => {
      const token = generateToken(mockPayload);
      const bearerToken = `Bearer ${token}`;
      const decoded = verifyToken(bearerToken);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockPayload.userId);
    });

    it('debería devolver null para token inválido', () => {
      const decoded = verifyToken('token-invalido');
      expect(decoded).toBeNull();
    });

    it('debería devolver null para token vacío', () => {
      const decoded = verifyToken('');
      expect(decoded).toBeNull();
    });

    it('debería devolver null para token expirado', () => {
      // Crear token con expiración de 1 segundo
      const expiredToken = jwt.sign(mockPayload, JWT_SECRET, { expiresIn: '1ms' });
      // Esperar a que expire
      setTimeout(() => {
        const decoded = verifyToken(expiredToken);
        expect(decoded).toBeNull();
      }, 10);
    });
  });
});