import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { healthRouter } from './routes/health.js';
import { aiProxyRouter } from './routes/aiProxy.js';
import { apiRouter } from './routes/api/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { swaggerUi, specs } from './docs/swagger.js';
import { connectMongo } from './db/mongo.js';
import { bootstrapIndexes } from './db/bootstrap.js';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Trust the first proxy (needed when behind dev proxy to respect X-Forwarded-For)
app.set('trust proxy', 1);

// Serve static files from uploads directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const port = Number(process.env.PORT || 4000);
// Allow Vercel domains for CORS
const allowedOrigin = process.env.FRONTEND_URL || [
  'http://localhost:3000', // Development
  'https://datn-2025-rwsy-5kfgwgoff-bis-projects-90e2b389.vercel.app', // Frontend Vercel
  'https://datn-2025-rwsy-rag6yz4zq-bis-projects-90e2b389.vercel.app'  // Alternative Vercel
];

app.use(
  cors({
    origin: allowedOrigin === '*' ? true : allowedOrigin,
    credentials: true,
  })
);

// security middlewares
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.json());

app.use('/health', healthRouter);
app.use('/ai', aiProxyRouter);
app.use('/api', apiRouter);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Global error handler (must be last)
app.use(errorHandler);

// Socket.IO authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    socket.user = { id: payload.sub, role: payload.role, username: payload.username };
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.IO chat functionality
io.on('connection', (socket) => {
  console.log('User connected:', socket.user.username, socket.id);

  // Join user to their rooms
  socket.on('join', (userId) => {
    // Verify user can only join their own room
    if (userId !== socket.user.id) {
      socket.emit('error', { message: 'Unauthorized room access' });
      return;
    }
    socket.join(`user_${userId}`);
    console.log(`User ${socket.user.username} joined their room`);
  });

  // Join conversation room
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`User ${socket.user.username} joined conversation ${conversationId}`);
  });

  // Leave conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`User ${socket.user.username} left conversation ${conversationId}`);
  });

  // Handle typing indicator
  socket.on('typing_start', (conversationId) => {
    socket.to(`conversation_${conversationId}`).emit('user_typing', {
      userId: socket.user.id,
      username: socket.user.username,
      conversationId
    });
  });

  socket.on('typing_stop', (conversationId) => {
    socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
      userId: socket.user.id,
      username: socket.user.username,
      conversationId
    });
  });

  // Handle new message (real-time broadcast only)
  socket.on('send_message', (data) => {
  // This is just for broadcasting, actual message saving is done via API
  const { conversationId, message } = data;

  // Broadcast to all users in the conversation (except sender)
  socket.to(`conversation_${conversationId}`).emit('new_message', {
  conversationId,
  message
  });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.user.username, socket.id);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error for user', socket.user.username, ':', error);
  });
});

server.listen(port, async () => {
  await connectMongo();
  await bootstrapIndexes();
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});


