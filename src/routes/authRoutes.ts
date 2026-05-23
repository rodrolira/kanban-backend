import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { validateRegister, validateLogin, checkValidation } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

// Rutas públicas
router.post('/register', validateRegister, checkValidation, register);
router.post('/login', validateLogin, checkValidation, login);

// Rutas protegidas
router.get('/me', authenticate, getMe);

export default router;