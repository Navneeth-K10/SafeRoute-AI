require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const http = require('http');
const socketManager = require('./sockets/socketManager');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
socketManager.init(server);

async function startServer() {
  try {
    await connectDB();
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`SafeRoute running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start SafeRoute server:', err);
    process.exit(1);
  }
}

process.on('uncaughtException', (err) => {
  console.error('[SERVER] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER] Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();


