import { ConversationModel } from '../models/Conversation.js';
import { MessageModel } from '../models/Message.js';
import { UserModel } from '../models/User.js';
import { ClassModel } from '../models/Class.js';
import { EnrollmentModel } from '../models/Enrollment.js';

// Helper function to check if user can access conversation
const canAccessConversation = async (userId, conversationId) => {
  const conversation = await ConversationModel.findById(conversationId);
  if (!conversation) return false;

  const participant = conversation.participants.find(p => p.userId.toString() === userId.toString());
  return !!participant;
};

// Helper function to get allowed conversation partners based on role
const getAllowedRecipientsHelper = async (senderId, senderRole) => {
  const user = await UserModel.findById(senderId);
  if (!user) return [];

  let recipients = [];

  if (senderRole === 'admin') {
    // Admin can message all users
    recipients = await UserModel.find({ _id: { $ne: senderId } })
      .select('_id fullName role username studentId teacherId')
      .lean();
  } else if (senderRole === 'teacher') {
    // Teacher can message other teachers, students in their classes, and admin
    const teachers = await UserModel.find({
      _id: { $ne: senderId },
      role: { $in: ['teacher', 'admin'] }
    }).select('_id fullName role username studentId teacherId').lean();

    // Get classes taught by this teacher
    const classes = await ClassModel.find({ teacherId: senderId });
    const classIds = classes.map(c => c._id);

    // Get students enrolled in teacher's classes
    const enrollments = await EnrollmentModel.find({
      classId: { $in: classIds },
      status: 'enrolled'
    }).populate('studentId', '_id fullName role username studentId teacherId');

    const students = enrollments.map(e => e.studentId).filter(s => s);

    recipients = [...teachers, ...students];
  } else if (senderRole === 'student') {
    // Student can message classmates, teachers of enrolled classes, and admin
    const enrollments = await EnrollmentModel.find({
      studentId: senderId,
      status: 'enrolled'
    });

    console.log('Student enrollments:', enrollments.length);

    const classIds = enrollments.map(e => e.classId);

    // Get classmates
    const classmateEnrollments = await EnrollmentModel.find({
      classId: { $in: classIds },
      studentId: { $ne: senderId }
    }).populate('studentId', '_id fullName role username studentId teacherId');

    const classmates = classmateEnrollments.map(e => e.studentId).filter(s => s);

    console.log('Classmates found:', classmates.length);

    // Get teachers of enrolled classes
    const classes = await ClassModel.find({ _id: { $in: classIds } })
      .populate('teacherId', '_id fullName role username studentId teacherId');

    const teachers = classes.map(c => c.teacherId).filter(t => t);

    console.log('Teachers found:', teachers.length);

    // Get admin users
    const admins = await UserModel.find({ role: 'admin' })
      .select('_id fullName role username studentId teacherId').lean();

    console.log('Admins found:', admins.length);

    recipients = [...classmates, ...teachers, ...admins];
  }

  // Remove duplicates
  const uniqueRecipients = recipients.filter((user, index, self) =>
    index === self.findIndex(u => u._id.toString() === user._id.toString())
  );

  return uniqueRecipients;
};

// Get conversations for user
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find all conversations where user is a participant
    const conversations = await ConversationModel.find({
      'participants.userId': userId,
      isActive: true
    })
    .populate('participants.userId', 'fullName username role studentId teacherId')
    .populate('classId', 'name code')
    .sort({ updatedAt: -1 })
    .lean();

    // Format conversations for response
    const formattedConversations = conversations.map(conv => {
      const otherParticipants = conv.participants.filter(p =>
        p.userId._id.toString() !== userId.toString()
      );

      let conversationName = '';
      let avatar = '';

      if (conv.type === 'direct') {
        const otherParticipant = otherParticipants[0];
        if (otherParticipant) {
          conversationName = otherParticipant.userId.fullName;
          avatar = otherParticipant.userId.fullName.charAt(0).toUpperCase();
        }
      } else if (conv.type === 'class') {
        conversationName = conv.classId ? `Lớp: ${conv.classId.name}` : 'Lớp học';
        avatar = 'C';
      } else if (conv.type === 'group') {
        conversationName = conv.name || 'Nhóm chat';
        avatar = 'G';
      }

      return {
        id: conv._id,
        type: conv.type,
        name: conversationName,
        avatar,
        lastMessage: conv.lastMessage,
        updatedAt: conv.updatedAt,
        participants: conv.participants
      };
    });

    res.json(formattedConversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách cuộc trò chuyện' });
  }
};

// Get messages for a conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Check if user can access this conversation
    const hasAccess = await canAccessConversation(userId, conversationId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Không có quyền truy cập cuộc trò chuyện này' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await MessageModel.find({
      conversationId,
      isDeleted: false
    })
    .populate('senderId', 'fullName username role studentId teacherId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    // Reverse to get chronological order
    messages.reverse();

    // Mark messages as read by current user
    await MessageModel.updateMany(
      {
        conversationId,
        'readBy.userId': { $ne: userId },
        senderId: { $ne: userId }
      },
      {
        $push: {
          readBy: {
            userId,
            readAt: new Date()
          }
        },
        $set: { status: 'read' }
      }
    );

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Lỗi khi lấy tin nhắn' });
  }
};

// Create a new conversation
export const createConversation = async (req, res) => {
  try {
    const { type, participantIds, classId, name } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate input based on type
    if (type === 'direct' && (!participantIds || participantIds.length !== 1)) {
      return res.status(400).json({ message: 'Cuộc trò chuyện trực tiếp cần chính xác 1 người tham gia' });
    }

    if (type === 'class' && !classId) {
      return res.status(400).json({ message: 'Cuộc trò chuyện lớp học cần có classId' });
    }

    // Check permissions
    const allowedRecipients = await getAllowedRecipientsHelper(userId, userRole);
    const allowedIds = allowedRecipients.map(u => u._id.toString());

    if (participantIds && participantIds.some(id => !allowedIds.includes(id))) {
      return res.status(403).json({ message: 'Không có quyền tạo cuộc trò chuyện với người dùng này' });
    }

    // For class conversations, check if user is teacher of the class
    if (type === 'class') {
      const classDoc = await ClassModel.findById(classId);
      if (!classDoc) {
        return res.status(404).json({ message: 'Không tìm thấy lớp học' });
      }

      if (userRole === 'teacher' && classDoc.teacherId.toString() !== userId) {
        return res.status(403).json({ message: 'Chỉ giáo viên của lớp mới có thể tạo cuộc trò chuyện lớp' });
      }
    }

    // Check if direct conversation already exists
    if (type === 'direct') {
      const existingConv = await ConversationModel.findOne({
        type: 'direct',
        'participants.userId': { $all: [userId, participantIds[0]] },
        $expr: { $eq: [{ $size: '$participants' }, 2] }
      });

      if (existingConv) {
        return res.json({ conversation: existingConv });
      }
    }

    // Create participants array
    const participants = [{ userId, role: userRole }];

    if (participantIds) {
      for (const participantId of participantIds) {
        const user = await UserModel.findById(participantId);
        if (user) {
          participants.push({
            userId: participantId,
            role: user.role
          });
        }
      }
    }

    // For class conversations, add all enrolled students and teacher
    if (type === 'class') {
      const enrollments = await EnrollmentModel.find({
        classId,
        status: 'enrolled'
      }).populate('studentId');

      const classDoc = await ClassModel.findById(classId).populate('teacherId');

      // Add teacher if not already added
      const teacherExists = participants.some(p => p.userId.toString() === classDoc.teacherId._id.toString());
      if (!teacherExists) {
        participants.push({
          userId: classDoc.teacherId._id,
          role: 'teacher'
        });
      }

      // Add students
      for (const enrollment of enrollments) {
        const studentExists = participants.some(p => p.userId.toString() === enrollment.studentId._id.toString());
        if (!studentExists) {
          participants.push({
            userId: enrollment.studentId._id,
            role: 'student'
          });
        }
      }
    }

    const conversation = new ConversationModel({
      type,
      name: name || '',
      participants,
      classId: type === 'class' ? classId : null,
    });

    await conversation.save();
    await conversation.populate('participants.userId', 'fullName username role studentId teacherId');
    await conversation.populate('classId', 'name code');

    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ message: 'Lỗi khi tạo cuộc trò chuyện' });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung tin nhắn không được để trống' });
    }

    // Check if user can access this conversation
    const hasAccess = await canAccessConversation(userId, conversationId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Không có quyền gửi tin nhắn vào cuộc trò chuyện này' });
    }

    const message = new MessageModel({
      conversationId,
      senderId: userId,
      content: content.trim(),
      readBy: [{ userId, readAt: new Date() }]
    });

    await message.save();
    await message.populate('senderId', 'fullName username role studentId teacherId');

    // Update conversation's last message
    await ConversationModel.findByIdAndUpdate(conversationId, {
      lastMessage: {
        senderId: userId,
        content: content.trim(),
        sentAt: new Date()
      },
      updatedAt: new Date()
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Lỗi khi gửi tin nhắn' });
  }
};

// Get allowed recipients for current user
export const getAllowedRecipients = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const recipients = await getAllowedRecipientsHelper(userId, userRole);

    // Format recipients by role for easier frontend consumption
    const formattedRecipients = {
      classmates: [],
      teachers: [],
      admins: []
    };

    recipients.forEach(recipient => {
      const formattedRecipient = {
        id: recipient._id.toString(),
        name: recipient.fullName,
        username: recipient.username,
        role: recipient.role,
        studentId: recipient.studentId || null,
        teacherId: recipient.teacherId || null
      };

      if (recipient.role === 'student') {
        formattedRecipients.classmates.push(formattedRecipient);
      } else if (recipient.role === 'teacher') {
        formattedRecipients.teachers.push(formattedRecipient);
      } else if (recipient.role === 'admin') {
        formattedRecipients.admins.push(formattedRecipient);
      }
    });

    res.json({ recipients: formattedRecipients });
  } catch (error) {
    console.error('Get allowed recipients error:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách người nhận được phép' });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Check if user can access this conversation
    const hasAccess = await canAccessConversation(userId, conversationId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Không có quyền truy cập cuộc trò chuyện này' });
    }

    // Mark messages as read
    const result = await MessageModel.updateMany(
      {
        conversationId,
        'readBy.userId': { $ne: userId },
        senderId: { $ne: userId }
      },
      {
        $push: {
          readBy: {
            userId,
            readAt: new Date()
          }
        },
        $set: { status: 'read' }
      }
    );

    res.json({ updated: result.modifiedCount });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ message: 'Lỗi khi đánh dấu tin nhắn đã đọc' });
  }
};
