import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { NotFoundError, AuthorizationError } from '../utils/errors';

// Helper para asegurar que un parámetro es string
const ensureString = (param: string | string[] | undefined): string => {
  if (!param) throw new Error('Parámetro requerido');
  return Array.isArray(param) ? param[0] : param;
};

/**
 * Obtener todos los tableros del usuario autenticado
 * GET /api/boards
 */
export const getBoards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AuthorizationError('No autenticado');
    }

    const boards = await prisma.board.findMany({
      where: { ownerId: req.user.userId },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: { boards }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener un tablero específico con todas sus columnas y tareas
 * GET /api/boards/:boardId
 */
export const getBoardById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { boardId } = req.params;
    // Asegurar que boardId es string
    const id = ensureString(boardId);

    const board = await prisma.board.findUnique({
      where: { id }, // Usamos la variable asegurada
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: {
                assignee: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!board) {
      throw new NotFoundError('Tablero');
    }

    // Verificar que el usuario tenga acceso (owner o admin)
    if (req.user?.role !== 'ADMIN' && board.ownerId !== req.user?.userId) {
      throw new AuthorizationError('No tienes acceso a este tablero');
    }

    res.json({
      success: true,
      data: { board }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear un nuevo tablero
 * POST /api/boards
 */
export const createBoard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    
    if (!req.user) {
      throw new AuthorizationError('No autenticado');
    }

    // Crear tablero con columnas por defecto
    const board = await prisma.board.create({
      data: {
        name,
        ownerId: req.user.userId,
        columns: {
          create: [
            { title: 'To Do', order: 0 },
            { title: 'In Progress', order: 1 },
            { title: 'Done', order: 2 }
          ]
        }
      },
      include: {
        columns: true
      }
    });

    res.status(201).json({
      success: true,
      data: { board }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar un tablero
 * PUT /api/boards/:boardId
 */
export const updateBoard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { boardId } = req.params;
    const { name } = req.body;
    
    // Asegurar que boardId es string
    const id = ensureString(boardId);

    // Verificar que el tablero existe y el usuario es owner
    const existingBoard = await prisma.board.findUnique({
      where: { id } // Usamos la variable asegurada
    });

    if (!existingBoard) {
      throw new NotFoundError('Tablero');
    }

    if (existingBoard.ownerId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      throw new AuthorizationError('No tienes permiso para actualizar este tablero');
    }

    const board = await prisma.board.update({
      where: { id }, // Usamos la variable asegurada
      data: { name },
      include: {
        columns: {
          include: { tasks: true }
        }
      }
    });

    res.json({
      success: true,
      data: { board }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar un tablero
 * DELETE /api/boards/:boardId
 */
export const deleteBoard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { boardId } = req.params;
    // Asegurar que boardId es string
    const id = ensureString(boardId);

    const existingBoard = await prisma.board.findUnique({
      where: { id } // Usamos la variable asegurada
    });

    if (!existingBoard) {
      throw new NotFoundError('Tablero');
    }

    if (existingBoard.ownerId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      throw new AuthorizationError('No tienes permiso para eliminar este tablero');
    }

    await prisma.board.delete({
      where: { id } // Usamos la variable asegurada
    });

    res.json({
      success: true,
      message: 'Tablero eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
};