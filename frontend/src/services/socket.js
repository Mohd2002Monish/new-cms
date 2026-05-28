import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (token) => {
  if (socket) return socket;

  const url = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace('/api', '') 
    : 'http://localhost:5000';

  socket = io(url, {
    auth: { token },
  });

  socket.on('connect', () => {
    console.log('Connected to notification socket', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from socket');
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
