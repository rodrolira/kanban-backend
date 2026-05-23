import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { NotFoundError, AuthorizationError } from '../utils/errors';
import { emitToBoard } from '../server';

/**
 * Crear una nueva columna
 * POST /api/columns/boards/:boardId/columns
 */
export const createColumn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { boardId } = req.params as { boardId: string };
    const { title, order } = req.body;

    // Validar campos requeridos
    if (!title || title.trim().length === 0) {
      throw new Error('El título de la columna es requerido');
    }

    // Verificar que el tablero existe
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new NotFoundError('Tablero');
    }

    // Verificar permisos
    if (board.ownerId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      throw new AuthorizationError('No tienes permiso para modificar este tablero');
    }

    // Determinar el orden de la nueva columna
    let columnOrder = order;
    if (columnOrder === undefined || columnOrder === null) {
      const lastColumn = await prisma.column.findFirst({
        where: { boardId: boardId },
        orderBy: { order: 'desc' },
      });
      columnOrder = lastColumn ? lastColumn.order + 1 : 0;
    }

    // Crear la columna
    const column = await prisma.column.create({
      data: {
        title: title.trim(),
        order: columnOrder,
        boardId: boardId,
      },
      include: {
        tasks: true,
      },
    });

    // 🔥 Emitir evento de creación
    emitToBoard(boardId, 'column:created', {
      column: column,
      boardId: boardId,
    });

    console.log(`📌 Columna creada: ${column.title} en tablero ${board.name}`);

    res.status(201).json({
      success: true,
      data: { column },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar una columna
 * PUT /api/columns/columns/:columnId
 */
export const updateColumn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { columnId } = req.params as { columnId: string };
    const { title, order } = req.body;

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
      throw new AuthorizationError('No tienes permiso para modificar esta columna');
    }

    // Actualizar la columna
    const updatedColumn = await prisma.column.update({
      where: { id: columnId },
      data: {
        title: title?.trim() || column.title,
        order: order !== undefined ? order : column.order,
      },
    });

    // 🔥 Emitir evento de actualización
    emitToBoard(column.boardId, 'column:updated', {
      column: updatedColumn,
      boardId: column.boardId,
    });

    console.log(`✏️ Columna actualizada: ${updatedColumn.title}`);

    res.json({
      success: true,
      data: { column: updatedColumn },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar una columna
 * DELETE /api/columns/columns/:columnId
 */
export const deleteColumn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { columnId } = req.params as { columnId: string };

    // Verificar que la columna existe
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: {
          include: {
            owner: true,
          },
        },
        tasks: true,
      },
    });

    if (!column) {
      throw new NotFoundError('Columna');
    }

    // Verificar permisos
    if (column.board.ownerId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      throw new AuthorizationError('No tienes permiso para eliminar esta columna');
    }

    const boardId = column.boardId;
    const deletedOrder = column.order;

    // Usar transacción para eliminar la columna y reordenar las restantes
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar todas las tareas de la columna
      await tx.task.deleteMany({
        where: { columnId: columnId },
      });

      // 2. Eliminar la columna
      await tx.column.delete({
        where: { id: columnId },
      });

      // 3. Reordenar las columnas restantes
      await tx.column.updateMany({
        where: {
          boardId: boardId,
          order: { gt: deletedOrder },
        },
        data: {
          order: { decrement: 1 },
        },
      });
    });

    // 🔥 Emitir evento de eliminación
    emitToBoard(boardId, 'column:deleted', {
      columnId: columnId,
      boardId: boardId,
    });

    console.log(`🗑️ Columna eliminada: ${column.title} con ${column.tasks.length} tareas`);

    res.json({
      success: true,
      message: 'Columna eliminada correctamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todas las columnas de un tablero
 * GET /api/columns/boards/:boardId/columns
 */
export const getColumnsByBoard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { boardId } = req.params as { boardId: string };

    // Verificar que el tablero existe
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new NotFoundError('Tablero');
    }

    // Verificar acceso
    if (board.ownerId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      throw new AuthorizationError('No tienes permiso para ver este tablero');
    }

    const columns = await prisma.column.findMany({
      where: { boardId: boardId },
      include: {
        tasks: {
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
        },
      },
      orderBy: { order: 'asc' },
    });

    res.json({
      success: true,
      data: { columns },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener una columna específica por ID
 * GET /api/columns/columns/:columnId
 */
export const getColumnById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { columnId } = req.params as { columnId: string };

    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: true,
        tasks: {
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
        },
      },
    });

    if (!column) {
      throw new NotFoundError('Columna');
    }

    // Verificar acceso
    if (column.board.ownerId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      throw new AuthorizationError('No tienes permiso para ver esta columna');
    }

    res.json({
      success: true,
      data: { column },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reordenar columnas dentro de un tablero
 * POST /api/columns/reorder
 */
export const reorderColumns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { boardId, columnIds } = req.body;

    if (!boardId) {
      throw new Error('boardId es requerido');
    }

    if (!Array.isArray(columnIds) || columnIds.length === 0) {
      throw new Error('columnIds debe ser un array no vacío');
    }

    // Verificar que el tablero existe
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new NotFoundError('Tablero');
    }

    // Verificar permisos
    if (board.ownerId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      throw new AuthorizationError('No tienes permiso para reordenar columnas');
    }

    // Verificar que todas las columnas existen y pertenecen al tablero
    const columns = await prisma.column.findMany({
      where: {
        id: { in: columnIds },
        boardId: boardId,
      },
    });

    if (columns.length !== columnIds.length) {
      throw new Error('Algunas columnas no existen o no pertenecen a este tablero');
    }

    // Actualizar el orden de cada columna
    await prisma.$transaction(
      columnIds.map((columnId: string, index: number) =>
        prisma.column.update({
          where: { id: columnId },
          data: { order: index },
        })
      )
    );

    // Obtener las columnas actualizadas
    const updatedColumns = await prisma.column.findMany({
      where: { boardId: boardId },
      orderBy: { order: 'asc' },
    });

    // 🔥 Emitir evento de reordenamiento
    emitToBoard(boardId, 'columns:reordered', {
      columnIds: columnIds,
      columns: updatedColumns,
      boardId: boardId,
    });

    console.log(`🔄 Columnas reordenadas en tablero ${board.name}`);

    res.json({
      success: true,
      message: 'Columnas reordenadas correctamente',
      data: { columns: updatedColumns },
    });
  } catch (error) {
    next(error);
  }
};
