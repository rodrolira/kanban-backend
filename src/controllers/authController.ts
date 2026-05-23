import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AuthenticationError, ValidationError } from '../utils/errors';

/**
 * Registro de nuevo usuario
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ValidationError('El email ya está registrado');
    }

    // Hashear contraseña
    const hashedPassword = await hashPassword(password);

    // Crear usuario en BD
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'MEMBER' // Por defecto, nuevo usuario es MEMBER
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    // === NUEVO: Crear un tablero por defecto para el usuario ===
    console.log(`Creando tablero por defecto para usuario: ${user.email}`);
    
    try {
      const defaultBoard = await prisma.board.create({
        data: {
          name: 'Mi Primer Tablero',
          ownerId: user.id,
          columns: {
            create: [
              { 
                title: '📝 Por Hacer', 
                order: 0,
                tasks: {
                  create: [
                    { 
                      title: '🎉 Bienvenido a Kanban Flow',
                      description: 'Esta es tu primera tarea. ¡Puedes arrastrarla a otras columnas!',
                      order: 0 
                    },
                    { 
                      title: '✨ Crear una nueva tarea',
                      description: 'Haz clic en el botón "+" para añadir más tareas',
                      order: 1 
                    }
                  ]
                }
              },
              { 
                title: '🚧 En Progreso', 
                order: 1,
                tasks: {
                  create: [
                    { 
                      title: '🚀 Configurar tu proyecto',
                      description: 'Personaliza este tablero según tus necesidades',
                      order: 0 
                    }
                  ]
                }
              },
              { 
                title: '✅ Completado', 
                order: 2,
                tasks: {
                  create: [
                    { 
                      title: '🎯 Registrar usuario exitoso',
                      description: 'Has completado el registro correctamente',
                      order: 0 
                    }
                  ]
                }
              },
            ]
          }
        },
        include: {
          columns: {
            include: {
              tasks: true
            }
          }
        }
      });
      
      console.log(`Tablero por defecto creado: ${defaultBoard.name} (ID: ${defaultBoard.id})`);
      console.log(`Columnas creadas: ${defaultBoard.columns.length}`);
    } catch (boardError) {
      console.error('Error al crear tablero por defecto:', boardError);
      // No lanzamos error para que el registro sea exitoso aunque falle el board
    }

    // Generar token JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    res.status(201).json({
      success: true,
      data: { 
        user, 
        token,
        message: 'Usuario registrado exitosamente. Se ha creado un tablero por defecto.'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login de usuario existente
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new AuthenticationError('Credenciales inválidas');
    }

    // Verificar contraseña
    const isValidPassword = await comparePassword(password, user.password);
    
    if (!isValidPassword) {
      throw new AuthenticationError('Credenciales inválidas');
    }

    // Verificar si el usuario ya tiene tableros (si no, crear uno por defecto)
    const userBoards = await prisma.board.count({
      where: { ownerId: user.id }
    });

    if (userBoards === 0) {
      console.log(`Usuario ${user.email} no tiene tableros. Creando tablero por defecto...`);
      
      try {
        const defaultBoard = await prisma.board.create({
          data: {
            name: 'Mi Primer Tablero',
            ownerId: user.id,
            columns: {
              create: [
                { title: '📝 Por Hacer', order: 0 },
                { title: '🚧 En Progreso', order: 1 },
                { title: '✅ Completado', order: 2 },
              ]
            }
          }
        });
        console.log(`Tablero por defecto creado: ${defaultBoard.name}`);
      } catch (boardError) {
        console.error('Error al crear tablero por defecto en login:', boardError);
      }
    }

    // Generar token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // No enviar el password en la respuesta
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener perfil del usuario autenticado
 * GET /api/auth/me
 */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('No autenticado');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new AuthenticationError('Usuario no encontrado');
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};