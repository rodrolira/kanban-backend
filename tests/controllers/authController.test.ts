import { Request, Response } from 'express';
import { register, login, getMe } from '../../src/controllers/authController';
import { prisma } from '../../src/lib/prisma';
import { hashPassword, comparePassword } from '../../src/utils/password';
import { generateToken } from '../../src/utils/jwt';

// Mock de dependencias
jest.mock('../../src/lib/prisma');
jest.mock('../../src/utils/password');
jest.mock('../../src/utils/jwt');

describe('Auth Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      user: undefined,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerData = {
      email: 'newuser@example.com',
      password: 'Test123456',
      name: 'New User',
    };

    beforeEach(() => {
      mockReq.body = registerData;
    });

    it('debería registrar un usuario exitosamente', async () => {
      const hashedPassword = 'hashed_password_123';
      const mockUser = {
        id: '1',
        email: registerData.email,
        name: registerData.name,
        role: 'MEMBER',
        createdAt: new Date(),
      };
      const mockToken = 'jwt_token_123';

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue(hashedPassword);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (generateToken as jest.Mock).mockReturnValue(mockToken);

      await register(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerData.email },
      });
      expect(hashPassword).toHaveBeenCalledWith(registerData.password);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: registerData.email,
          password: hashedPassword,
          name: registerData.name,
          role: 'MEMBER',
        },
        select: expect.any(Object),
      });
      expect(generateToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { user: mockUser, token: mockToken },
      });
    });

    it('debería rechazar email ya registrado', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', email: registerData.email });

      await register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'El email ya está registrado',
        statusCode: 400,
      }));
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('debería manejar errores de base de datos', async () => {
      const dbError = new Error('Database connection failed');
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(dbError);

      await register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'user@example.com',
      password: 'Test123456',
    };

    beforeEach(() => {
      mockReq.body = loginData;
    });

    it('debería iniciar sesión exitosamente', async () => {
      const mockUser = {
        id: '1',
        email: loginData.email,
        name: 'Test User',
        role: 'MEMBER',
        password: 'hashed_password',
        createdAt: new Date(),
      };
      const mockToken = 'jwt_token_123';

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (generateToken as jest.Mock).mockReturnValue(mockToken);

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email },
      });
      expect(comparePassword).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(generateToken).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: expect.not.objectContaining({ password: expect.anything() }),
          token: mockToken,
        },
      });
    });

    it('debería rechazar usuario no existente', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Credenciales inválidas',
        statusCode: 401,
      }));
    });

    it('debería rechazar contraseña incorrecta', async () => {
      const mockUser = {
        id: '1',
        email: loginData.email,
        password: 'hashed_password',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Credenciales inválidas',
        statusCode: 401,
      }));
    });
  });

  describe('getMe', () => {
    it('debería obtener el perfil del usuario autenticado', async () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReq.user = {
        userId: '1',
        email: 'user@example.com',
        role: 'MEMBER',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await getMe(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { user: mockUser },
      });
    });

    it('debería rechazar si no hay usuario autenticado', async () => {
      await getMe(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'No autenticado',
        statusCode: 401,
      }));
    });

    it('debería manejar usuario no encontrado', async () => {
      mockReq.user = {
        userId: '999',
        email: 'nonexistent@example.com',
        role: 'MEMBER',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await getMe(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Usuario no encontrado',
        statusCode: 401,
      }));
    });
  });
});