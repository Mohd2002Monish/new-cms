import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      // Treat invalid token as guest instead of rejecting connection
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.user ? socket.user.id : 'Guest'})`);
    
    if (socket.user) {
      socket.join(`user_${socket.user.id}`);
    }

    // Live Blog Room Handling
    socket.on('join_article', (slug) => {
      socket.join(`article_${slug}`);
      console.log(`Socket ${socket.id} joined article room: article_${slug}`);
    });

    socket.on('leave_article', (slug) => {
      socket.leave(`article_${slug}`);
      console.log(`Socket ${socket.id} left article room: article_${slug}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

export const emitToUser = (userId, eventName, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(eventName, data);
  }
};
