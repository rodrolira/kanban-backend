import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/lib/prisma';

describe('Auth API Integration', () => {
  describe('POST /api/auth/register', () => {
    it('debería registrar un nuevo usuario', async () => {
      const newUser = {
        email: 'integration@test.com',
        password: 'Test123456',
        name: 'Integration Test',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: '123',
        ...newUser,
        password: 'hashed',
        role: 'MEMBER',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('debería validar email inválido', async () => {
      const invalidUser = {
        email: 'not-an-email',
        password: 'Test123456',
        name: 'Test',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Email inválido');
    });

    it('debería validar contraseña débil', async () => {
      const weakPasswordUser = {
        email: 'test@example.com',
        password: '123',
        name: 'Test',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordUser);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('La contraseña debe tener al menos 6 caracteres');
    });
  });

  describe('POST /api/auth/login', () => {
    it('debería iniciar sesión con credenciales correctas', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Test123456',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: loginData.email,
        password: '$2a$10$hashedpassword',
        name: 'Test User',
        role: 'MEMBER',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
    });
  });
});