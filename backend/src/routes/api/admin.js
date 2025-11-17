import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../../models/User.js';
import { authRequired } from '../../middleware/auth.js';
import { ClassModel } from '../../models/Class.js';
import { AssignmentModel } from '../../models/Assignment.js';
import { EnrollmentModel } from '../../models/Enrollment.js';
import { SubmissionModel } from '../../models/Submission.js';
import { logUserActivity, getRecentUserActivities, getSystemLogs } from '../../utils/logger.js';

export const adminRouter = Router();

// Require admin role for all routes in this router (except account operations)
adminRouter.use((req, res, next) => {
  if (req.path === '/debug-users' || req.path.startsWith('/accounts')) {
    return next(); // Skip auth for debug and account operations
  }
  return authRequired(['admin'])(req, res, next);
});

adminRouter.get('/dashboard', async (_req, res) => {
  const [totalUsers, totalClasses, totalAssignments, totalEnrollments, totalSubmissions, teacherCount, studentCount, adminCount] = await Promise.all([
    UserModel.countDocuments({}),
    ClassModel.countDocuments({}),
    AssignmentModel.countDocuments({}),
    EnrollmentModel.countDocuments({}),
    SubmissionModel.countDocuments({}),
    UserModel.countDocuments({ role: 'teacher' }),
    UserModel.countDocuments({ role: 'student' }),
    UserModel.countDocuments({ role: 'admin' }),
  ]);
  res.json({
    system: {
      users: totalUsers,
      teachers: teacherCount,
      students: studentCount,
      admins: adminCount,
      classes: totalClasses,
      assignments: totalAssignments,
      enrollments: totalEnrollments,
      submissions: totalSubmissions,
    },
    alerts: [],
  });
});

// Debug route to check users count
adminRouter.get('/debug-users', async (req, res) => {
  const totalUsers = await UserModel.countDocuments();
  const adminCount = await UserModel.countDocuments({ role: 'admin' });
  const teacherCount = await UserModel.countDocuments({ role: 'teacher' });
  const studentCount = await UserModel.countDocuments({ role: 'student' });
  const users = await UserModel.find({}, 'username fullName role status').limit(15).lean();

  res.json({
    total: totalUsers,
    breakdown: { admin: adminCount, teacher: teacherCount, student: studentCount },
    users: users.map(u => `${u.username} [${u.role}] ${u.fullName}`)
  });
});

adminRouter.get('/accounts', async (req, res) => {
  const { role, q, status, page = 1, pageSize = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (q) {
    filter.$or = [
      { username: new RegExp(String(q), 'i') },
      { fullName: new RegExp(String(q), 'i') },
      { email: new RegExp(String(q), 'i') },
      { department: new RegExp(String(q), 'i') },
    ];
  }
  const skip = (Number(page) - 1) * Number(pageSize);
  const [items, total] = await Promise.all([
    UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(pageSize)).lean(),
    UserModel.countDocuments(filter),
  ]);
  res.json({ items: items.map(marshallUser), total, page: Number(page), pageSize: Number(pageSize) });
});

// Create account
adminRouter.post('/accounts', async (req, res) => {
  const { username, fullName, email, role, password, status = 'active', phone = '', department = '' } = req.body || {};
  if (!username || !fullName || !email || !role || !password) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }
  const existing = await UserModel.findOne({ username }).lean();
  if (existing) return res.status(409).json({ error: 'USERNAME_EXISTS' });
  const passwordHash = await bcrypt.hash(password, 10);
  const created = await UserModel.create({ username, fullName, email, role, status, passwordHash, phone, department });

  // Log create user activity
  try {
    await logUserActivity(
      req.user.id,
      'admin',
      'create_user',
      created._id,
      'user',
      `Created ${role} account: ${username} (${fullName})`,
      { username, fullName, email, role },
      req
    );
  } catch (error) {
    console.error('Failed to log create user activity:', error);
  }

  return res.status(201).json(marshallUser(created));
});

// Update account
adminRouter.put('/accounts/:id', async (req, res) => {
  const { id } = req.params;
  const { fullName, email, role, status, password, phone, department } = req.body || {};
  const update = {};
  if (fullName) update.fullName = fullName;
  if (email) update.email = email;
  if (role) update.role = role;
  if (status) update.status = status;
  if (phone !== undefined) update.phone = phone;
  if (department !== undefined) update.department = department;
  if (password) update.passwordHash = await bcrypt.hash(password, 10);
  const updated = await UserModel.findByIdAndUpdate(id, update, { new: true });
  if (!updated) return res.status(404).json({ error: 'NOT_FOUND' });
  return res.json(marshallUser(updated));
});

// Delete account
adminRouter.delete('/accounts/:id', async (req, res) => {
  const { id } = req.params;
  const deleted = await UserModel.findByIdAndDelete(id);
  if (!deleted) return res.status(404).json({ error: 'NOT_FOUND' });
  return res.json({ success: true });
});

function marshallUser(u) {
  return {
    id: String(u._id),
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    status: u.status,
    isLocked: u.isLocked || false,
    phone: u.phone || '',
    department: u.department || '',
    createdAt: u.createdAt,
    lastLogin: u.lastLoginAt || null,
  };
}

// ---- Class CRUD ----
adminRouter.get('/classes/:id', async (req, res) => {
  const { id } = req.params;
  const cls = await ClassModel.findById(id).lean();
  if (!cls) return res.status(404).json({ error: 'NOT_FOUND' });

  // Get teacher info
  const teacher = await UserModel.findById(cls.teacherId, 'username fullName email phone department').lean();

  // Get assignments for this class
  const assignments = await AssignmentModel.find({ classId: id }).sort({ createdAt: -1 }).lean();

  // Get enrolled students
  const enrollments = await EnrollmentModel.find({ classId: id, status: 'enrolled' }).lean();
  const studentIds = enrollments.map(e => e.studentId);
  const students = await UserModel.find({ _id: { $in: studentIds } }, 'username fullName email phone studentId isLocked').sort({ fullName: 1 }).lean();

  // Calculate completion rates
  const assignmentIds = assignments.map(a => a._id);
  const submissions = await SubmissionModel.find({ assignmentId: { $in: assignmentIds }, studentId: { $in: studentIds } }).lean();

  const completionMap = {};
  students.forEach(student => {
  completionMap[student._id.toString()] = { submitted: 0, total: assignments.length };
  });
  submissions.forEach(sub => {
  if (sub.submittedAt && completionMap[sub.studentId.toString()]) {
  completionMap[sub.studentId.toString()].submitted++;
  }
  });

  // Calculate detailed assignment stats for each student
  const assignmentStatsMap = {};
  students.forEach(student => {
    const studentSubmissions = submissions.filter(sub => sub.studentId.toString() === student._id.toString());
    const submittedCount = studentSubmissions.filter(sub => sub.submittedAt).length;
    const gradedCount = studentSubmissions.filter(sub => sub.score != null).length;
    assignmentStatsMap[student._id.toString()] = {
      submitted: submittedCount,
      graded: gradedCount,
      total: assignments.length
    };
  });

  res.json({
    id: String(cls._id),
    name: cls.name,
    code: cls.code,
    department: cls.department,
    credits: cls.credits,
    description: cls.description,
    teacher: teacher ? {
      id: String(teacher._id),
      username: teacher.username,
      fullName: teacher.fullName,
      email: teacher.email,
      phone: teacher.phone,
      department: teacher.department
    } : null,
    students: students.map(s => {
    const enrollment = enrollments.find(e => e.studentId.toString() === s._id.toString());
    const completion = completionMap[s._id.toString()] || { submitted: 0, total: assignments.length };
    const stats = assignmentStatsMap[s._id.toString()] || { submitted: 0, graded: 0, total: assignments.length };
    const completionRate = stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0;
    return {
    id: String(s._id),
    username: s.username,
    fullName: s.fullName,
    email: s.email,
    phone: s.phone,
    studentId: s.studentId,
    enrollmentDate: enrollment ? new Date(enrollment.createdAt).toLocaleDateString('vi-VN') : 'N/A',
    assignmentsCompleted: stats.submitted,
      assignmentsTotal: stats.total,
        completionRate: `${completionRate}%`,
        status: s.isLocked ? 'locked' : 'active'
      };
    }),
    assignments: assignments.map(a => ({
      id: String(a._id),
      title: a.title,
      description: a.description,
      dueDate: a.dueDate,
      isExam: !!a.isExam,
      durationMinutes: a.durationMinutes
    })),
    totalStudents: students.length,
    createdAt: cls.createdAt,
    updatedAt: cls.updatedAt
  });
});

adminRouter.get('/classes', async (_req, res) => {
  const items = await ClassModel.find({}).sort({ createdAt: -1 }).lean();
  res.json(items.map(c => ({ id: String(c._id), name: c.name, code: c.code, department: c.department, credits: c.credits, teacherId: String(c.teacherId) })));
});

adminRouter.post('/classes', async (req, res) => {
  const { name, code, teacherId, department = '', description = '' } = req.body || {};
  if (!name || !code || !teacherId) return res.status(400).json({ error: 'MISSING_FIELDS' });

  // Validate teacher exists
  const teacherExists = await UserModel.findById(teacherId).lean();
  if (!teacherExists || teacherExists.role !== 'teacher') {
    return res.status(400).json({ error: 'INVALID_TEACHER' });
  }

  const exists = await ClassModel.findOne({ code }).lean();
  if (exists) return res.status(409).json({ error: 'CODE_EXISTS' });

  const created = await ClassModel.create({ name, code, teacherId, department, description });
  res.status(201).json({ id: String(created._id) });
});

adminRouter.put('/classes/:id', async (req, res) => {
  const { id } = req.params;
  const { name, code, teacherId, department, description } = req.body || {};

  // Validate teacher exists if teacherId is provided
  if (teacherId !== undefined) {
    const teacherExists = await UserModel.findById(teacherId).lean();
    if (!teacherExists || teacherExists.role !== 'teacher') {
      return res.status(400).json({ error: 'INVALID_TEACHER' });
    }
  }

  const update = {};
  if (name !== undefined) update.name = name;
  if (code !== undefined) update.code = code;
  if (teacherId !== undefined) update.teacherId = teacherId;
  if (department !== undefined) update.department = department;
  if (description !== undefined) update.description = description;

  const updated = await ClassModel.findByIdAndUpdate(id, update, { new: true });
  if (!updated) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ success: true });
});

adminRouter.delete('/classes/:id', async (req, res) => {
  const { id } = req.params;
  await ClassModel.findByIdAndDelete(id);
  res.json({ success: true });
});

// ---- Assignment CRUD ----
adminRouter.get('/assignments', async (_req, res) => {
  const items = await AssignmentModel.find({}).sort({ createdAt: -1 }).lean();
  res.json(items.map(a => ({ id: String(a._id), classId: String(a.classId), title: a.title, dueDate: a.dueDate, isExam: !!a.isExam, durationMinutes: a.durationMinutes })));
});

adminRouter.post('/assignments', async (req, res) => {
  const { classId, title, dueDate, isExam = false, durationMinutes = null, description = '' } = req.body || {};
  if (!classId || !title || !dueDate) return res.status(400).json({ error: 'MISSING_FIELDS' });
  const created = await AssignmentModel.create({ classId, title, dueDate, isExam, durationMinutes, description });
  res.status(201).json({ id: String(created._id) });
});

adminRouter.put('/assignments/:id', async (req, res) => {
  const { id } = req.params;
  const { title, dueDate, isExam, durationMinutes, description } = req.body || {};
  const update = {};
  if (title !== undefined) update.title = title;
  if (dueDate !== undefined) update.dueDate = dueDate;
  if (isExam !== undefined) update.isExam = isExam;
  if (durationMinutes !== undefined) update.durationMinutes = durationMinutes;
  if (description !== undefined) update.description = description;
  const updated = await AssignmentModel.findByIdAndUpdate(id, update, { new: true });
  if (!updated) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ success: true });
});

adminRouter.delete('/assignments/:id', async (req, res) => {
  const { id } = req.params;
  await AssignmentModel.findByIdAndDelete(id);
  res.json({ success: true });
});

// ---- Enrollment CRUD ----
adminRouter.get('/enrollments', async (_req, res) => {
  const items = await EnrollmentModel.find({}).sort({ createdAt: -1 }).lean();
  res.json(items.map(e => ({ id: String(e._id), classId: String(e.classId), studentId: String(e.studentId), status: e.status })));
});

adminRouter.post('/enrollments', async (req, res) => {
  const { classId, studentId, status = 'enrolled' } = req.body || {};
  if (!classId || !studentId) return res.status(400).json({ error: 'MISSING_FIELDS' });
  const created = await EnrollmentModel.create({ classId, studentId, status });
  res.status(201).json({ id: String(created._id) });
});

adminRouter.put('/enrollments/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const update = {};
  if (status !== undefined) update.status = status;
  const updated = await EnrollmentModel.findByIdAndUpdate(id, update, { new: true });
  if (!updated) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ success: true });
});

adminRouter.delete('/enrollments/:id', async (req, res) => {
  const { id } = req.params;
  await EnrollmentModel.findByIdAndDelete(id);
  res.json({ success: true });
});

// ---- Reports & Analytics ----
adminRouter.get('/reports/users', async (req, res) => {
  const { period = 'all' } = req.query;

  let dateFilter = {};
  if (period !== 'all') {
    const now = new Date();
    const periods = {
      'week': 7,
      'month': 30,
      'quarter': 90,
      'year': 365
    };
    const days = periods[period] || 30;
    dateFilter = { createdAt: { $gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000) } };
  }

  const [totalUsers, usersByRole, usersByPeriod] = await Promise.all([
    UserModel.countDocuments(),
    UserModel.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]),
    UserModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ])
  ]);

  res.json({
    totalUsers,
    usersByRole: usersByRole.map(r => ({ role: r._id, count: r.count })),
    usersByPeriod: usersByPeriod.map(p => ({ date: p._id, count: p.count }))
  });
});

adminRouter.get('/reports/classes', async (_req, res) => {
  const [totalClasses, activeClasses] = await Promise.all([
    ClassModel.countDocuments(),
    ClassModel.countDocuments({}) // All classes are considered active for now
  ]);

  res.json({
    totalClasses,
    activeClasses
  });
});

adminRouter.get('/reports/assignments', async (_req, res) => {
  const assignments = await AssignmentModel.find({}).lean();
  const assignmentIds = assignments.map(a => a._id);

  const submissions = await SubmissionModel.find({
    assignmentId: { $in: assignmentIds }
  }).lean();

  const submittedCount = submissions.filter(s => s.submittedAt).length;
  const notSubmittedCount = assignments.length - submittedCount;

  res.json({
    totalAssignments: assignments.length,
    submittedAssignments: submittedCount,
    notSubmittedAssignments: notSubmittedCount
  });
});

// Export report (log activity)
adminRouter.post('/reports/export', async (req, res) => {
  const { reportType } = req.body || {};

  try {
    let csvData = '';
    let filename = '';

    switch (reportType) {
      case 'users':
        const userStats = await generateUserReport();
        csvData = userStats.csv;
        filename = `user_report_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'classes':
        const classStats = await generateClassReport();
        csvData = classStats.csv;
        filename = `class_report_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'assignments':
        const assignmentStats = await generateAssignmentReport();
        csvData = assignmentStats.csv;
        filename = `assignment_report_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Log export report activity
    await logUserActivity(
      req.user.id,
      'admin',
      'export_report',
      null,
      'report',
      `Exported ${reportType} report`,
      { reportType, filename },
      req
    );

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);

  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Helper functions to generate CSV reports
async function generateUserReport() {
  const totalUsers = await UserModel.countDocuments();
  const usersByRole = await UserModel.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]);

  // Get all users with details
  const allUsers = await UserModel.find({}, 'username fullName email role status isLocked phone department studentId lastLoginAt createdAt').sort({ createdAt: -1 }).lean();

  let csv = 'Username,Full Name,Email,Role,Status,Is Locked,Phone,Department,Student ID,Last Login,Created At\n';

  allUsers.forEach(user => {
    const row = [
    user.username,
    `"${user.fullName}"`,
    user.email,
    user.role,
    user.status,
    user.isLocked ? 'Yes' : 'No',
    user.phone || '',
    user.department || '',
    user.studentId || '',
    user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '',
      new Date(user.createdAt).toLocaleString()
    ];
    csv += row.join(',') + '\n';
  });

  // Add recent activities
  const activities = await getRecentUserActivities(50);
  csv += '\n\nRECENT USER ACTIVITIES\n';
  csv += 'Timestamp,User,Role,Action,Description\n';
  activities.items.forEach(activity => {
    const row = [
      new Date(activity.createdAt).toLocaleString(),
      activity.userId ? `${activity.userId.fullName} (${activity.userId.username})` : 'Unknown',
      activity.role,
      activity.actionType,
      `\"${activity.description || ''}\"`
    ];
    csv += row.join(',') + '\n';
  });

  // Add summary at the end
  csv += '\n\nSUMMARY\n';
  csv += `Total Users,${totalUsers}\n`;
  usersByRole.forEach(role => {
    csv += `${role._id},${role.count}\n`;
  });

  return { csv };
}

async function generateClassReport() {
  const totalClasses = await ClassModel.countDocuments();
  const allClasses = await ClassModel.find({}).sort({ createdAt: -1 }).lean();

  let csv = 'Class Name,Code,Department,Credits,Teacher ID,Created At\n';

  for (const cls of allClasses) {
    const teacher = await UserModel.findById(cls.teacherId, 'username fullName').lean();
    const row = [
      `"${cls.name}"`,
      cls.code,
      cls.department || '',
      cls.credits || 0,
      teacher ? teacher.fullName : 'Unknown',
      new Date(cls.createdAt).toLocaleString()
    ];
    csv += row.join(',') + '\n';
  }

  csv += `\nTotal Classes,${totalClasses}\n`;

  return { csv };
}

async function generateAssignmentReport() {
  const assignments = await AssignmentModel.find({}).sort({ createdAt: -1 }).lean();
  const submissions = await SubmissionModel.find({}).lean();

  // Create submission map
  const submissionMap = {};
  submissions.forEach(sub => {
    const key = sub.assignmentId.toString();
    if (!submissionMap[key]) submissionMap[key] = [];
    submissionMap[key].push(sub);
  });

  let csv = 'Title,Description,Class ID,Due Date,Is Exam,Duration,Submitted Count,Graded Count,Created At\n';

  for (const assignment of assignments) {
    const subs = submissionMap[assignment._id.toString()] || [];
    const submittedCount = subs.filter(s => s.submittedAt).length;
    const gradedCount = subs.filter(s => s.score != null).length;

    const row = [
      `"${assignment.title}"`,
      `"${assignment.description || ''}"`,
      assignment.classId,
      new Date(assignment.dueDate).toLocaleString(),
      assignment.isExam ? 'Yes' : 'No',
      assignment.durationMinutes || '',
      submittedCount,
      gradedCount,
      new Date(assignment.createdAt).toLocaleString()
    ];
    csv += row.join(',') + '\n';
  }

  csv += `\nTotal Assignments,${assignments.length}\n`;

  return { csv };
}

// ---- Activity Logs ----
adminRouter.get('/activities', async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const activities = await getRecentUserActivities(50, parseInt(page), parseInt(pageSize));
  res.json(activities.items); // Return array for frontend compatibility
});

// ---- System Logs ----
adminRouter.get('/system-logs', async (req, res) => {
const { level, limit = 100 } = req.query;
const logs = await getSystemLogs(level, parseInt(limit));
res.json(logs);
});

// ---- Send Notifications ----
adminRouter.post('/send-notification', async (req, res) => {
  const { recipientId, title, content, type = 'general' } = req.body || {};

  if (!recipientId || !title || !content) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  // Validate recipient exists
  const recipient = await UserModel.findById(recipientId).lean();
  if (!recipient) {
    return res.status(404).json({ error: 'RECIPIENT_NOT_FOUND' });
  }

  try {
    const { NotificationModel } = await import('../../models/Notification.js');

    await NotificationModel.create({
      recipientId,
      senderId: req.user?.id,
      classId: null, // Admin notifications are system-wide, not tied to a class
      type: 'admin_notification',
      title,
      content,
      metadata: { notificationType: type },
      isRead: false
    });

    // Log admin notification activity
    try {
      await logUserActivity(
        req.user?.id,
        'admin',
        'send_notification',
        null,
        'notification',
        `Sent notification to ${recipient.fullName}: ${title}`,
        { recipientId, recipientName: recipient.fullName, title },
        req
      );
    } catch (logError) {
      console.warn('Failed to log notification activity:', logError);
      // Don't fail the request if logging fails
    }

    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});


