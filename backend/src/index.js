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

// For Vercel serverless, don't create HTTP server
const server = process.env.VERCEL ? null : createServer(app);

// Initialize Socket.IO only if server exists
let io = null;
if (server) {
  try {
    io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    console.log('Socket.IO initialized');
  } catch (error) {
    console.error('Socket.IO initialization failed:', error);
  }
}

// Trust the first proxy (needed when behind dev proxy to respect X-Forwarded-For)
app.set('trust proxy', 1);

// Serve static files from uploads directory with proper headers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Content-Disposition', 'attachment');
  }
}));

const port = Number(process.env.PORT || 4000);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000', // Development
  'https://datn-2025-rwsy.vercel.app', // Production frontend
];

// Add FRONTEND_URL from env if exists
if (process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*') {
  // Remove trailing slash if exists
  const cleanUrl = process.env.FRONTEND_URL.replace(/\/$/, '');
  if (!allowedOrigins.includes(cleanUrl)) {
    allowedOrigins.push(cleanUrl);
  }
}

// Allow all Vercel preview deployments
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    // Allow if in whitelist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow Vercel preview deployments
    if (origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    // Reject others
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

app.use(cors(corsOptions));

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

// Middleware to ensure DB connection for API routes (Vercel serverless optimization)
app.use('/api', async (req, res, next) => {
  try {
    await connectMongo();
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Database connection failed' });
  }
});

app.use('/health', healthRouter);
app.use('/ai', aiProxyRouter);
app.use('/api', apiRouter);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Global error handler (must be last)
app.use(errorHandler);

// Socket.IO initialization (only if io exists)
if (io) {
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
}

// For Vercel serverless, initialize database connection
if (process.env.VERCEL) {
  connectMongo().then(() => {
    bootstrapIndexes().catch(err => console.error('Bootstrap error:', err));
  }).catch(err => console.error('MongoDB connection error:', err));
} else {
  // For local development, start the server normally
  server.listen(port, async () => {
    await connectMongo();
    await bootstrapIndexes();
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

// Export app for Vercel serverless
export default app;


