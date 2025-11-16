import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import { upload, useCloudinary } from '../../middleware/upload.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../middleware/cloudinary.js';
import { UserModel } from '../../models/User.js';
import { EnrollmentModel } from '../../models/Enrollment.js';
import { ClassModel } from '../../models/Class.js';
import { AssignmentModel } from '../../models/Assignment.js';
import { SubmissionModel } from '../../models/Submission.js';
import { DocumentModel } from '../../models/Document.js';
import { AnnouncementModel } from '../../models/Announcement.js';
import { CommentModel } from '../../models/Comment.js';
import { logUserActivity } from '../../utils/logger.js';

const studentRouter = Router();

// Require student role for all routes in this router
studentRouter.use(authRequired(['student']));

studentRouter.get('/dashboard', async (req, res) => {
  const studentId = req.user.id;
  const classIds = await EnrollmentModel.find({ studentId, status: 'enrolled' }).distinct('classId');

  // Get all assignments for enrolled classes
  const allAssignments = await AssignmentModel.find({ classId: { $in: classIds } }).sort({ dueDate: 1 }).lean();

  // Get all submissions for the student
  const assignmentIds = allAssignments.map(a => a._id);
  const allSubmissions = await SubmissionModel.find({
    assignmentId: { $in: assignmentIds },
    studentId
  }).lean();

  // Create submission map
  const submissionMap = {};
  allSubmissions.forEach(sub => {
    submissionMap[sub.assignmentId.toString()] = sub;
  });

  // Get class information with teacher details
  const classes = await ClassModel.find({ _id: { $in: classIds } }).populate('teacherId', 'fullName').lean();
  const classMap = {};
  classes.forEach(cls => {
    classMap[cls._id.toString()] = cls;
  });

  // Filter upcoming deadlines (not past due and not submitted)
  const now = new Date();
  const upcomingDeadlines = allAssignments
    .filter(a => {
      const submission = submissionMap[a._id.toString()];
      const isPastDue = new Date(a.dueDate) < now;
      const isSubmitted = submission && submission.submittedAt;
      return !isPastDue && !isSubmitted;
    })
    .slice(0, 10) // Limit to 10
    .map(a => {
      const classInfo = classMap[a.classId.toString()];
      return {
        id: String(a._id),
        title: a.title,
        class: classInfo ? classInfo.name : 'Unknown Class',
        dueDate: a.dueDate,
        description: a.description || '',
        isExam: !!a.isExam
      };
    });

  // Get recent grades (graded submissions)
  const gradedSubmissions = allSubmissions
    .filter(sub => sub.score != null)
    .sort((a, b) => new Date(b.updatedAt || b.submittedAt) - new Date(a.updatedAt || a.submittedAt))
    .slice(0, 10);

  const grades = [];
  for (const sub of gradedSubmissions) {
    const assignment = allAssignments.find(a => a._id.toString() === sub.assignmentId.toString());
    const classInfo = classMap[assignment?.classId?.toString()];
    if (assignment && classInfo) {
      grades.push({
        id: String(sub._id),
        assignment: assignment.title,
        class: classInfo.name,
        score: sub.score,
        maxScore: 10,
        submittedAt: sub.submittedAt,
        gradedAt: sub.updatedAt || sub.submittedAt,
        notes: sub.notes || ''
      });
    }
  }

  // Get upcoming exams (assignments marked as exam with future due dates)
  const upcomingExams = allAssignments
    .filter(a => a.isExam && new Date(a.dueDate) > now)
    .slice(0, 5) // Limit to 5
    .map(a => {
      const classInfo = classMap[a.classId.toString()];
      return {
        id: String(a._id),
        title: a.title,
        class: classInfo ? classInfo.name : 'Unknown Class',
        startAt: a.dueDate, // Using dueDate as exam time for now
        duration: a.durationMinutes || 90,
        teacher: classInfo?.teacherId?.fullName || 'Giảng viên',
        description: a.description || '',
        room: 'Phòng thi A101', // Default room
        maxGrade: 10
      };
    });

  // Get announcements for enrolled classes only
  const announcements = await AnnouncementModel.find({
    classId: { $in: classIds }
  }).sort({ createdAt: -1 }).limit(10).lean();

  const announcementsWithClass = [];
  for (const announcement of announcements) {
    const classInfo = classMap[announcement.classId.toString()];
    if (classInfo) {
      announcementsWithClass.push({
        id: String(announcement._id),
        title: announcement.title,
        content: announcement.content,
        type: announcement.type || 'info',
        time: new Date(announcement.createdAt).toLocaleString('vi-VN'),
        class: classInfo.name,
        sender: classInfo.teacherId?.fullName || 'Giảng viên'
      });
    }
  }

  // Calculate statistics
  const totalAssignments = allAssignments.length;
  const submittedCount = allSubmissions.filter(sub => sub.submittedAt).length;
  const gradedCount = allSubmissions.filter(sub => sub.score != null).length;
  const totalClasses = classIds.length;

  // Calculate total credits
  const totalCredits = classes.reduce((sum, cls) => sum + (cls.credits || 0), 0);

  res.json({
    upcomingDeadlines,
    upcomingExams,
    announcements: announcementsWithClass,
    grades,
    stats: {
      totalAssignments,
      submittedAssignments: submittedCount,
      gradedAssignments: gradedCount,
      enrolledClasses: totalClasses,
      totalClasses,
      totalCredits
    }
  });
});

// ---- Chat System ----
studentRouter.get('/chat/contacts', async (req, res) => {
  const studentId = req.user.id;

  try {
    // Import chat helper
    const { getAllowedRecipientsHelper } = await import('../../controllers/chatController.js');

    const recipients = await getAllowedRecipientsHelper(studentId, 'student');

    console.log('Chat contacts for student', studentId, ':', recipients.length, 'recipients');

    const classmatesFiltered = recipients.filter(r => r.role === 'student').slice(0, 20); // Limit to 20
    const teachersFiltered = recipients.filter(r => r.role === 'teacher').slice(0, 20); // Limit to 20
    const adminsFiltered = recipients.filter(r => r.role === 'admin').slice(0, 5); // Limit to 5

    console.log('Filtered - Classmates:', classmatesFiltered.length, 'Teachers:', teachersFiltered.length, 'Admins:', adminsFiltered.length);

    // Format for frontend compatibility
    res.json({
      classmates: classmatesFiltered.map(r => ({
        id: r._id.toString(),
        name: r.fullName,
        username: r.username,
        studentId: r.studentId,
        role: r.role
      })),
      teachers: teachersFiltered.map(r => ({
        id: r._id.toString(),
        name: r.fullName,
        username: r.username,
        teacherId: r.teacherId,
        role: r.role
      })),
      admins: adminsFiltered.map(r => ({
        id: r._id.toString(),
        name: r.fullName,
        username: r.username,
        role: r.role
      }))
    });
  } catch (error) {
    console.error('Error getting chat contacts:', error);
    res.status(500).json({ error: 'Failed to get chat contacts' });
  }
});

// Get chat messages between student and another user
studentRouter.get('/chat/messages/:userId', async (req, res) => {
  const studentId = req.user.id;
  const { userId } = req.params;

  const { MessageModel } = await import('../../models/Message.js');

  try {
    const messages = await MessageModel.find({
      $or: [
        { senderId: studentId, receiverId: userId },
        { senderId: userId, receiverId: studentId }
      ]
    })
    .populate('senderId', 'fullName username role studentId teacherId')
    .populate('receiverId', 'fullName username role studentId teacherId')
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();

    res.json(messages);
  } catch (error) {
    console.error('Error getting chat messages:', error);
    res.status(500).json({ error: 'Failed to get chat messages' });
  }
});

// Send message from student
studentRouter.post('/chat/messages', async (req, res) => {
  const studentId = req.user.id;
  const { receiverId, content } = req.body;

  if (!receiverId || !content || !content.trim()) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  const { MessageModel } = await import('../../models/Message.js');

  try {
    // Validate receiver exists and student can chat with them
    const receiver = await UserModel.findById(receiverId).lean();
    if (!receiver) {
      return res.status(404).json({ error: 'RECEIVER_NOT_FOUND' });
    }

    // Check if student can chat with this receiver
    let canChat = false;

    if (receiver.role === 'admin') {
      canChat = true; // Students can always chat with admin
    } else if (receiver.role === 'teacher') {
      // Check if teacher teaches any class the student is enrolled in
      const enrollments = await EnrollmentModel.find({ studentId, status: 'enrolled' }).distinct('classId');
      const teacherClasses = await ClassModel.find({ teacherId: receiverId, _id: { $in: enrollments } }).countDocuments();
      canChat = teacherClasses > 0;
    } else if (receiver.role === 'student') {
      // Check if they are classmates
      const studentEnrollments = await EnrollmentModel.find({ studentId, status: 'enrolled' }).distinct('classId');
      const receiverEnrollments = await EnrollmentModel.find({ studentId: receiverId, status: 'enrolled' }).distinct('classId');
      const commonClasses = studentEnrollments.filter(clsId => receiverEnrollments.includes(clsId.toString()));
      canChat = commonClasses.length > 0;
    }

    if (!canChat) {
      return res.status(403).json({ error: 'CANNOT_CHAT_WITH_USER' });
    }

    const message = await MessageModel.create({
      senderId: studentId,
      receiverId,
      content: content.trim(),
      messageType: 'text'
    });

    res.status(201).json({ id: message._id.toString() });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
studentRouter.post('/chat/messages/:userId/read', async (req, res) => {
  const studentId = req.user.id;
  const { userId } = req.params;

  const { MessageModel } = await import('../../models/Message.js');

  try {
    await MessageModel.updateMany(
      { senderId: userId, receiverId: studentId, isRead: false },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

studentRouter.get('/classes', async (req, res) => {
  const studentId = req.user.id;
  const classIds = await EnrollmentModel.find({ studentId, status: 'enrolled' }).distinct('classId');
  const classes = await ClassModel.find({ _id: { $in: classIds } }).lean();

  // Get teacher names
  const teacherIds = classes.map(c => c.teacherId);
  const teachers = await UserModel.find({ _id: { $in: teacherIds } }, 'fullName').lean();
  const teacherMap = new Map(teachers.map(t => [String(t._id), t.fullName]));

  // Get counts for each class
  const [assignmentCounts, studentCounts, documentCounts, announcementCounts] = await Promise.all([
    AssignmentModel.aggregate([
      { $match: { classId: { $in: classIds } } },
      { $group: { _id: '$classId', count: { $sum: 1 } } },
    ]),
    EnrollmentModel.aggregate([
      { $match: { classId: { $in: classIds }, status: 'enrolled' } },
      { $group: { _id: '$classId', count: { $sum: 1 } } },
    ]),
    DocumentModel.aggregate([
      { $match: { classId: { $in: classIds } } },
      { $group: { _id: '$classId', count: { $sum: 1 } } },
    ]),
    AnnouncementModel.aggregate([
      { $match: { classId: { $in: classIds } } },
      { $group: { _id: '$classId', count: { $sum: 1 } } },
    ]),
  ]);

  const assignmentMap = new Map(assignmentCounts.map(x => [String(x._id), x.count]));
  const studentMap = new Map(studentCounts.map(x => [String(x._id), x.count]));
  const documentMap = new Map(documentCounts.map(x => [String(x._id), x.count]));
  const announcementMap = new Map(announcementCounts.map(x => [String(x._id), x.count]));

  res.json(classes.map(c => ({
    id: String(c._id),
    name: c.name,
    code: c.code,
    department: c.department,
    description: c.description || '',
    teacher: teacherMap.get(String(c.teacherId)) || 'Unknown',
    students: studentMap.get(String(c._id)) || 0,
    assignments: assignmentMap.get(String(c._id)) || 0,
    documents: documentMap.get(String(c._id)) || 0,
    announcements: announcementMap.get(String(c._id)) || 0,
  })));
});

studentRouter.get('/classes/:id', async (req, res) => {
  const { id } = req.params;
  const studentId = req.user.id;

  // Check if student is enrolled
  const enrolled = await EnrollmentModel.exists({ classId: id, studentId, status: 'enrolled' });
  if (!enrolled) return res.status(403).json({ error: 'FORBIDDEN' });

  const cls = await ClassModel.findById(id).lean();
  if (!cls) return res.status(404).json({ error: 'NOT_FOUND' });

  // Get student count for the class
  const studentCount = await EnrollmentModel.countDocuments({ classId: id, status: 'enrolled' });

  // Get documents for the class
  const documents = await DocumentModel.find({ classId: id }).sort({ createdAt: -1 }).lean();
  const documentsWithInfo = documents.map(d => ({
    id: String(d._id),
    title: d.title,
    description: d.description,
    name: d.fileName, // For compatibility with student component
    fileName: d.fileName,
    fileSize: d.fileSize,
    fileType: d.fileType,
    fileUrl: d.fileUrl,
    uploadedAt: d.createdAt
  }));

  // Get announcements for the class
  const announcements = await AnnouncementModel.find({ classId: id }).sort({ createdAt: -1 }).lean();
  const announcementsWithInfo = announcements.map(a => ({
    id: String(a._id),
    title: a.title,
    content: a.content,
    type: a.type,
    date: new Date(a.createdAt).toLocaleDateString('vi-VN'), // For compatibility with student component
    createdAt: a.createdAt
  }));

  res.json({
    id: String(cls._id),
    name: cls.name,
    code: cls.code,
    department: cls.department,
    students: studentCount,
    documents: documentsWithInfo,
    announcements: announcementsWithInfo
  });
});

studentRouter.get('/assignments', async (req, res) => {
  const studentId = req.user.id;
  const classIds = await EnrollmentModel.find({ studentId, status: 'enrolled' }).distinct('classId');
  const assignments = await AssignmentModel.find({ classId: { $in: classIds } }).sort({ createdAt: -1 }).lean();

  // Get submissions for all assignments
  const assignmentIds = assignments.map(a => a._id);
  const submissions = await SubmissionModel.find({
    assignmentId: { $in: assignmentIds },
    studentId
  }).lean();

  // Create a map of assignmentId -> submission
  const submissionMap = {};
  submissions.forEach(sub => {
    submissionMap[sub.assignmentId.toString()] = sub;
  });

  // Get class information for each assignment
  const classMap = {};
  const classes = await ClassModel.find({ _id: { $in: classIds } }).lean();
  classes.forEach(cls => {
    classMap[cls._id.toString()] = cls;
  });

  const result = assignments.map(a => {
    const submission = submissionMap[a._id.toString()];
    const classInfo = classMap[a.classId.toString()];

    const hasSubmission = submission && submission.submittedAt;
    const hasGrade = submission && submission.score != null;

    return {
    id: String(a._id),
    title: a.title,
    description: a.description || '',
    class: classInfo ? classInfo.name : '',
    classId: String(a.classId),
    teacher: '', // Will be populated if needed
    isExam: !!a.isExam,
    durationMinutes: a.durationMinutes || null,
      dueDate: a.dueDate,
      createdAt: a.createdAt,
      mySubmission: hasSubmission ? {
        status: 'submitted',
        submittedAt: submission.submittedAt,
        files: submission.contentUrl ? submission.contentUrl.split(';').filter(url => url.trim()) : [],
        score: submission.score,
        notes: submission.notes
      } : {
        status: 'not_submitted',
        submittedAt: null,
        files: [],
        score: null,
        notes: ''
      },
      status: hasGrade ? 'graded' : (hasSubmission ? 'submitted' : 'not_submitted'),
      grade: submission ? submission.score : null,
      comment: submission ? submission.notes : ''
    };
  });

  res.json(result);
});

// Assignments of a specific class (only if enrolled)
studentRouter.get('/classes/:id/assignments', async (req, res) => {
  const { id } = req.params;
  const studentId = req.user.id;
  const enrolled = await EnrollmentModel.exists({ classId: id, studentId, status: 'enrolled' });
  if (!enrolled) return res.status(403).json({ error: 'FORBIDDEN' });
  const items = await AssignmentModel.find({ classId: id }).sort({ dueDate: 1 }).lean();
  res.json(items.map(a => ({ id: String(a._id), title: a.title, dueDate: a.dueDate, isExam: !!a.isExam, durationMinutes: a.durationMinutes })));
});

// Join class by code
studentRouter.post('/classes/join', async (req, res) => {
  const { code } = req.body || {};
  const studentId = req.user.id;
  if (!code) return res.status(400).json({ error: 'CODE_REQUIRED' });
  const cls = await ClassModel.findOne({ code }).lean();
  if (!cls) return res.status(404).json({ error: 'CLASS_NOT_FOUND' });
  await EnrollmentModel.updateOne({ classId: cls._id, studentId }, { $set: { status: 'enrolled' } }, { upsert: true });

  // Log join class activity
  try {
    await logUserActivity(
      studentId,
      'student',
      'join_class',
      cls._id,
      'class',
      `Joined class: ${cls.name} (${cls.code})`,
      { classCode: code },
      req
    );
  } catch (error) {
    console.error('Failed to log join class activity:', error);
  }

  res.json({ success: true, classId: String(cls._id) });
});

// Submit assignment
studentRouter.post('/submissions', upload.array('files', 5), async (req, res) => {
  const studentId = req.user.id;
  const { assignmentId, notes = '' } = req.body || {};
  if (!assignmentId) return res.status(400).json({ error: 'MISSING_ASSIGNMENT_ID' });

  // Get uploaded file paths
  const fileUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

  const submission = await SubmissionModel.findOneAndUpdate(
    { assignmentId, studentId },
    {
      $set: {
        contentUrl: fileUrls.join(';'),
        notes,
        submittedAt: new Date()
      },
      $setOnInsert: {
        assignmentId,
        studentId
      }
    },
    { upsert: true, new: true }
  );

  // Log submit assignment activity
  try {
    const assignment = await AssignmentModel.findById(assignmentId).lean();
    await logUserActivity(
      studentId,
      'student',
      'submit_assignment',
      assignmentId,
      'assignment',
      `Submitted assignment: ${assignment?.title || 'Unknown'}`,
      { filesCount: fileUrls.length, notes },
      req
    );
  } catch (error) {
    console.error('Failed to log submit assignment activity:', error);
  }

  res.status(201).json({ id: String(submission._id) });
});

// ---- Comment Management ----

// Get comments for a class (only if enrolled)
studentRouter.get('/classes/:id/comments', async (req, res) => {
  const { id } = req.params;
  const studentId = req.user.id;
  const enrolled = await EnrollmentModel.exists({ classId: id, studentId, status: 'enrolled' });
  if (!enrolled) return res.status(403).json({ error: 'FORBIDDEN' });

  const comments = await CommentModel.find({ classId: id }).sort({ createdAt: -1 }).populate('userId', 'fullName').lean();
  res.json(comments.map(c => ({
    id: String(c._id),
    author: c.userId?.fullName || 'Unknown',
    role: c.userRole,
    content: c.content,
    time: new Date(c.createdAt).toLocaleString('vi-VN'),
    createdAt: c.createdAt
  })));
});

// Update current user profile
studentRouter.put('/profile', async (req, res) => {
  const userId = req.user.id;
  const { fullName, email, phone, address, dateOfBirth, gender, avatar } = req.body;

  try {
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (gender !== undefined) updateData.gender = gender;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await UserModel.findByIdAndUpdate(userId, updateData, { new: true }).select('-passwordHash -resetPasswordToken -resetPasswordExpiresAt');

    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    // Get enrollment information
    const enrollments = await EnrollmentModel.find({ studentId: user._id, status: 'enrolled' }).lean();
    const classIds = enrollments.map(e => e.classId);

    // Get class details for enrolled classes
    const classes = await ClassModel.find({ _id: { $in: classIds } }).lean();

    // Calculate total credits from enrolled classes
    const totalCredits = classes.reduce((sum, cls) => sum + (cls.credits || 0), 0);

    // Get assignment statistics
    const assignments = await AssignmentModel.find({ classId: { $in: classIds } }).lean();
    const assignmentIds = assignments.map(a => a._id);

    const submissions = await SubmissionModel.find({
      assignmentId: { $in: assignmentIds },
      studentId: user._id
    }).lean();

    const submittedCount = submissions.filter(sub => sub.submittedAt).length;
    const gradedCount = submissions.filter(sub => sub.score != null).length;

    // Calculate average grade from graded submissions
    const gradedSubmissions = submissions.filter(sub => sub.score != null);
    const averageGrade = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, sub) => sum + sub.score, 0) / gradedSubmissions.length
      : null;

    // Get enrolled classes info
    const enrolledClasses = classes.map(cls => ({
      id: String(cls._id),
      name: cls.name,
      code: cls.code,
      credits: cls.credits || 0,
      teacher: 'Giảng viên' // Will be populated when teacher info is available
    }));

    res.json({
      id: String(user._id),
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      department: user.department,
      studentId: user.studentId,
      role: user.role,
      status: user.status,
      address: user.address || '',
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : null,
      gender: user.gender || 'Nam',
      avatar: user.avatar || '',
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      // Academic statistics
      stats: {
        totalAssignments: assignments.length,
        submittedAssignments: submittedCount,
        gradedAssignments: gradedCount,
        averageGrade: averageGrade ? Math.round(averageGrade * 10) / 10 : null, // Round to 1 decimal
        totalCredits,
        enrolledClasses: classes.length
      },
      enrolledClasses
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload avatar
studentRouter.post('/profile/avatar', upload.single('avatar'), async (req, res) => {
  const userId = req.user.id;

  try {
    if (!req.file) return res.status(400).json({ error: 'NO_FILE_UPLOADED' });

    let avatarUrl;

    if (useCloudinary) {
      // Upload to Cloudinary
      const fileName = `avatar-${userId}-${Date.now()}`;
      const result = await uploadToCloudinary(req.file.buffer, fileName, 'datn2025/avatars');
      avatarUrl = result.secure_url;

      // Get old avatar URL from user to delete from Cloudinary
      const user = await UserModel.findById(userId).select('avatar');
      if (user && user.avatar && user.avatar.includes('cloudinary')) {
        try {
          const publicId = user.avatar.split('/').slice(-2).join('/').split('.')[0];
          await deleteFromCloudinary(publicId);
        } catch (err) {
          console.warn('Could not delete old avatar from Cloudinary:', err);
        }
      }
    } else {
      // Use local disk storage
      avatarUrl = `/uploads/${req.file.filename}`;
    }

    await UserModel.findByIdAndUpdate(userId, { avatar: avatarUrl });

    res.json({ avatar: avatarUrl });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Get current user profile with statistics
studentRouter.get('/profile', async (req, res) => {
  const user = await UserModel.findById(req.user.id).select('-passwordHash -resetPasswordToken -resetPasswordExpiresAt').lean();
  if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

  // Get enrollment information
  const enrollments = await EnrollmentModel.find({ studentId: user._id, status: 'enrolled' }).lean();
  const classIds = enrollments.map(e => e.classId);

  // Get class details for enrolled classes
  const classes = await ClassModel.find({ _id: { $in: classIds } }).lean();

  // Calculate total credits from enrolled classes
  const totalCredits = classes.reduce((sum, cls) => sum + (cls.credits || 0), 0);

  // Get assignment statistics
  const assignments = await AssignmentModel.find({ classId: { $in: classIds } }).lean();
  const assignmentIds = assignments.map(a => a._id);

  const submissions = await SubmissionModel.find({
    assignmentId: { $in: assignmentIds },
    studentId: user._id
  }).lean();

  const submittedCount = submissions.filter(sub => sub.submittedAt).length;
  const gradedCount = submissions.filter(sub => sub.score != null).length;

  // Calculate average grade from graded submissions
  const gradedSubmissions = submissions.filter(sub => sub.score != null);
  const averageGrade = gradedSubmissions.length > 0
    ? gradedSubmissions.reduce((sum, sub) => sum + sub.score, 0) / gradedSubmissions.length
    : null;

  // Get enrolled classes info
  const enrolledClasses = classes.map(cls => ({
    id: String(cls._id),
    name: cls.name,
    code: cls.code,
    credits: cls.credits || 0,
    teacher: 'Giảng viên' // Will be populated when teacher info is available
  }));

  res.json({
    id: String(user._id),
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    department: user.department,
    studentId: user.studentId,
    role: user.role,
    status: user.status,
    address: user.address || '',
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : null,
    gender: user.gender || 'Nam',
    avatar: user.avatar || '',
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    // Academic statistics
    stats: {
      totalAssignments: assignments.length,
      submittedAssignments: submittedCount,
      gradedAssignments: gradedCount,
      averageGrade: averageGrade ? Math.round(averageGrade * 10) / 10 : null, // Round to 1 decimal
      totalCredits,
      enrolledClasses: classes.length
    },
    enrolledClasses
  });
});

// Create comment (only if enrolled)
studentRouter.post('/classes/:id/comments', async (req, res) => {
  const { id } = req.params;
  const studentId = req.user.id;
  const { content } = req.body;

  const enrolled = await EnrollmentModel.exists({ classId: id, studentId, status: 'enrolled' });
  if (!enrolled) return res.status(403).json({ error: 'FORBIDDEN' });

  if (!content || !content.trim()) return res.status(400).json({ error: 'CONTENT_REQUIRED' });

  const comment = await CommentModel.create({
    classId: id,
    userId: studentId,
    userRole: 'student',
    content: content.trim()
  });

  res.status(201).json({
    id: String(comment._id),
    author: req.user.fullName || 'Sinh viên',
    role: 'student',
    content: comment.content,
    time: 'Vừa xong',
    createdAt: comment.createdAt
  });
});

// Get notifications for header
studentRouter.get('/notifications', async (req, res) => {
  const studentId = req.user.id;

  const { NotificationModel } = await import('../../models/Notification.js');

  // Get recent notifications (limit to 20)
  const notifications = await NotificationModel.find({
    recipientId: studentId
  })
  .sort({ createdAt: -1 })
  .limit(20)
  .populate('senderId', 'fullName')
  .populate('classId', 'name')
  .lean();

  // Format notifications for frontend
  const formattedNotifications = notifications.map(notification => ({
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    content: notification.content,
    time: new Date(notification.createdAt).toLocaleString('vi-VN'),
    class: notification.classId?.name || 'Unknown Class',
    sender: notification.senderId?.fullName || 'Giảng viên',
    isRead: notification.isRead
  }));

  res.json(formattedNotifications);
});

// Mark notification as read
studentRouter.post('/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  const studentId = req.user.id;

  const { NotificationModel } = await import('../../models/Notification.js');

  try {
    await NotificationModel.findOneAndUpdate(
      { _id: id, recipientId: studentId },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
studentRouter.post('/notifications/mark-all-read', async (req, res) => {
  const studentId = req.user.id;

  const { NotificationModel } = await import('../../models/Notification.js');

  try {
    await NotificationModel.updateMany(
      { recipientId: studentId, isRead: false },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

export { studentRouter };
