import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createColumn,
  updateColumn,
  deleteColumn,
  getColumnsByBoard,
  getColumnById,
  reorderColumns,
} from '../controllers/columnController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de reordenamiento
router.post('/reorder', reorderColumns);

// Rutas para columnas por tablero
router.get('/boards/:boardId/columns', getColumnsByBoard);
router.post('/boards/:boardId/columns', createColumn);

// Rutas para columnas específicas
router.get('/columns/:columnId', getColumnById);
router.put('/columns/:columnId', updateColumn);
router.delete('/columns/:columnId', deleteColumn);

export default router;
