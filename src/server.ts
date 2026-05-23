import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { verifyToken } from './utils/jwt';

// Cargar variables de entorno con opciones específicas
dotenv.config({ path: '.env' });

// Verificar variables críticas
if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR CRÍTICO: JWT_SECRET no está definido en .env');
  console.error('Por favor, añade JWT_SECRET a tu archivo .env');
  process.exit(1);
}

console.log('✅ JWT_SECRET está configurado correctamente');

import { app } from './app';

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Configurar Socket.io con autenticación
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Middleware para autenticar sockets
io.use(async (socket: Socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return next(new Error('Authentication error: Invalid token'));
    }
    
    // Adjuntar usuario al socket
    socket.data.user = decoded;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Manejar conexiones de sockets
io.on('connection', (socket: Socket) => {
  const user = socket.data.user;
  console.log(`✅ Usuario conectado: ${user?.email} (${socket.id})`);
  
  // Unir al usuario a una sala personal
  socket.join(`user:${user?.userId}`);
  
  socket.on('join-board', (boardId: string) => {
    socket.join(`board:${boardId}`);
    console.log(`📌 Usuario ${user?.email} se unió al tablero ${boardId}`);
  });
  
  socket.on('leave-board', (boardId: string) => {
    socket.leave(`board:${boardId}`);
    console.log(`👋 Usuario ${user?.email} salió del tablero ${boardId}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`❌ Usuario desconectado: ${user?.email} (${socket.id})`);
  });
});

// Función para emitir eventos a los usuarios de un tablero
export const emitToBoard = (boardId: string, event: string, data: any) => {
  io.to(`board:${boardId}`).emit(event, data);
};

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📡 Socket.io disponible en ws://localhost:${PORT}`);
  console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

export { io };