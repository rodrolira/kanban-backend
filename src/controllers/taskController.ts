import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { NotFoundError, AuthorizationError, ValidationError } from '../utils/errors';
import { emitToBoard } from '../server';

/**
 * Crear una nueva tarea
 * POST /api/columns/:columnId/tasks
 */
export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { columnId } = req.params as { columnId: string };
    const { title, description, order, assigneeId } = req.body;

    // Validar campos requeridos
    if (!title || title.trim().length === 0) {
      throw new ValidationError('El título de la tarea es requerido');
    }

    // Verificar que la columna existe
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!column) {
      throw new NotFoundError('Columna');
    }

    // Verificar permisos
    if (column.board.ownerId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      throw new AuthorizationError('No tienes permiso para crear tareas en este tablero');
    }

    // Determinar el orden de la nueva tarea
    let taskOrder = order;
    if (taskOrder === undefined || taskOrder === null) {
      const lastTask = await prisma.task.findFirst({
        where: { columnId },
        orderBy: { order: 'desc' },
      });
      taskOrder = lastTask ? lastTask.order + 1 : 0;
    }

    // Crear la tarea
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        order: taskOrder,
        columnId: columnId,
        assigneeId: assigneeId || null,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 🔥 Emitir evento de creación
    emitToBoard(column.boardId, 'task:created', {
      task: task,
      boardId: column.boardId,
      columnId: column.id,
    });

    console.log(
      `📝 Tarea creada: ${task.title} en columna ${column.title} (Board: ${column.boardId})`
    );

    res.status(201).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todas las tareas de una columna
 * GET /api/columns/:columnId/tasks
 */
export const getTasksByColumn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { columnId } = req.params as { columnId: string };

    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: true,
      },
    });

    if (!column) {
      throw new NotFoundError('Columna');
    }

    // Verificar acceso
    if (column.board.ownerId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      throw new AuthorizationError('No tienes permiso para ver estas tareas');
    }

    const tasks = await prisma.task.findMany({
      where: { columnId: columnId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    res.json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener una tarea específica por ID
 * GET /api/tasks/:taskId
 */
export const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params as { taskId: string };

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        column: {
          include: {
            board: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundError('Tarea');
    }

    // Verificar acceso
    if (task.column.board.ownerId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      throw new AuthorizationError('No tienes permiso para ver esta tarea');
    }

    res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar una tarea existente
 * PUT /api/tasks/:taskId
 */
export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params as { taskId: string };
    const { title, description, order, columnId, assigneeId } = req.body;

    // Verificar que la tarea existe
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          include: {
            board: {
              include: {
                owner: true,
              },
            },
          },
        },
      },
    });

    if (!existingTask) {
      throw new NotFoundError('Tarea');
    }

    // Verificar permisos
    if (existingTask.column.board.ownerId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      throw new AuthorizationError('No tienes permiso para modificar esta tarea');
    }

    let updatedTask;
    const boardId = existingTask.column.boardId;

    // Caso 1: La tarea se mueve a una columna diferente
    if (columnId && columnId !== existingTask.columnId) {
      // Verificar que la columna destino existe
      const destinationColumn = await prisma.column.findUnique({
        where: { id: columnId },
        include: { board: true },
      });

      if (!destinationColumn) {
        throw new NotFoundError('Columna destino');
      }

      if (destinationColumn.boardId !== boardId) {
        throw new ValidationError('No se puede mover una tarea a una columna de otro tablero');
      }

      // Usar transacción para mantener consistencia
      await prisma.$transaction(async (tx) => {
        // 1. Reordenar tareas en la columna origen (remover la tarea)
        await tx.task.updateMany({
          where: {
            columnId: existingTask.columnId,
            order: { gt: existingTask.order },
          },
          data: {
            order: { decrement: 1 },
          },
        });

        // 2. Determinar el nuevo orden en la columna destino
        let newOrder = order;
        if (newOrder === undefined || newOrder === null) {
          const lastTask = await tx.task.findFirst({
            where: { columnId: columnId },
            orderBy: { order: 'desc' },
          });
          newOrder = lastTask ? lastTask.order + 1 : 0;
        } else {
          // Hacer espacio para la tarea movida
          await tx.task.updateMany({
            where: {
              columnId: columnId,
              order: { gte: newOrder },
            },
            data: {
              order: { increment: 1 },
            },
          });
        }

        // 3. Actualizar la tarea con la nueva columna y orden
        updatedTask = await tx.task.update({
          where: { id: taskId },
          data: {
            title: title?.trim() || existingTask.title,
            description:
              description !== undefined ? description?.trim() || null : existingTask.description,
            order: newOrder,
            columnId: columnId,
            assigneeId: assigneeId !== undefined ? assigneeId || null : existingTask.assigneeId,
          },
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
      });

      if (!updatedTask) {
        throw new Error('Error al actualizar la tarea');
      }

      // 🔥 Emitir evento de movimiento de tarea
      emitToBoard(existingTask.column.boardId, 'task:moved', {
        taskId,
        sourceColumnId: existingTask.columnId,
        destinationColumnId: columnId,
        newOrder: order || 0,
        task: updatedTask,
        boardId: existingTask.column.boardId,
        userId: req.user?.userId, // 👈 Añadir el ID del usuario que hizo el cambio
      });

      console.log(
        `🔄 Tarea movida: ${existingTask.title} de columna ${existingTask.columnId} a ${columnId}`
      );
    } else {
      // Caso 2: Actualización simple (misma columna)
      let newOrder = order;

      // Si se está cambiando el orden dentro de la misma columna
      if (newOrder !== undefined && newOrder !== null && newOrder !== existingTask.order) {
        await prisma.$transaction(async (tx) => {
          if (newOrder > existingTask.order) {
            // Mover hacia abajo: los elementos intermedios suben
            await tx.task.updateMany({
              where: {
                columnId: existingTask.columnId,
                order: { gt: existingTask.order, lte: newOrder },
              },
              data: {
                order: { decrement: 1 },
              },
            });
          } else if (newOrder < existingTask.order) {
            // Mover hacia arriba: los elementos intermedios bajan
            await tx.task.updateMany({
              where: {
                columnId: existingTask.columnId,
                order: { gte: newOrder, lt: existingTask.order },
              },
              data: {
                order: { increment: 1 },
              },
            });
          }

          // Actualizar la tarea
          updatedTask = await tx.task.update({
            where: { id: taskId },
            data: {
              title: title?.trim() || existingTask.title,
              description:
                description !== undefined ? description?.trim() || null : existingTask.description,
              order: newOrder,
              assigneeId: assigneeId !== undefined ? assigneeId || null : existingTask.assigneeId,
            },
            include: {
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });
        });
      } else {
        // Actualización simple sin cambio de orden
        updatedTask = await prisma.task.update({
          where: { id: taskId },
          data: {
            title: title?.trim() || existingTask.title,
            description:
              description !== undefined ? description?.trim() || null : existingTask.description,
            assigneeId: assigneeId !== undefined ? assigneeId || null : existingTask.assigneeId,
          },
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
      }

      if (!updatedTask) {
        throw new Error('Error al actualizar la tarea');
      }

      // 🔥 Emitir evento de actualización
      emitToBoard(boardId, 'task:updated', {
        task: updatedTask,
        boardId: boardId,
      });

      console.log(`✏️ Tarea actualizada: ${updatedTask.title}`);
    }

    res.json({
      success: true,
      data: { task: updatedTask },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar una tarea
 * DELETE /api/tasks/:taskId
 */
export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params as { taskId: string };

    // Verificar que la tarea existe
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          include: {
            board: {
              include: {
                owner: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundError('Tarea');
    }

    // Verificar permisos
    if (task.column.board.ownerId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      throw new AuthorizationError('No tienes permiso para eliminar esta tarea');
    }

    const boardId = task.column.boardId;
    const columnId = task.columnId;
    const deletedOrder = task.order;

    // Usar transacción para reordenar las tareas restantes
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar la tarea
      await tx.task.delete({
        where: { id: taskId },
      });

      // 2. Reordenar las tareas que estaban después
      await tx.task.updateMany({
        where: {
          columnId: columnId,
          order: { gt: deletedOrder },
        },
        data: {
          order: { decrement: 1 },
        },
      });
    });

    // 🔥 Emitir evento de eliminación
    emitToBoard(boardId, 'task:deleted', {
      taskId: task.id,
      columnId: columnId,
      boardId: boardId,
    });

    console.log(`🗑️ Tarea eliminada: ${task.title}`);

    res.json({
      success: true,
      message: 'Tarea eliminada correctamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reordenar múltiples tareas dentro de la misma columna
 * POST /api/tasks/reorder
 */
export const reorderTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { columnId, taskIds } = req.body;

    if (!columnId) {
      throw new ValidationError('columnId es requerido');
    }

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new ValidationError('taskIds debe ser un array no vacío');
    }

    // Verificar que la columna existe
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!column) {
      throw new NotFoundError('Columna');
    }

    // Verificar permisos
    if (column.board.ownerId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      throw new AuthorizationError('No tienes permiso para reordenar tareas');
    }

    // Verificar que todas las tareas existen y pertenecen a la columna
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        columnId: columnId,
      },
    });

    if (tasks.length !== taskIds.length) {
      throw new ValidationError('Algunas tareas no existen o no pertenecen a esta columna');
    }

    // Actualizar el orden de cada tarea
    await prisma.$transaction(
      taskIds.map((taskId: string, index: number) =>
        prisma.task.update({
          where: { id: taskId },
          data: { order: index },
        })
      )
    );

    // Obtener las tareas actualizadas
    const updatedTasks = await prisma.task.findMany({
      where: { columnId: columnId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // 🔥 Emitir evento de reordenamiento
    emitToBoard(column.boardId, 'tasks:reordered', {
      columnId: columnId,
      taskIds: taskIds,
      tasks: updatedTasks,
      boardId: column.boardId,
    });

    console.log(`🔄 Tareas reordenadas en columna ${column.title}`);

    res.json({
      success: true,
      message: 'Tareas reordenadas correctamente',
      data: { tasks: updatedTasks },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Asignar/Reasignar una tarea a un usuario
 * PATCH /api/tasks/:taskId/assign
 */
export const assignTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params as { taskId: string };
    const { assigneeId } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          include: {
            board: true,
          },
        },
        assignee: true,
      },
    });

    if (!task) {
      throw new NotFoundError('Tarea');
    }

    // Verificar permisos
    if (task.column.board.ownerId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      throw new AuthorizationError('No tienes permiso para asignar esta tarea');
    }

    // Verificar que el usuario asignado existe (si no es null)
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
      });

      if (!assignee) {
        throw new NotFoundError('Usuario a asignar');
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { assigneeId: assigneeId || null },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 🔥 Emitir evento de actualización
    emitToBoard(task.column.boardId, 'task:updated', {
      task: updatedTask,
      boardId: task.column.boardId,
    });

    res.json({
      success: true,
      data: { task: updatedTask },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todas las tareas asignadas a un usuario
 * GET /api/tasks/assigned-to-me
 */
export const getMyTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AuthorizationError('Usuario no autenticado');
    }

    const tasks = await prisma.task.findMany({
      where: { assigneeId: req.user.userId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        column: {
          include: {
            board: {
              select: {
                id: true,
                name: true,
                ownerId: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Buscar tareas por título o descripción
 * GET /api/tasks/search?q=keyword&boardId=...
 */
export const searchTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, boardId } = req.query as { q: string; boardId?: string };

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      throw new ValidationError('Término de búsqueda requerido');
    }

    const whereClause: any = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    };

    // Filtrar por tablero si se especifica
    if (boardId && typeof boardId === 'string') {
      const board = await prisma.board.findUnique({
        where: { id: boardId },
      });

      if (!board) {
        throw new NotFoundError('Tablero');
      }

      if (board.ownerId !== req.user?.userId && req.user?.role !== 'ADMIN') {
        throw new AuthorizationError('No tienes permiso para buscar en este tablero');
      }

      whereClause.column = {
        boardId: boardId,
      };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        column: {
          include: {
            board: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: { tasks, count: tasks.length },
    });
  } catch (error) {
    next(error);
  }
};
