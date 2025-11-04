import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../../models/User.js';
import { authRequired } from '../../middleware/auth.js';
import { ClassModel } from '../../models/Class.js';
import { AssignmentModel } from '../../models/Assignment.js';
import { EnrollmentModel } from '../../models/Enrollment.js';
import { SubmissionModel } from '../../models/Submission.js';

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
    phone: u.phone || '',
    department: u.department || '',
    createdAt: u.createdAt,
    lastLogin: u.lastLoginAt || null,
  };
}

// ---- Class CRUD ----
adminRouter.get('/classes', async (_req, res) => {
  const items = await ClassModel.find({}).sort({ createdAt: -1 }).lean();
  res.json(items.map(c => ({ id: String(c._id), name: c.name, code: c.code, department: c.department, teacherId: String(c.teacherId) })));
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


