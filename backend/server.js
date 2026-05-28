import { createServer } from 'http';
import app from './app.js';
import { env } from './src/config/env.js';
import { connectDB } from './src/config/db.js';
import { startCronJobs } from './src/services/cron.service.js';
import { initSocket } from './src/services/socket.service.js';

// Connect Database
connectDB();

const PORT = env.PORT || 5000;

const httpServer = createServer(app);
initSocket(httpServer);

const server = httpServer.listen(PORT, () => {
  console.log(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  
  // Start background jobs
  startCronJobs();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
