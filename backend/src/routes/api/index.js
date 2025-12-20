import { Router } from 'express';
import { authRouter } from './auth.js';
import { teacherRouter } from './teacher.js';
import { studentRouter } from './student.js';
import { adminRouter } from './admin.js';
import { chatRouter } from './chat.js';
import { monitoringRouter } from './monitoring.js';
import { ragRouter } from './rag.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/teacher', teacherRouter);
apiRouter.use('/student', studentRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/chat', chatRouter);
apiRouter.use('/monitoring', monitoringRouter);
apiRouter.use('/rag', ragRouter);

