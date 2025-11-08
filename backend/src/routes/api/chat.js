import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import {
  getConversations,
  getMessages,
  createConversation,
  sendMessage,
  getAllowedRecipients,
  markMessagesAsRead
} from '../../controllers/chatController.js';

const router = Router();

// All chat routes require authentication
router.use(authRequired());

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

// Mark messages as read
router.post('/conversations/:conversationId/read', markMessagesAsRead);

export { router as chatRouter };
