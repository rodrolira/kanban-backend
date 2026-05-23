import { Router } from 'express';
import {
  getBoards,
  getBoardById,
  createBoard,
  updateBoard,
  deleteBoard
} from '../controllers/boardController';
import { authenticate } from '../middleware/auth';
import { validateBoard, checkValidation } from '../middleware/validation';

const router = Router();

// Todas las rutas de boards requieren autenticación
router.use(authenticate);

router.get('/', getBoards);
router.get('/:boardId', getBoardById);
router.post('/', validateBoard, checkValidation, createBoard);
router.put('/:boardId', validateBoard, checkValidation, updateBoard);
router.delete('/:boardId', deleteBoard);

export default router;