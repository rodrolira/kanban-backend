import { hashPassword, comparePassword } from '../../src/utils/password';

describe('Password Utils', () => {
  const plainPassword = 'Test123456';
  let hashedPassword: string;

  describe('hashPassword', () => {
    it('debería hashear una contraseña correctamente', async () => {
      hashedPassword = await hashPassword(plainPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword.length).toBeGreaterThan(20);
    });

    it('debería generar hashes diferentes para la misma contraseña', async () => {
      const hash1 = await hashPassword(plainPassword);
      const hash2 = await hashPassword(plainPassword);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    beforeEach(async () => {
      hashedPassword = await hashPassword(plainPassword);
    });

    it('debería validar una contraseña correcta', async () => {
      const isValid = await comparePassword(plainPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('debería rechazar una contraseña incorrecta', async () => {
      const isValid = await comparePassword('WrongPassword123', hashedPassword);
      expect(isValid).toBe(false);
    });

    it('debería rechazar contraseña vacía', async () => {
      const isValid = await comparePassword('', hashedPassword);
      expect(isValid).toBe(false);
    });
  });
});