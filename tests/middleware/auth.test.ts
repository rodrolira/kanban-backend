import { Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../../src/middleware/auth';
import { generateToken } from '../../src/utils/jwt';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    it('debería permitir acceso con token válido', () => {
      const token = generateToken({
        userId: '123',
        email: 'test@example.com',
        role: 'MEMBER',
      });
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticate(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.userId).toBe('123');
    });

    it('debería rechazar acceso sin token', () => {
      authenticate(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
        message: 'Token no proporcionado',
      }));
    });

    it('debería rechazar token inválido', () => {
      mockReq.headers = { authorization: 'Bearer token-invalido' };
      
      authenticate(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
        message: 'Token inválido o expirado',
      }));
    });

    it('debería rechazar formato incorrecto de header', () => {
      mockReq.headers = { authorization: 'token-sin-bearer' };
      
      authenticate(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
      }));
    });
  });

  describe('requireAdmin', () => {
    it('debería permitir acceso a admin', () => {
      mockReq.user = {
        userId: '123',
        email: 'admin@test.com',
        role: 'ADMIN',
      };
      
      requireAdmin(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(); // Sin argumentos = éxito
    });

    it('debería rechazar acceso a miembro', () => {
      mockReq.user = {
        userId: '123',
        email: 'member@test.com',
        role: 'MEMBER',
      };
      
      requireAdmin(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403,
        message: 'Se requiere rol de administrador',
      }));
    });

    it('debería rechazar si no hay usuario autenticado', () => {
      requireAdmin(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
        message: 'Usuario no autenticado',
      }));
    });
  });
});