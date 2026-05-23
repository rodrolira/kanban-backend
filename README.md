# Kanban Backend API

API RESTful y WebSocket para aplicación Kanban en tiempo real.

## 🚀 Tecnologías

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **TypeScript** - Tipado estático
- **Prisma** - ORM para PostgreSQL
- **Socket.io** - Comunicación en tiempo real
- **JWT** - Autenticación
- **Jest** - Testing
- **Railway** - Despliegue

## 📋 Requisitos Previos

- Node.js >= 18
- PostgreSQL >= 14
- npm o yarn

## 🔧 Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/kanban-backend.git
cd kanban-backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Crear base de datos
npx prisma migrate dev --name init

# Ejecutar seed (opcional)
npx prisma db seed

# Iniciar servidor de desarrollo
npm run dev
