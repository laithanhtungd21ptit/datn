import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { healthRouter } from './routes/health.js';
import { aiProxyRouter } from './routes/aiProxy.js';
import { apiRouter } from './routes/api/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { connectMongo } from './db/mongo.js';
import { bootstrapIndexes } from './db/bootstrap.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();

// Trust the first proxy (needed when behind dev proxy to respect X-Forwarded-For)
app.set('trust proxy', 1);

// Serve static files from uploads directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const port = Number(process.env.PORT || 4000);
const allowedOrigin = process.env.FRONTEND_URL || '*';

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

// Global error handler (must be last)
app.use(errorHandler);

app.listen(port, async () => {
  await connectMongo();
  await bootstrapIndexes();
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});


