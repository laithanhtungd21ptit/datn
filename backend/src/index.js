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
import { ragEventService } from './services/rag/ragEventService.js';
import { initializeSocket } from './services/socketService.js';


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
    console.log('✅ Socket.IO initialized');
    
    // Initialize socketService with the io instance
    initializeSocket(io);
    console.log('✅ Socket.IO service registered');
  } catch (error) {
    console.error('Socket.IO initialization failed:', error);
  }
}

// Trust the first proxy (needed when behind dev proxy to respect X-Forwarded-For)
app.set('trust proxy', 1);

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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// security middlewares with custom CSP to allow file downloads
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable CSP for file serving
}));

// Serve static files from uploads directory with proper headers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Allow inline viewing instead of forcing download
    res.setHeader('Content-Disposition', 'inline');
  }
}));
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


  // Monitoring events on main namespace
  io.on('connection', (socket) => {
    console.log('Monitoring connection:', socket.user.username, socket.id);

    // Student joins exam monitoring room
    socket.on('monitoring:join_exam', async (data) => {
      try {
        const { examId, sessionId } = data;
        const userId = socket.user.id;
        
        // Join exam room
        socket.join(`exam_${examId}`);
        socket.join(`exam_${examId}_students`);
        socket.join(`session_${sessionId}`);
        
        console.log(`Student ${socket.user.username} joined exam ${examId} monitoring`);
        
        // Notify teacher that student joined
        socket.to(`exam_${examId}_teacher`).emit('monitoring:student_joined', {
          studentId: userId,
          studentName: socket.user.username,
          sessionId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error joining exam:', error);
        socket.emit('monitoring:error', { message: 'Failed to join exam monitoring' });
      }
    });

    // Student sends heartbeat
    socket.on('monitoring:heartbeat', (data) => {
      try {
        const { examId, sessionId, status } = data;
        
        // Broadcast heartbeat to teacher
        socket.to(`exam_${examId}_teacher`).emit('monitoring:student_heartbeat', {
          studentId: socket.user.id,
          studentName: socket.user.username,
          sessionId,
          status,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error sending heartbeat:', error);
      }
    });

    // Student reports violation (from AI detection)
    socket.on('monitoring:violation_detected', async (data) => {
      try {
        const { examId, sessionId, violation } = data;
        
        console.log(`Violation detected: ${violation.type} by ${socket.user.username}`);
        
        // Broadcast to teacher immediately for real-time alert
        socket.to(`exam_${examId}_teacher`).emit('monitoring:new_violation', {
          studentId: socket.user.id,
          studentName: socket.user.username,
          sessionId,
          violation: {
            ...violation,
            timestamp: new Date()
          }
        });
      } catch (error) {
        console.error('Error reporting violation:', error);
      }
    });

    // Student updates monitoring status (camera on/off, etc.)
    socket.on('monitoring:status_update', (data) => {
      try {
        const { examId, sessionId, status } = data;
        
        // Broadcast to teacher
        socket.to(`exam_${examId}_teacher`).emit('monitoring:student_status_update', {
          studentId: socket.user.id,
          studentName: socket.user.username,
          sessionId,
          status,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error updating status:', error);
      }
    });

    // Teacher joins monitoring room
    socket.on('monitoring:teacher_join', (data) => {
      try {
        const { examId } = data;
        
        if (socket.user.role !== 'teacher' && socket.user.role !== 'admin') {
          socket.emit('monitoring:error', { message: 'Unauthorized' });
          return;
        }
        
        socket.join(`exam_${examId}_teacher`);
        console.log(`Teacher ${socket.user.username} joined monitoring for exam ${examId}`);
        
        socket.emit('monitoring:teacher_joined', {
          examId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error teacher joining:', error);
        socket.emit('monitoring:error', { message: 'Failed to join monitoring' });
      }
    });

    // Teacher leaves monitoring
    socket.on('monitoring:teacher_leave', (data) => {
      try {
        const { examId } = data;
        socket.leave(`exam_${examId}_teacher`);
        console.log(`Teacher ${socket.user.username} left monitoring for exam ${examId}`);
      } catch (error) {
        console.error('Error teacher leaving:', error);
      }
    });

    // Teacher sends warning to specific student
    socket.on('monitoring:send_warning', (data) => {
      try {
        const { studentId, sessionId, message } = data;
        
        if (socket.user.role !== 'teacher' && socket.user.role !== 'admin') {
          socket.emit('monitoring:error', { message: 'Unauthorized' });
          return;
        }
        
        console.log(`Teacher warning sent to student ${studentId}: ${message}`);
        
        // Send warning to specific student
        io.to(`session_${sessionId}`).emit('monitoring:warning_received', {
          message,
          from: socket.user.username,
          timestamp: new Date()
        });
        
        // Confirm to teacher
        socket.emit('monitoring:warning_sent', {
          studentId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error sending warning:', error);
        socket.emit('monitoring:error', { message: 'Failed to send warning' });
      }
    });

    // Teacher broadcasts announcement to all students in exam
    socket.on('monitoring:broadcast_announcement', (data) => {
      try {
        const { examId, message } = data;
        
        if (socket.user.role !== 'teacher' && socket.user.role !== 'admin') {
          socket.emit('monitoring:error', { message: 'Unauthorized' });
          return;
        }
        
        console.log(`Teacher broadcasting to exam ${examId}: ${message}`);
        
        // Broadcast to all students in exam
        socket.to(`exam_${examId}_students`).emit('monitoring:announcement', {
          message,
          from: socket.user.username,
          timestamp: new Date()
        });
        
        socket.emit('monitoring:announcement_sent', {
          examId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error broadcasting announcement:', error);
        socket.emit('monitoring:error', { message: 'Failed to broadcast' });
      }
    });

    // Teacher terminates student's exam
    socket.on('monitoring:terminate_exam', async (data) => {
      try {
        const { studentId, sessionId, examId, reason } = data;
        
        if (socket.user.role !== 'teacher' && socket.user.role !== 'admin') {
          socket.emit('monitoring:error', { message: 'Unauthorized' });
          return;
        }
        
        console.log(`Teacher terminating exam for student ${studentId}: ${reason}`);
        
        // Force student to exit
        io.to(`session_${sessionId}`).emit('monitoring:exam_terminated', {
          reason,
          terminatedBy: socket.user.username,
          timestamp: new Date()
        });
        
        // Notify other teachers monitoring
        socket.to(`exam_${examId}_teacher`).emit('monitoring:student_terminated', {
          studentId,
          sessionId,
          reason,
          timestamp: new Date()
        });
        
        socket.emit('monitoring:terminate_success', {
          studentId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error terminating exam:', error);
        socket.emit('monitoring:error', { message: 'Failed to terminate exam' });
      }
    });

    // Teacher requests live snapshot of all students
    socket.on('monitoring:request_snapshot', (data) => {
      try {
        const { examId } = data;
        
        if (socket.user.role !== 'teacher' && socket.user.role !== 'admin') {
          socket.emit('monitoring:error', { message: 'Unauthorized' });
          return;
        }
        
        // Request all students in exam to send their current status
        socket.to(`exam_${examId}_students`).emit('monitoring:snapshot_requested', {
          requestedBy: socket.user.id,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error requesting snapshot:', error);
      }
    });

    // Student responds with snapshot data
    socket.on('monitoring:snapshot_response', (data) => {
      try {
        const { examId, sessionId, snapshot } = data;
        
        // Send snapshot to teacher who requested
        socket.to(`exam_${examId}_teacher`).emit('monitoring:student_snapshot', {
          studentId: socket.user.id,
          studentName: socket.user.username,
          sessionId,
          snapshot,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error sending snapshot:', error);
      }
    });

    // Student leaves exam (cleanup)
    socket.on('monitoring:leave_exam', (data) => {
      try {
        const { examId, sessionId } = data;
        
        socket.leave(`exam_${examId}`);
        socket.leave(`exam_${examId}_students`);
        socket.leave(`session_${sessionId}`);
        
        console.log(`Student ${socket.user.username} left exam ${examId}`);
        
        // Notify teacher
        socket.to(`exam_${examId}_teacher`).emit('monitoring:student_left', {
          studentId: socket.user.id,
          studentName: socket.user.username,
          sessionId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error leaving exam:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Monitoring user disconnected:', socket.user.username);
      // Socket.IO automatically handles room cleanup on disconnect
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

    console.log('✅ RAG Event Service initialized');
    console.log('   Auto-ingestion enabled for: assignments, announcements, documents, classes, comments');
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

// Export app for Vercel serverless
export default app;


