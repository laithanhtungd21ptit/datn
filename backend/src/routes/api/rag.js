import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import { answerQuestion } from '../../services/rag/qaChain.js';
import { EnrollmentModel } from '../../models/Enrollment.js';
import { ClassModel } from '../../models/Class.js';
import { RagConversationModel } from '../../models/RagConversation.js';

export const ragRouter = Router();

async function getAccessibleClassIds(user) {
  if (user.role === 'admin') return [];

  if (user.role === 'teacher') {
    const classes = await ClassModel.find({ teacherId: user.id }).select('_id').lean();
    return classes.map((c) => c._id);
  }

  if (user.role === 'student') {
    const enrollments = await EnrollmentModel.find({ studentId: user.id, status: 'enrolled' }).select('classId').lean();
    return enrollments.map((e) => e.classId);
  }

  return [];
}

ragRouter.post('/query', authRequired(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const { query, topK = 12, docTypes = [], classId, conversationId } = req.body || {};
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'INVALID_QUERY' });
    }

    const accessibleClassIds = await getAccessibleClassIds(req.user);

    // Determine class filters
    let classIdsFilter = undefined;
    if (req.user.role === 'admin') {
      // Admin: nếu chỉ định classId thì filter, không thì search all
      classIdsFilter = classId ? [classId] : undefined;
    } else if (req.user.role === 'teacher' || req.user.role === 'student') {
      // Teacher/Student: search trong các class có quyền
      if (accessibleClassIds && accessibleClassIds.length > 0) {
        if (classId) {
          // Nếu chỉ định classId, check permission
          if (!accessibleClassIds.map(String).includes(String(classId))) {
            return res.status(403).json({ error: 'FORBIDDEN_CLASS' });
          }
          classIdsFilter = [classId];
        } else {
          // Không chỉ định classId → search trong các class có quyền
          classIdsFilter = accessibleClassIds;
        }
      } else {
        // Không enroll class nào → vẫn cho search general info
        classIdsFilter = undefined;
      }
    }

    const filters = {
      docType: Array.isArray(docTypes) && docTypes.length ? docTypes : undefined,
      classIds: classIdsFilter,
      rolesAllowed: undefined,
    };

    // Special handling cho submission - student chỉ xem của chính mình
    const queryLower = query.toLowerCase();
    const isPersonalQuery = queryLower.includes('của tôi') || 
                            queryLower.includes('của mình') ||
                            queryLower.includes('điểm tôi') ||
                            queryLower.includes('bài tôi') ||
                            queryLower.includes('tôi nộp') ||
                            queryLower.includes('được chấm');

    if (req.user.role === 'student' && isPersonalQuery) {
      // Student query về bài nộp/điểm của mình
      filters.studentId = req.user.id;
      console.log('[RAG] Student personal query detected, filtering by studentId');
    }

    console.log('[RAG] User:', req.user.username, 'Role:', req.user.role);
    console.log('[RAG] Query:', query);
    console.log('[RAG] Filters:', JSON.stringify(filters, null, 2));

    // Get conversation history if conversationId provided
    let conversationHistory = [];
    let conv = null;
    if (conversationId) {
      conv = await RagConversationModel.findOne({ _id: conversationId, userId: req.user.id });
      if (conv) {
        conversationHistory = conv.messages.map(m => ({ role: m.role, content: m.content }));
      }
    }

    const { answer, sources } = await answerQuestion({ 
      question: query.trim(), 
      filters, 
      topK: Math.min(Number(topK) || 12, 20), // Increased default topK
      conversationHistory 
    });

    // Save to conversation
    if (conv) {
      conv.messages.push({ role: 'user', content: query.trim() });
      conv.messages.push({ role: 'assistant', content: answer, sources });
      if (!conv.title && conv.messages.length === 2) {
        conv.title = query.trim().slice(0, 50);
      }
      await conv.save();
    } else {
      conv = await RagConversationModel.create({
        userId: req.user.id,
        role: req.user.role,
        title: query.trim().slice(0, 50),
        messages: [
          { role: 'user', content: query.trim() },
          { role: 'assistant', content: answer, sources },
        ],
      });
    }

    return res.json({ answer, sources, conversationId: conv._id });
  } catch (err) {
    console.error('RAG query error:', err);
    return res.status(500).json({ error: 'RAG_QUERY_FAILED', detail: err?.message || 'UNKNOWN' });
  }
});

ragRouter.get('/conversations', authRequired(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const conversations = await RagConversationModel.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .limit(50)
      .select('_id title updatedAt messages')
      .lean();
    return res.json(conversations);
  } catch (err) {
    console.error('Get conversations error:', err);
    return res.status(500).json({ error: 'FAILED', detail: err?.message || 'UNKNOWN' });
  }
});

ragRouter.get('/conversations/:id', authRequired(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const conv = await RagConversationModel.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!conv) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json(conv);
  } catch (err) {
    console.error('Get conversation error:', err);
    return res.status(500).json({ error: 'FAILED', detail: err?.message || 'UNKNOWN' });
  }
});

ragRouter.delete('/conversations/:id', authRequired(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    await RagConversationModel.deleteOne({ _id: req.params.id, userId: req.user.id });
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete conversation error:', err);
    return res.status(500).json({ error: 'FAILED', detail: err?.message || 'UNKNOWN' });
  }
});


