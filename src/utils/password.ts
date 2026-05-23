import bcrypt from 'bcryptjs';

// Número de rondas de hashing (mayor = más seguro pero más lento)
const SALT_ROUNDS = 10;

/**
 * Hashea una contraseña en texto plano
 * @param password - Contraseña sin hashear
 * @returns Hash de la contraseña
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compara una contraseña con su hash
 * @param password - Contraseña en texto plano
 * @param hash - Hash almacenado en la BD
 * @returns true si coinciden
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};