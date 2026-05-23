import dotenv from 'dotenv';
import { jest, afterEach } from '@jest/globals';

// Cargar variables de entorno para testing
dotenv.config({ path: '.env.test' });

// Crear un mock de prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  board: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  column: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  task: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn((callback: any) => callback(mockPrisma)),
  $disconnect: jest.fn(),
};

// Mock de Prisma
jest.mock('../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Limpiar mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
});