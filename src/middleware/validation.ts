import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';

// Reglas de validación para registro de usuario
export const validateRegister = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/[A-Z]/)
    .withMessage('La contraseña debe tener al menos una mayúscula')
    .matches(/[0-9]/)
    .withMessage('La contraseña debe tener al menos un número'),
  body('name')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
];

// Reglas de validación para login
export const validateLogin = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
];

// Reglas para crear/actualizar tablero
export const validateBoard = [
  body('name')
    .notEmpty()
    .withMessage('El nombre del tablero es requerido')
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre debe tener entre 1 y 100 caracteres'),
];

// Reglas para crear/actualizar columna
export const validateColumn = [
  body('title')
    .notEmpty()
    .withMessage('El título de la columna es requerido')
    .isLength({ min: 1, max: 50 })
    .withMessage('El título debe tener entre 1 y 50 caracteres'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El orden debe ser un número entero positivo'),
];

// Reglas para CREAR tarea (título es OBLIGATORIO)
export const validateCreateTask = [
  body('title')
    .notEmpty()
    .withMessage('El título de la tarea es requerido')
    .isLength({ min: 1, max: 200 })
    .withMessage('El título debe tener entre 1 y 200 caracteres'),
  body('description')
    .optional()
    .isString()
    .withMessage('La descripción debe ser texto'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El orden debe ser un número entero positivo'),
  body('assigneeId')
    .optional()
    .isString()
    .withMessage('assigneeId debe ser texto'),
];

// Reglas para ACTUALIZAR tarea (título es OPCIONAL - solo para mover entre columnas)
export const validateUpdateTask = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('El título debe tener entre 1 y 200 caracteres'),
  body('description')
    .optional()
    .isString()
    .withMessage('La descripción debe ser texto'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El orden debe ser un número entero positivo'),
  body('columnId')
    .optional()
    .isString()
    .withMessage('columnId debe ser texto'),
  body('assigneeId')
    .optional()
    .isString()
    .withMessage('assigneeId debe ser texto'),
];

// Mantener validateTask para compatibilidad (usa las reglas de creación)
export const validateTask = validateCreateTask;

// Middleware para verificar resultados de validación
export const checkValidation = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);
    throw new ValidationError(errorMessages.join(', '));
  }

  next();
};