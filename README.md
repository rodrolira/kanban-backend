<div align="center">

# Kanban API

[![CI/CD](https://github.com/rodrolira/kanban-backend/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/rodrolira/kanban-backend/actions/workflows/backend-ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)](https://github.com/rodrolira/kanban-backend)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Railway](https://img.shields.io/badge/Railway-Deployed-0B0D0E)](https://railway.app)

</div>

# 📦 Kanban Backend API

API RESTful y WebSocket para aplicación Kanban en tiempo real con autenticación JWT y roles de usuario.

## ✨ Características

- ✅ **Autenticación JWT** con registro/login
- ✅ **Roles de usuario** (ADMIN / MEMBER)
- ✅ **CRUD completo** de tableros, columnas y tareas
- ✅ **Tiempo real** con Socket.io
- ✅ **Drag & Drop** persistente
- ✅ **Validaciones** con express-validator
- ✅ **Testing** con Jest (cobertura >85%)
- ✅ **Seguridad** (Helmet, rate limiting, sanitización)

## 🚀 Tecnologías

| Categoría | Tecnologías |
|-----------|-------------|
| **Runtime** | Node.js |
| **Framework** | Express |
| **Lenguaje** | TypeScript |
| **Base de Datos** | PostgreSQL + Prisma |
| **Tiempo Real** | Socket.io |
| **Autenticación** | JWT + bcryptjs |
| **Testing** | Jest + Supertest |
| **Seguridad** | Helmet, express-rate-limit |

## 📋 Requisitos Previos

- Node.js >= 18
- PostgreSQL >= 14
- npm o yarn

## 🔧 Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/rodrolira/kanban-backend.git
cd kanban-backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Crear base de datos
npx prisma migrate dev --name init

# Ejecutar seed (crea usuario admin y demo board)
npx prisma db seed

# Iniciar servidor de desarrollo
npm run dev
