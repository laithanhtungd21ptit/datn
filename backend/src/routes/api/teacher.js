import { Router } from 'express';
import mongoose from 'mongoose';
import { authRequired } from '../../middleware/auth.js';
import { ClassModel } from '../../models/Class.js';
import { AssignmentModel } from '../../models/Assignment.js';
import { SubmissionModel } from '../../models/Submission.js';
import { EnrollmentModel } from '../../models/Enrollment.js';
import { UserModel } from '../../models/User.js';
import { DocumentModel } from '../../models/Document.js';
import { AnnouncementModel } from '../../models/Announcement.js';
import { CommentModel } from '../../models/Comment.js';
import { upload, useCloudinary } from '../../middleware/upload.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../middleware/cloudinary.js';
import { logUserActivity } from '../../utils/logger.js';
import path from 'path';

export const teacherRouter = Router();

// Require teacher role for all routes in this router
teacherRouter.use(authRequired(['teacher']));

teacherRouter.get('/dashboard', async (req, res) => {
  const teacherId = req.user.id;
  const classIds = await ClassModel.find({ teacherId }).distinct('_id');

  // Get teacher's last notification read timestamp
  const user = await UserModel.findById(teacherId).select('lastNotificationReadAt teacherReadNotificationIds').lean();
  const lastReadAt = user?.lastNotificationReadAt ? new Date(user.lastNotificationReadAt) : null;
  const readNotificationIds = new Set(user?.teacherReadNotificationIds || []);

  const [classesCount, assignmentsCount, examsCount, assignmentStats] = await Promise.all([
    ClassModel.countDocuments({ teacherId }),
    AssignmentModel.countDocuments({ classId: { $in: classIds } }),
    AssignmentModel.countDocuments({ classId: { $in: classIds }, isExam: true }),
    // Get assignment submission stats for chart
    AssignmentModel.aggregate([
    { $match: { classId: { $in: classIds } } },
    {
    $lookup: {
    from: 'submissions',
    localField: '_id',
    foreignField: 'assignmentId',
    as: 'submissions'
    }
    },
    {
    $lookup: {
    from: 'enrollments',
    localField: 'classId',
    foreignField: 'classId',
    as: 'enrollments',
    pipeline: [{ $match: { status: 'enrolled' } }]
    }
    },
    {
      $project: {
          title: 1,
          dueDate: 1,
          submittedCount: { $size: '$submissions' },
          totalStudents: { $size: '$enrollments' }
        }
      },
      { $sort: { dueDate: -1 } },
      { $limit: 7 }
    ])
  ]);

  // Transform for frontend chart
  const assignmentData = assignmentStats.map(stat => ({
    name: new Date(stat.dueDate).toLocaleDateString('vi-VN', { weekday: 'short' }),
    submitted: stat.submittedCount,
    pending: Math.max(0, stat.totalStudents - stat.submittedCount)
  }));

  // Generate notifications
  const notifications = [];

  // Unsubmitted assignments notifications
  for (const stat of assignmentStats) {
    if (stat.submittedCount < stat.totalStudents) {
      const pending = stat.totalStudents - stat.submittedCount;
      const assignment = await AssignmentModel.findById(stat._id).populate('classId', 'name').lean();
      if (assignment) {
        const notificationId = `unsubmitted-${stat._id}`;
        const isRead = readNotificationIds.has(notificationId) || (lastReadAt && new Date(assignment.dueDate) <= lastReadAt);
        notifications.push({
          id: notificationId,
          title: `${pending} sinh viên chưa nộp "${assignment.title}"`,
          time: 'Gần đây',
          type: 'warning',
          content: `Bài tập "${assignment.title}" có ${pending} sinh viên chưa nộp. Hạn nộp: ${new Date(assignment.dueDate).toLocaleDateString('vi-VN')}.`,
          assignmentId: String(stat._id),
          pendingCount: pending,
          sender: 'Hệ thống',
          class: assignment.classId?.name || 'Unknown Class',
          isRead: isRead
        });
      }
    }
  }

  // Recent submissions notifications
  const assignmentIdsForSubmissions = await AssignmentModel.find({ classId: { $in: classIds } }).distinct('_id');
  const recentSubmissions = await SubmissionModel.find({
    assignmentId: { $in: assignmentIdsForSubmissions },
    createdAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) } // Last 24 hours
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('studentId', 'fullName')
    .populate({
      path: 'assignmentId',
      select: 'title classId',
      populate: { path: 'classId', select: 'name' }
    })
    .lean();

  for (const sub of recentSubmissions) {
    if (sub.assignmentId && sub.assignmentId.classId) {
      const notificationId = `submission-${sub._id}`;
      const isRead = readNotificationIds.has(notificationId) || (lastReadAt && new Date(sub.createdAt) <= lastReadAt);
      notifications.push({
        id: notificationId,
        title: `${sub.studentId?.fullName || 'Sinh viên'} đã nộp "${sub.assignmentId?.title || 'Bài tập'}"`,
        time: 'Gần đây',
        type: 'success',
        content: `${sub.studentId?.fullName || 'Sinh viên'} vừa nộp bài tập "${sub.assignmentId?.title || 'Bài tập'}" lúc ${new Date(sub.submittedAt || sub.createdAt).toLocaleString('vi-VN')}.`,
        submissionId: String(sub._id),
        studentName: sub.studentId?.fullName,
        assignmentTitle: sub.assignmentId?.title,
        isRead: isRead,
        sender: sub.studentId?.fullName || 'Sinh viên',
        class: sub.assignmentId.classId?.name || 'Unknown Class'
      });
    }
  }

  // Upcoming exams
  const upcomingExams = await AssignmentModel.find({
    classId: { $in: classIds },
    isExam: true,
    dueDate: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 3600 * 1000) } // Next 7 days
  })
    .populate('classId', 'name')
    .sort({ dueDate: 1 })
    .limit(3)
    .lean();

  for (const exam of upcomingExams) {
    const notificationId = `exam-${exam._id}`;
    const isRead = readNotificationIds.has(notificationId) || (lastReadAt && new Date(exam.dueDate) <= lastReadAt);
    notifications.push({
      id: notificationId,
      title: `Bài thi "${exam.title}" sắp đến`,
      time: 'Gần đây',
      type: 'info',
      content: `Bài thi "${exam.title}" sẽ diễn ra vào ${new Date(exam.dueDate).toLocaleString('vi-VN')}. Thời gian: ${exam.durationMinutes} phút.`,
      examId: String(exam._id),
      examTitle: exam.title,
      examDate: exam.dueDate,
      sender: 'Hệ thống',
      class: exam.classId?.name || 'Unknown Class',
      isRead: isRead
    });
  }

  // Schedule: assignments due today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  
  const schedule = await AssignmentModel.find({
    classId: { $in: classIds },
    dueDate: { $gte: todayStart, $lte: todayEnd }
  }).sort({ dueDate: 1 }).populate('classId', 'name code').lean();

  // Get submission counts for each assignment
  const assignmentIds = schedule.map(a => a._id);
  let submissionCountMap = new Map();
  if (assignmentIds.length > 0) {
    const submissionCounts = await SubmissionModel.aggregate([
      { $match: { assignmentId: { $in: assignmentIds } } },
      { $group: { _id: '$assignmentId', count: { $sum: 1 } } }
    ]);
    submissionCountMap = new Map(submissionCounts.map(s => [String(s._id), s.count]));
  }

  // Get enrollment counts for each class
  const classIdsForSchedule = [...new Set(schedule.map(a => a.classId?._id).filter(Boolean))];
  let enrollmentCountMap = new Map();
  if (classIdsForSchedule.length > 0) {
    const enrollmentCounts = await EnrollmentModel.aggregate([
      { $match: { classId: { $in: classIdsForSchedule }, status: 'enrolled' } },
      { $group: { _id: '$classId', count: { $sum: 1 } } }
    ]);
    enrollmentCountMap = new Map(enrollmentCounts.map(e => [String(e._id), e.count]));
  }

  const scheduleData = schedule.map(a => ({
    id: String(a._id),
    time: new Date(a.dueDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    subject: a.title,
    class: a.classId?.name || 'Unknown',
    classCode: a.classId?.code || 'Unknown',
    description: a.description || 'Không có mô tả',
    submittedCount: submissionCountMap.get(String(a._id)) || 0,
    totalStudents: enrollmentCountMap.get(String(a.classId?._id)) || 0,
    dueDate: a.dueDate,
    isExam: a.isExam || false
  }));

  res.json({
    stats: { 
      classes: classesCount, 
      assignments: assignmentsCount, 
      exams: examsCount
    },
    assignmentData,
    notifications: notifications.slice(0, 10), // Limit to 10 notifications
    schedule: scheduleData
  });
});

teacherRouter.get('/classes', async (req, res) => {
  const teacherId = req.user.id;
  const classes = await ClassModel.find({ teacherId }).sort({ createdAt: -1 }).lean();
  const classIds = classes.map(c => c._id);
  const [assignmentCounts, studentCounts] = await Promise.all([
    AssignmentModel.aggregate([
      { $match: { classId: { $in: classIds } } },
      { $group: { _id: '$classId', count: { $sum: 1 } } },
    ]),
    EnrollmentModel.aggregate([
      { $match: { classId: { $in: classIds }, status: 'enrolled' } },
      { $group: { _id: '$classId', count: { $sum: 1 } } },
    ]),
  ]);
  const assignmentCountByClassId = new Map(assignmentCounts.map(x => [String(x._id), x.count]));
  const studentCountByClassId = new Map(studentCounts.map(x => [String(x._id), x.count]));
  res.json(classes.map(c => ({
    id: String(c._id),
    name: c.name,
    code: c.code,
    department: c.department,
    assignments: assignmentCountByClassId.get(String(c._id)) || 0,
    students: studentCountByClassId.get(String(c._id)) || 0,
  })));
});

teacherRouter.get('/classes/:id', async (req, res) => {
  const { id } = req.params;
  const teacherId = req.user.id;
  const cls = await ClassModel.findById(id).lean();
  if (!cls) return res.status(404).json({ error: 'NOT_FOUND' });
  if (String(cls.teacherId) !== String(teacherId)) return res.status(403).json({ error: 'FORBIDDEN' });
  const teacher = await UserModel.findById(cls.teacherId).select('fullName email').lean();

  // Get assignments with submission counts
  const assignments = await AssignmentModel.find({ classId: id }).sort({ dueDate: 1 }).lean();
  const assignmentIds = assignments.map(a => a._id);
  const submissionCounts = await SubmissionModel.aggregate([
    { $match: { assignmentId: { $in: assignmentIds } } },
    { $group: { _id: '$assignmentId', count: { $sum: 1 } } }
  ]);
  const submissionCountMap = new Map(submissionCounts.map(s => [String(s._id), s.count]));

  const assignmentsWithCounts = assignments.map(a => ({
    id: String(a._id),
    title: a.title,
    description: a.description,
    dueDate: a.dueDate,
    isExam: !!a.isExam,
    durationMinutes: a.durationMinutes,
    submissions: submissionCountMap.get(String(a._id)) || 0
  }));

  // Get enrolled students
  const enrollments = await EnrollmentModel.find({ classId: id, status: 'enrolled' }).lean();
  const studentIds = enrollments.map(e => e.studentId);
  const users = await UserModel.find({ _id: { $in: studentIds } }).select('_id fullName email studentId').lean();
  const userById = new Map(users.map(u => [String(u._id), u]));
  const students = enrollments.map(e => {
    const u = userById.get(String(e.studentId));
    return { id: u?.studentId || String(e.studentId), name: u?.fullName || '', email: u?.email || '' };
  });

  // Get documents
  const documents = await DocumentModel.find({ classId: id }).sort({ createdAt: -1 }).lean();
  const documentsWithInfo = documents.map(d => ({
    id: String(d._id),
    title: d.title,
    description: d.description,
    fileName: d.fileName,
    fileSize: d.fileSize,
    fileType: d.fileType,
    fileUrl: d.fileUrl,
    uploadedAt: d.createdAt
  }));

  // Get announcements
  const announcements = await AnnouncementModel.find({ classId: id }).sort({ createdAt: -1 }).lean();
  const announcementsWithInfo = announcements.map(a => ({
    id: String(a._id),
    title: a.title,
    content: a.content,
    type: a.type,
    createdAt: a.createdAt
  }));

  res.json({
    id: String(cls._id),
    name: cls.name,
    code: cls.code,
    department: cls.department,
    teacher: teacher?.fullName || 'Giảng viên',
    assignments: assignmentsWithCounts,
    students,
    documents: documentsWithInfo,
    announcements: announcementsWithInfo
  });
});

teacherRouter.get('/assignments', async (req, res) => {
  const teacherId = req.user.id;
  const { courseId, assignmentName, sort = 'created_at:desc' } = req.query;

  // Get teacher's classes
  let classQuery = { teacherId };
  if (courseId && courseId !== 'all') {
    classQuery._id = courseId;
  }
  const classIds = await ClassModel.find(classQuery).distinct('_id');

  // Build assignment query
  let assignmentQuery = { classId: { $in: classIds } };
  if (assignmentName && assignmentName !== 'all') {
    assignmentQuery._id = assignmentName;
  }

  // Parse sort parameter (e.g., "created_at:desc", "due_date:asc")
  let sortOption = { createdAt: -1 }; // Default: newest first
  if (sort) {
    const [field, order] = sort.split(':');
    const sortOrder = order === 'desc' ? -1 : 1;
    switch (field) {
      case 'created_at':
        sortOption = { createdAt: sortOrder };
        break;
      case 'due_date':
        sortOption = { dueDate: sortOrder };
        break;
      case 'title':
        sortOption = { title: sortOrder };
        break;
      default:
        sortOption = { createdAt: sortOrder };
    }
  }

  const assignments = await AssignmentModel.find(assignmentQuery).sort(sortOption).lean();

  // Get submission stats for each assignment
  const assignmentIds = assignments.map(a => a._id);
  const submissionStats = await SubmissionModel.aggregate([
    { $match: { assignmentId: { $in: assignmentIds } } },
    {
      $group: {
        _id: '$assignmentId',
        totalSubmissions: { $sum: 1 },
        gradedSubmissions: {
          $sum: { $cond: [{ $ne: ['$score', null] }, 1, 0] }
        }
      }
    }
  ]);

  const statsMap = new Map(
    submissionStats.map(stat => [String(stat._id), {
      submittedStudents: stat.totalSubmissions,
      gradedStudents: stat.gradedSubmissions
    }])
  );

  // Get class info for each assignment
  const classInfo = await ClassModel.find({ _id: { $in: classIds } }).select('name code').lean();
  const classMap = new Map(classInfo.map(c => [String(c._id), { name: c.name, code: c.code }]));

  // Get total students for each class
  const enrollmentStats = await EnrollmentModel.aggregate([
    { $match: { classId: { $in: classIds }, status: 'enrolled' } },
    { $group: { _id: '$classId', count: { $sum: 1 } } }
  ]);
  const enrollmentMap = new Map(
    enrollmentStats.map(stat => [String(stat._id), stat.count])
  );

  res.json(assignments.map(a => {
    const classData = classMap.get(String(a.classId));
    const stats = statsMap.get(String(a._id)) || { submittedStudents: 0, gradedStudents: 0 };
    const totalStudents = enrollmentMap.get(String(a.classId)) || 0;

    return {
      id: String(a._id),
      title: a.title,
      description: a.description || '',
      dueDate: a.dueDate,
      startTime: a.startTime,
      endTime: a.endTime,
      isExam: !!a.isExam,
      durationMinutes: a.durationMinutes,
      requireMonitoring: !!a.requireMonitoring,
      classId: String(a.classId),
      className: classData?.name || 'Unknown Class',
      classCode: classData?.code || 'Unknown',
      submittedStudents: stats.submittedStudents,
      gradedStudents: stats.gradedStudents,
      totalStudents: totalStudents,
      status: new Date(a.dueDate) > new Date() ? 'active' : 'closed'
    };
  }));
});

// List submissions for an assignment
teacherRouter.get('/submissions', async (req, res) => {
  const teacherId = req.user.id;
  const { assignmentId } = req.query;
  if (!assignmentId) return res.status(400).json({ error: 'MISSING_ASSIGNMENT_ID' });
  // ensure assignment belongs to a teacher's class
  const assignment = await AssignmentModel.findById(assignmentId).lean();
  if (!assignment) return res.status(404).json({ error: 'NOT_FOUND' });
  const teacherOwns = await ClassModel.exists({ _id: assignment.classId, teacherId });
  if (!teacherOwns) return res.status(403).json({ error: 'FORBIDDEN' });
  const list = await SubmissionModel.find({ assignmentId }).sort({ submittedAt: -1 }).lean();
  const studentIds = list.map(s => s.studentId);
  const users = await UserModel.find({ _id: { $in: studentIds } }).select('_id fullName studentId').lean();
  const userById = new Map(users.map(u => [String(u._id), u]));
  res.json(list.map(s => {
    const u = userById.get(String(s.studentId));
    return {
      id: String(s._id),
      studentId: u?.studentId || String(s.studentId),
      studentName: u?.fullName || String(s.studentId),
      submittedAt: s.submittedAt,
      files: s.contentUrl ? s.contentUrl.split(';').filter(url => url) : [],
      notes: s.notes,
      score: s.score,
    };
  }));
});

// Grade a submission
teacherRouter.put('/submissions/:id/grade', async (req, res) => {
  const teacherId = req.user.id;
  const { id } = req.params;
  const { score, notes } = req.body || {};
  const submission = await SubmissionModel.findById(id).lean();
  if (!submission) return res.status(404).json({ error: 'NOT_FOUND' });
  const assignment = await AssignmentModel.findById(submission.assignmentId).lean();
  if (!assignment) return res.status(404).json({ error: 'ASSIGNMENT_NOT_FOUND' });
  const teacherOwns = await ClassModel.exists({ _id: assignment.classId, teacherId });
  if (!teacherOwns) return res.status(403).json({ error: 'FORBIDDEN' });
  const updated = await SubmissionModel.findByIdAndUpdate(id, { $set: { score, notes: notes ?? submission.notes } }, { new: true });

  // Create notification for the specific student
  try {
    const { createStudentNotification } = await import('../../utils/notification.js');
    const student = await UserModel.findById(submission.studentId).select('fullName').lean();

    await createStudentNotification(
      teacherId,
      submission.studentId,
      assignment.classId,
      'assignment_graded',
      `Điểm bài tập: ${assignment.title}`,
      `Bài nộp của bạn cho "${assignment.title}" đã được chấm. Điểm: ${score}/10.${notes ? ` Nhận xét: ${notes}` : ''}`,
      { assignmentId: submission.assignmentId, score }
    );
  } catch (error) {
    console.error('Failed to create grade notification:', error);
  }

  // Log grade submission activity
  try {
    const student = await UserModel.findById(submission.studentId).select('username fullName').lean();
    await logUserActivity(
      teacherId,
      'teacher',
      'grade_submission',
      id,
      'assignment',
      `Graded submission for ${student?.fullName || 'Unknown student'}: ${score}/10`,
      { assignmentId: submission.assignmentId, studentId: submission.studentId, score },
      req
    );
  } catch (error) {
    console.error('Failed to log grade submission activity:', error);
  }

  res.json({ success: true, id: String(updated._id) });
});

// Create assignment (teacher-owned class only)
teacherRouter.post('/assignments', async (req, res) => {
  const teacherId = req.user.id;
  const {
    classId,
    title,
    dueDate,
    isExam = false,
    durationMinutes = null,
    description = '',
    startTime = null,
    requireMonitoring = false
  } = req.body || {};
  if (!classId || !title || !dueDate) return res.status(400).json({ error: 'MISSING_FIELDS' });
  const cls = await ClassModel.findOne({ _id: classId, teacherId }).lean();
  if (!cls) return res.status(403).json({ error: 'FORBIDDEN' });
  const payload = {
    classId,
    title,
    dueDate,
    isExam: !!isExam,
    durationMinutes: durationMinutes ?? null,
    description,
    requireMonitoring: !!requireMonitoring
  };
  if (payload.isExam) {
    if (startTime) {
      payload.startTime = startTime;
    } else {
      payload.startTime = dueDate;
    }
    const baseStart = new Date(payload.startTime);
    if (payload.durationMinutes) {
      payload.endTime = new Date(baseStart.getTime() + payload.durationMinutes * 60000);
    } else {
      payload.endTime = new Date(baseStart.getTime());
    }
  } else {
    payload.startTime = null;
    payload.endTime = null;
  }
  const created = await AssignmentModel.create(payload);

  // Create notifications for all students in the class
  try {
    const { createClassNotifications } = await import('../../utils/notification.js');
    await createClassNotifications(
      teacherId,
      classId,
      'assignment_created',
      `Bài tập mới: ${title}`,
      `Giảng viên đã giao bài tập "${title}". Hạn nộp: ${new Date(dueDate).toLocaleString('vi-VN')}.`,
      { assignmentId: created._id }
    );
  } catch (error) {
    console.error('Failed to create assignment notifications:', error);
  }

  // Log create assignment activity
  try {
    await logUserActivity(
      teacherId,
      'teacher',
      'create_assignment',
      created._id,
      'assignment',
      `Created ${isExam ? 'exam' : 'assignment'}: ${title}`,
      { classId, className: cls.name, dueDate, isExam },
      req
    );
  } catch (error) {
    console.error('Failed to log create assignment activity:', error);
  }

  return res.status(201).json({ id: String(created._id) });
});

// Update assignment (only if belongs to teacher's class)
teacherRouter.put('/assignments/:id', async (req, res) => {
  const teacherId = req.user.id;
  const { id } = req.params;
  const assignment = await AssignmentModel.findById(id).lean();
  if (!assignment) return res.status(404).json({ error: 'NOT_FOUND' });
  const owns = await ClassModel.exists({ _id: assignment.classId, teacherId });
  if (!owns) return res.status(403).json({ error: 'FORBIDDEN' });
  const { title, dueDate, isExam, durationMinutes, description, startTime, requireMonitoring } = req.body || {};
  const update = {};
  if (title !== undefined) update.title = title;
  if (dueDate !== undefined) update.dueDate = dueDate;
  if (isExam !== undefined) update.isExam = !!isExam;
  if (durationMinutes !== undefined) update.durationMinutes = durationMinutes;
  if (description !== undefined) update.description = description;
  if (requireMonitoring !== undefined) update.requireMonitoring = !!requireMonitoring;

  const effectiveIsExam = update.isExam !== undefined ? update.isExam : assignment.isExam;
  if (effectiveIsExam) {
    if (startTime !== undefined) {
      update.startTime = startTime || dueDate || assignment.startTime || assignment.dueDate;
    } else if (update.dueDate && !update.startTime) {
      update.startTime = update.dueDate;
    }
    const baseStart = new Date(update.startTime || assignment.startTime || assignment.dueDate);
    const duration = update.durationMinutes !== undefined ? update.durationMinutes : assignment.durationMinutes;
    if (duration) {
      update.endTime = new Date(baseStart.getTime() + duration * 60000);
    } else {
      update.endTime = new Date(baseStart.getTime());
    }
  } else {
    update.startTime = null;
    update.endTime = null;
  }
  const updated = await AssignmentModel.findByIdAndUpdate(id, update, { new: true });
  if (!updated) return res.status(404).json({ error: 'NOT_FOUND' });
  return res.json({ success: true });
});

// Upload file for assignment (attachments)
teacherRouter.post('/assignments/:id/upload', upload.array('files', 3), async (req, res) => {
const teacherId = req.user.id;
const { id } = req.params;
const assignment = await AssignmentModel.findById(id).lean();
if (!assignment) return res.status(404).json({ error: 'NOT_FOUND' });
const owns = await ClassModel.exists({ _id: assignment.classId, teacherId });
if (!owns) return res.status(403).json({ error: 'FORBIDDEN' });

  const fileUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
  if (fileUrls.length === 0) return res.status(400).json({ error: 'NO_FILES_UPLOADED' });

  // Update assignment with attachment URLs
  const updated = await AssignmentModel.findByIdAndUpdate(id, {
    $push: { attachments: { $each: fileUrls } }
  }, { new: true });

  res.json({ success: true, attachments: updated.attachments || [] });
});

// Delete assignment (only if belongs to teacher's class)
teacherRouter.delete('/assignments/:id', async (req, res) => {
  const teacherId = req.user.id;
  const { id } = req.params;
  const assignment = await AssignmentModel.findById(id).lean();
  if (!assignment) return res.status(404).json({ error: 'NOT_FOUND' });
  const owns = await ClassModel.exists({ _id: assignment.classId, teacherId });
  if (!owns) return res.status(403).json({ error: 'FORBIDDEN' });
  await AssignmentModel.findByIdAndDelete(id);
  return res.json({ success: true });
});

// ---- Document Management ----

// Get documents for a class
teacherRouter.get('/classes/:id/documents', async (req, res) => {
  const { id } = req.params;
  const teacherId = req.user.id;
  const cls = await ClassModel.findOne({ _id: id, teacherId }).lean();
  if (!cls) return res.status(403).json({ error: 'FORBIDDEN' });

  const documents = await DocumentModel.find({ classId: id }).sort({ createdAt: -1 }).lean();
  res.json(documents.map(d => ({
    id: String(d._id),
    title: d.title,
    description: d.description,
    fileName: d.fileName,
    fileSize: d.fileSize,
    fileType: d.fileType,
    fileUrl: d.fileUrl,
    uploadedAt: d.createdAt
  })));
});

// Upload document
teacherRouter.post('/classes/:id/documents', upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const teacherId = req.user.id;
  const { title, description = '' } = req.body;

  const cls = await ClassModel.findOne({ _id: id, teacherId }).lean();
  if (!cls) return res.status(403).json({ error: 'FORBIDDEN' });

  if (!req.file) return res.status(400).json({ error: 'NO_FILE' });
  if (!title) return res.status(400).json({ error: 'MISSING_TITLE' });

  let fileUrl;
  
  if (useCloudinary) {
    // Upload to Cloudinary for production
    const fileName = `document-${id}-${Date.now()}-${req.file.originalname}`;
    const result = await uploadToCloudinary(req.file.buffer, fileName, 'datn2025/documents');
    fileUrl = result.secure_url;
  } else {
    // Use local storage for development
    fileUrl = `/uploads/${req.file.filename}`;
  }

  const document = await DocumentModel.create({
    classId: id,
    teacherId,
    title,
    description,
    fileUrl,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    fileType: req.file.mimetype
  });

  // Create notifications for all students in the class
  try {
    const { createClassNotifications } = await import('../../utils/notification.js');
    await createClassNotifications(
      teacherId,
      id,
      'document_uploaded',
      `Tài liệu mới: ${title}`,
      `Giảng viên đã tải lên tài liệu "${title}". Vui lòng kiểm tra và tải xuống nếu cần.`,
      { documentId: document._id }
    );
  } catch (error) {
    console.error('Failed to create document notifications:', error);
  }

  res.status(201).json({
    id: String(document._id),
    title: document.title,
    description: document.description,
    fileName: document.fileName,
    fileSize: document.fileSize,
    fileType: document.fileType,
    fileUrl: document.fileUrl,
    uploadedAt: document.createdAt
  });
});

// Delete document
teacherRouter.delete('/documents/:id', async (req, res) => {
  const { id } = req.params;
  const teacherId = req.user.id;

  const document = await DocumentModel.findById(id).lean();
  if (!document) return res.status(404).json({ error: 'NOT_FOUND' });

  // Check if teacher owns the class
  const cls = await ClassModel.findOne({ _id: document.classId, teacherId }).lean();
  if (!cls) return res.status(403).json({ error: 'FORBIDDEN' });

  // Delete from Cloudinary if applicable
  if (useCloudinary && document.fileUrl && document.fileUrl.includes('cloudinary')) {
    try {
      const publicId = document.fileUrl.split('/').slice(-3).join('/').split('.')[0];
      await deleteFromCloudinary(publicId);
    } catch (err) {
      console.warn('Could not delete document from Cloudinary:', err);
    }
  }

  await DocumentModel.findByIdAndDelete(id);
  res.json({ success: true });
});

// ---- Announcement Management ----

// Get announcements for a class
teacherRouter.get('/classes/:id/announcements', async (req, res) => {
  const { id } = req.params;
  const teacherId = req.user.id;
  const cls = await ClassModel.findOne({ _id: id, teacherId }).lean();
  if (!cls) return res.status(403).json({ error: 'FORBIDDEN' });

  const announcements = await AnnouncementModel.find({ classId: id }).sort({ createdAt: -1 }).lean();
  res.json(announcements.map(a => ({
    id: String(a._id),
    title: a.title,
    content: a.content,
    type: a.type,
    createdAt: a.createdAt
  })));
});

// Create announcement
teacherRouter.post('/classes/:id/announcements', async (req, res) => {
  const { id } = req.params;
  const teacherId = req.user.id;
  const { title, content, type = 'general' } = req.body;

  const cls = await ClassModel.findOne({ _id: id, teacherId }).lean();
  if (!cls) return res.status(403).json({ error: 'FORBIDDEN' });

  if (!title || !content) return res.status(400).json({ error: 'MISSING_FIELDS' });

  const announcement = await AnnouncementModel.create({
    classId: id,
    teacherId,
    title,
    content,
    type
  });

  // Create notifications for all students in the class
  try {
    const { createClassNotifications } = await import('../../utils/notification.js');
    await createClassNotifications(
      teacherId,
      id,
      'announcement_created',
      `Thông báo: ${title}`,
      announcement.content,
      { announcementId: announcement._id }
    );
  } catch (error) {
    console.error('Failed to create announcement notifications:', error);
  }

  res.status(201).json({
    id: String(announcement._id),
    title: announcement.title,
    content: announcement.content,
    type: announcement.type,
    createdAt: announcement.createdAt
  });
});

// Delete announcement
teacherRouter.delete('/announcements/:id', async (req, res) => {
  const { id } = req.params;
  const teacherId = req.user.id;

  const announcement = await AnnouncementModel.findById(id).lean();
  if (!announcement) return res.status(404).json({ error: 'NOT_FOUND' });

  // Check if teacher owns the class
  const cls = await ClassModel.findOne({ _id: announcement.classId, teacherId }).lean();
  if (!cls) return res.status(403).json({ error: 'FORBIDDEN' });

  await AnnouncementModel.findByIdAndDelete(id);
  res.json({ success: true });
});

// ---- Student Management ----

// Remove student from class
teacherRouter.delete('/classes/:classId/students/:studentId', async (req, res) => {
  const { classId, studentId } = req.params;
  const teacherId = req.user.id;

  // Check if teacher owns the class
  const cls = await ClassModel.findOne({ _id: classId, teacherId }).lean();
  if (!cls) return res.status(403).json({ error: 'FORBIDDEN' });

  // Find the student by studentId, _id (if valid ObjectId), or username
  const queryConditions = [
    { studentId: studentId },
    { username: studentId }
  ];
  
  // Only add _id condition if studentId is a valid ObjectId
  if (mongoose.Types.ObjectId.isValid(studentId)) {
    queryConditions.push({ _id: studentId });
  }
  
  const student = await UserModel.findOne({
    $or: queryConditions,
    role: 'student'
  }).lean();

  if (!student) {
    return res.status(404).json({ error: 'STUDENT_NOT_FOUND' });
  }

  // Remove enrollment
  const enrollment = await EnrollmentModel.findOneAndDelete({
    classId: classId,
    studentId: student._id,
    status: 'enrolled'
  });

  if (!enrollment) {
    return res.status(404).json({ error: 'ENROLLMENT_NOT_FOUND' });
  }

  // Log activity
  try {
    await logUserActivity(
      teacherId,
      'teacher',
      'remove_student',
      classId,
      'class',
      `Removed student ${student.fullName || student.username} from class ${cls.name}`,
      { studentId: student._id, studentName: student.fullName || student.username, className: cls.name },
      req
    );
  } catch (error) {
    console.error('Failed to log remove student activity:', error);
  }

  res.json({ success: true });
});

// Test file serving
teacherRouter.get('/test-files', (req, res) => {
  res.json({
    message: 'File serving test',
    uploadsPath: path.join(__dirname, '../uploads'),
    files: []
  });
});

// ---- Comment Management ----

// Get comments for a class
teacherRouter.get('/classes/:id/comments', async (req, res) => {
  const { id } = req.params;
  const teacherId = req.user.id;
  const cls = await ClassModel.findOne({ _id: id, teacherId }).lean();
  if (!cls) return res.status(403).json({ error: 'FORBIDDEN' });

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

// Create comment
teacherRouter.post('/classes/:id/comments', async (req, res) => {
  const { id } = req.params;
  const teacherId = req.user.id;
  const { content } = req.body;

  const cls = await ClassModel.findOne({ _id: id, teacherId }).lean();
  if (!cls) return res.status(403).json({ error: 'FORBIDDEN' });

  if (!content || !content.trim()) return res.status(400).json({ error: 'CONTENT_REQUIRED' });

  const comment = await CommentModel.create({
    classId: id,
    userId: teacherId,
    userRole: 'teacher',
    content: content.trim()
  });

  // Notify all students in the class about the new comment
  try {
    const { createClassNotifications } = await import('../../utils/notification.js');
    await createClassNotifications(
      teacherId,
      id,
      'comment_created',
      `Bình luận mới từ ${req.user.fullName || 'Giảng viên'}`,
      comment.content,
      { commentId: comment._id }
    );
  } catch (error) {
    console.error('Failed to create comment notifications:', error);
  }

  res.status(201).json({
    id: String(comment._id),
    author: req.user.fullName || 'Giảng viên',
    role: 'teacher',
    content: comment.content,
    time: 'Vừa xong',
    createdAt: comment.createdAt
  });
});

// ---- Notifications ----

// Get notifications for teacher header
teacherRouter.get('/notifications', async (req, res) => {
  const teacherId = req.user.id;
  const classIds = await ClassModel.find({ teacherId }).distinct('_id');

  // Get teacher's last notification read timestamp
  const user = await UserModel.findById(teacherId).select('lastNotificationReadAt teacherReadNotificationIds').lean();
  const lastReadAt = user?.lastNotificationReadAt ? new Date(user.lastNotificationReadAt) : null;
  const readNotificationIds = new Set(user?.teacherReadNotificationIds || []);

  const notifications = [];

  // Recent submissions (last 24 hours)
  const assignmentIds = await AssignmentModel.find({ classId: { $in: classIds } }).distinct('_id');
  const recentSubmissions = await SubmissionModel.find({
    assignmentId: { $in: assignmentIds },
    createdAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) }
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('studentId', 'fullName')
    .populate({
      path: 'assignmentId',
      select: 'title classId',
      populate: { path: 'classId', select: 'name' }
    })
    .lean();

  for (const sub of recentSubmissions) {
    if (sub.assignmentId && sub.assignmentId.classId) {
      const notificationId = `submission-${sub._id}`;
      const isRead = readNotificationIds.has(notificationId) || (lastReadAt && new Date(sub.createdAt) <= lastReadAt);
      notifications.push({
        id: notificationId,
        type: 'assignment_submitted',
        title: `${sub.studentId?.fullName || 'Sinh viên'} đã nộp "${sub.assignmentId?.title || 'Bài tập'}"`,
        content: `${sub.studentId?.fullName || 'Sinh viên'} vừa nộp bài tập "${sub.assignmentId?.title || 'Bài tập'}" lúc ${new Date(sub.submittedAt || sub.createdAt).toLocaleString('vi-VN')}.`,
        time: new Date(sub.createdAt).toLocaleString('vi-VN'),
        class: sub.assignmentId.classId?.name || 'Unknown Class',
        sender: sub.studentId?.fullName || 'Sinh viên',
        isRead: isRead,
        createdAt: sub.createdAt
      });
    }
  }

  // Unsubmitted assignments (pending submissions)
  const assignments = await AssignmentModel.find({
    classId: { $in: classIds },
    dueDate: { $gte: new Date() }
  })
    .populate('classId', 'name')
    .lean();

  for (const assignment of assignments) {
    const submissionCount = await SubmissionModel.countDocuments({ assignmentId: assignment._id });
    const enrollmentCount = await EnrollmentModel.countDocuments({
      classId: assignment.classId,
      status: 'enrolled'
    });
    
    if (submissionCount < enrollmentCount) {
      const pending = enrollmentCount - submissionCount;
      const notificationId = `unsubmitted-${assignment._id}`;
      const isRead = readNotificationIds.has(notificationId) || (lastReadAt && new Date(assignment.dueDate) <= lastReadAt);
      notifications.push({
        id: notificationId,
        type: 'assignment_pending',
        title: `${pending} sinh viên chưa nộp "${assignment.title}"`,
        content: `Bài tập "${assignment.title}" có ${pending} sinh viên chưa nộp. Hạn nộp: ${new Date(assignment.dueDate).toLocaleDateString('vi-VN')}.`,
        time: new Date(assignment.dueDate).toLocaleString('vi-VN'),
        class: assignment.classId?.name || 'Unknown Class',
        sender: 'Hệ thống',
        isRead: isRead,
        createdAt: assignment.dueDate
      });
    }
  }

  // Recent comments from students
  const recentComments = await CommentModel.find({
    classId: { $in: classIds },
    userRole: 'student',
    createdAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) }
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('userId', 'fullName')
    .populate('classId', 'name')
    .lean();

  for (const comment of recentComments) {
    const notificationId = `comment-${comment._id}`;
    const isRead = readNotificationIds.has(notificationId) || (lastReadAt && new Date(comment.createdAt) <= lastReadAt);
    notifications.push({
      id: notificationId,
      type: 'comment_created',
      title: `${comment.userId?.fullName || 'Sinh viên'} đã bình luận`,
      content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
      time: new Date(comment.createdAt).toLocaleString('vi-VN'),
      class: comment.classId?.name || 'Unknown Class',
      sender: comment.userId?.fullName || 'Sinh viên',
      isRead: isRead,
      createdAt: comment.createdAt
    });
  }

  // Sort by createdAt descending and limit to 20
  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const limitedNotifications = notifications.slice(0, 20);

  res.json(limitedNotifications);
});

// Mark notification as read
teacherRouter.post('/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  const teacherId = req.user.id;

  try {
    // Get current user to check existing read notification IDs
    const user = await UserModel.findById(teacherId).select('teacherReadNotificationIds').lean();
    const readIds = new Set(user?.teacherReadNotificationIds || []);
    
    // Add this notification ID to the set
    readIds.add(id);
    
    // Update user with new read notification IDs
    await UserModel.updateOne(
      { _id: teacherId },
      { $set: { teacherReadNotificationIds: Array.from(readIds) } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
teacherRouter.post('/notifications/mark-all-read', async (req, res) => {
  const teacherId = req.user.id;

  try {
    const now = new Date();
    
    // Update lastNotificationReadAt to mark all current notifications as read
    await UserModel.updateOne(
      { _id: teacherId },
      { $set: { lastNotificationReadAt: now } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});


