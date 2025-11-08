import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getConversations,
  getMessages,
  createConversation,
  sendMessage,
  getAllowedRecipients
} from '../controllers/chatController.js';

const router = Router();

// All chat routes require authentication
router.use(authenticateToken);

// Get conversations for current user
router.get('/conversations', getConversations);

// Get messages for a specific conversation
router.get('/conversations/:conversationId/messages', getMessages);

// Create a new conversation
router.post('/conversations', createConversation);

// Send a message to a conversation
router.post('/messages', sendMessage);

// Get allowed recipients for current user
router.get('/recipients', getAllowedRecipients);

export { router as chatRouter };
