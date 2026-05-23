import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateCreateTask, validateUpdateTask, checkValidation } from '../middleware/validation';
import {
  createTask,
  getTasksByColumn,
  getTaskById,
  updateTask,
  deleteTask,
  reorderTasks,
  assignTask,
  getMyTasks,
  searchTasks
} from '../controllers/taskController';

const router = Router();

// Todas las rutas de tareas requieren autenticación
router.use(authenticate);

// Rutas de búsqueda y listado (deben ir antes de rutas con parámetros)
router.get('/search', searchTasks);
router.get('/assigned-to-me', getMyTasks);

// Rutas para tareas específicas
router.get('/:taskId', getTaskById);
// ✅ PUT - usa validateUpdateTask (título es OPCIONAL para mover entre columnas)
router.put('/:taskId', validateUpdateTask, checkValidation, updateTask);
router.delete('/:taskId', deleteTask);
router.patch('/:taskId/assign', assignTask);

// Rutas para reordenamiento
router.post('/reorder', reorderTasks);

// Rutas para tareas por columna
router.get('/columns/:columnId/tasks', getTasksByColumn);
// ✅ POST - usa validateCreateTask (título es OBLIGATORIO para crear)
router.post('/columns/:columnId/tasks', validateCreateTask, checkValidation, createTask);

export default router;