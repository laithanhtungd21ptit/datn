import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMongo } from '../db/mongo.js';
import { AnnouncementModel } from '../models/Announcement.js';
import { AssignmentModel } from '../models/Assignment.js';
import { ClassModel } from '../models/Class.js';
import { DocumentModel } from '../models/Document.js';
import { CommentModel } from '../models/Comment.js';
import { UserModel } from '../models/User.js';
import { EnrollmentModel } from '../models/Enrollment.js';
import { SubmissionModel } from '../models/Submission.js';
import { NotificationModel } from '../models/Notification.js';
import { ExamSessionModel } from '../models/ExamSession.js';
import { ingestItems } from '../services/rag/ingestHelpers.js';
import { getCacheStats } from '../services/rag/embeddingCache.js';

function chunkText(text, chunkSize = 1000, overlap = 150) {
  if (!text || !text.trim()) return [];
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const slice = words.slice(i, i + chunkSize).join(' ');
    if (slice.trim()) chunks.push(slice.trim());
    if (i + chunkSize >= words.length) break;
  }
  return chunks.length > 0 ? chunks : [text.trim()];
}

function formatDate(date) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleString('vi-VN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return String(date);
  }
}

async function ingestAnnouncements(options = {}) {
  const items = await AnnouncementModel.find({}).populate('classId', 'name code').lean();
  
  const chunkTextFn = (item) => {
    const parts = [
      `Thông báo: ${item.title}`,
      item.classId ? `Lớp: ${item.classId.name || ''} (Mã: ${item.classId.code || ''})` : '',
      `Loại: ${item.type || 'general'}`,
      item.content ? `Nội dung: ${item.content}` : '',
      `Ngày tạo: ${formatDate(item.createdAt)}`,
    ].filter(Boolean);
    return chunkText(parts.join('\n\n'));
  };
  
  const buildChunkDataFn = (item, text, idx) => ({
    sourceId: item._id,
    chunkIndex: idx,
    text,
    title: item.title,
    classId: item.classId?._id || item.classId,
    rolesAllowed: ['student', 'teacher', 'admin'],
    metadata: { 
      type: item.type,
      className: item.classId?.name,
      classCode: item.classId?.code,
    },
  });
  
  return await ingestItems(items, 'announcement', chunkTextFn, buildChunkDataFn, options);
}

async function ingestAssignments(options = {}) {
  const items = await AssignmentModel.find({}).populate('classId', 'name code').lean();
  
  const chunkTextFn = (item) => {
    const parts = [
      `Bài tập: ${item.title}`,
      item.classId ? `Lớp: ${item.classId.name || ''} (Mã: ${item.classId.code || ''})` : '',
      item.description ? `Mô tả: ${item.description}` : '',
      `Hạn nộp: ${formatDate(item.dueDate)}`,
      item.isExam ? `Đây là kỳ thi` : 'Đây là bài tập thường',
      item.isExam && item.durationMinutes ? `Thời gian làm bài: ${item.durationMinutes} phút` : '',
      item.isExam && item.startTime ? `Thời gian bắt đầu: ${formatDate(item.startTime)}` : '',
      item.isExam && item.endTime ? `Thời gian kết thúc: ${formatDate(item.endTime)}` : '',
      item.requireMonitoring ? 'Yêu cầu giám sát: Có' : 'Yêu cầu giám sát: Không',
      item.attachments?.length ? `Tệp đính kèm: ${item.attachments.join(', ')}` : '',
      `Ngày tạo: ${formatDate(item.createdAt)}`,
    ].filter(Boolean);
    return chunkText(parts.join('\n'));
  };
  
  const buildChunkDataFn = (item, text, idx) => ({
    sourceId: item._id,
    chunkIndex: idx,
    text,
    title: item.title,
    classId: item.classId?._id || item.classId,
    rolesAllowed: ['student', 'teacher', 'admin'],
    metadata: { 
      dueDate: item.dueDate, 
      isExam: item.isExam,
      durationMinutes: item.durationMinutes,
      startTime: item.startTime,
      endTime: item.endTime,
      requireMonitoring: item.requireMonitoring,
      attachments: item.attachments,
      classCode: item.classId?.code,
      className: item.classId?.name,
    },
  });
  
  return await ingestItems(items, 'assignment', chunkTextFn, buildChunkDataFn, options);
}

async function ingestClasses(options = {}) {
  const items = await ClassModel.find({}).populate('teacherId', 'fullName teacherId username').lean();
  
  const chunkTextFn = (item) => {
    const parts = [
      `Lớp học: ${item.name}`,
      `Mã lớp: ${item.code || ''}`,
      item.description ? `Mô tả: ${item.description}` : '',
      item.department ? `Khoa: ${item.department}` : '',
      `Số tín chỉ: ${item.credits || 3}`,
      item.teacherId ? `Giảng viên: ${item.teacherId.fullName || ''}${item.teacherId.teacherId ? ` (Mã: ${item.teacherId.teacherId})` : ''}${item.teacherId.username ? ` - Tên đăng nhập: ${item.teacherId.username}` : ''}` : '',
      `Ngày tạo: ${formatDate(item.createdAt)}`,
    ].filter(Boolean);
    return chunkText(parts.join('\n'));
  };
  
  const buildChunkDataFn = (item, text, idx) => ({
    sourceId: item._id,
    chunkIndex: idx,
    text,
    title: item.name,
    classId: item._id,
    rolesAllowed: ['student', 'teacher', 'admin'],
    metadata: { 
      code: item.code,
      department: item.department,
      credits: item.credits,
      teacherId: item.teacherId?._id,
      teacherName: item.teacherId?.fullName,
      teacherCode: item.teacherId?.teacherId,
    },
  });
  
  return await ingestItems(items, 'class', chunkTextFn, buildChunkDataFn, options);
}

async function ingestDocuments(options = {}) {
  const items = await DocumentModel.find({}).populate('classId', 'name code').populate('teacherId', 'fullName').lean();
  
  const chunkTextFn = (item) => {
    const parts = [
      `Tài liệu: ${item.title}`,
      item.classId ? `Lớp: ${item.classId.name || ''} (Mã: ${item.classId.code || ''})` : '',
      item.teacherId ? `Giảng viên: ${item.teacherId.fullName || ''}` : '',
      item.description ? `Mô tả: ${item.description}` : '',
      item.fileName ? `Tên file: ${item.fileName}` : '',
      item.fileType ? `Loại file: ${item.fileType}` : '',
      item.fileSize ? `Kích thước: ${(item.fileSize / 1024).toFixed(2)} KB` : '',
      item.fileUrl ? `Link: ${item.fileUrl}` : '',
      `Ngày tạo: ${formatDate(item.createdAt)}`,
    ].filter(Boolean);
    return chunkText(parts.join('\n'));
  };
  
  const buildChunkDataFn = (item, text, idx) => ({
    sourceId: item._id,
    chunkIndex: idx,
    text,
    title: item.title,
    classId: item.classId?._id || item.classId,
    rolesAllowed: ['student', 'teacher', 'admin'],
    metadata: { 
      fileName: item.fileName, 
      fileType: item.fileType,
      fileSize: item.fileSize,
      fileUrl: item.fileUrl,
      className: item.classId?.name,
      classCode: item.classId?.code,
      teacherName: item.teacherId?.fullName,
    },
  });
  
  return await ingestItems(items, 'document', chunkTextFn, buildChunkDataFn, options);
}

async function ingestComments(options = {}) {
  const items = await CommentModel.find({}).populate('userId', 'fullName username role').populate('classId', 'name code').lean();
  const filteredItems = items.filter(item => item.content && item.content.trim());
  
  const chunkTextFn = (item) => {
    const parts = [
      `Bình luận từ ${item.userId?.fullName || 'Người dùng'}`,
      item.userId?.role ? `Vai trò: ${item.userId.role}` : '',
      item.classId ? `Lớp: ${item.classId.name || ''} (Mã: ${item.classId.code || ''})` : '',
      `Nội dung: ${item.content}`,
      `Ngày đăng: ${formatDate(item.createdAt)}`,
    ].filter(Boolean);
    return chunkText(parts.join('\n'));
  };
  
  const buildChunkDataFn = (item, text, idx) => ({
    sourceId: item._id,
    chunkIndex: idx,
    text,
    title: `Bình luận từ ${item.userId?.fullName || 'Người dùng'}`,
    classId: item.classId?._id || item.classId,
    rolesAllowed: ['student', 'teacher', 'admin'],
    metadata: { 
      authorId: item.userId?._id,
      authorName: item.userId?.fullName,
      authorRole: item.userId?.role,
      className: item.classId?.name,
      classCode: item.classId?.code,
    },
  });
  
  return await ingestItems(filteredItems, 'comment', chunkTextFn, buildChunkDataFn, options);
}

async function ingestUsers(options = {}) {
  const items = await UserModel.find({}).lean();
  
  const chunkTextFn = (item) => {
    const base = `Người dùng: ${item.fullName}\nTên đăng nhập: ${item.username}\nEmail: ${item.email}\nVai trò: ${item.role}\n${item.studentId ? `Mã sinh viên: ${item.studentId}` : ''}${item.teacherId ? `Mã giảng viên: ${item.teacherId}` : ''}\nKhoa: ${item.department || ''}`;
    return chunkText(base, 500, 50);
  };
  
  const buildChunkDataFn = (item, text, idx) => ({
    sourceId: item._id,
    chunkIndex: idx,
    text,
    title: item.fullName,
    classId: null,
    rolesAllowed: ['admin', 'teacher'],
    metadata: { username: item.username, role: item.role, studentId: item.studentId, teacherId: item.teacherId },
  });
  
  return await ingestItems(items, 'user', chunkTextFn, buildChunkDataFn, options);
}

async function ingestEnrollments(options = {}) {
  const items = await EnrollmentModel.find({}).populate('studentId', 'fullName studentId').populate('classId', 'name code').lean();
  const filteredItems = items.filter(item => item.studentId && item.classId);
  
  const chunkTextFn = (item) => {
    const base = `Sinh viên ${item.studentId.fullName || ''} (${item.studentId.studentId || ''}) đã đăng ký lớp ${item.classId.name || ''} (${item.classId.code || ''}). Trạng thái: ${item.status}`;
    return chunkText(base, 300, 50);
  };
  
  const buildChunkDataFn = (item, text, idx) => ({
    sourceId: item._id,
    chunkIndex: idx,
    text,
    title: `Đăng ký lớp ${item.classId.name || ''}`,
    classId: item.classId._id,
    rolesAllowed: ['admin', 'teacher'],
    metadata: { studentId: item.studentId._id, status: item.status },
  });
  
  return await ingestItems(filteredItems, 'enrollment', chunkTextFn, buildChunkDataFn, options);
}

async function ingestSubmissions(options = {}) {
  const items = await SubmissionModel.find({})
    .populate('assignmentId', 'title classId')
    .populate('studentId', 'fullName studentId')
    .lean();
  const filteredItems = items.filter(item => item.assignmentId && item.studentId);
  
  const chunkTextFn = (item) => {
    const parts = [
      `Bài nộp của sinh viên: ${item.studentId.fullName || ''}`,
      item.studentId.studentId ? `Mã sinh viên: ${item.studentId.studentId}` : '',
      `Bài tập: ${item.assignmentId.title || ''}`,
      item.assignmentId.classId ? `Lớp học ID: ${item.assignmentId.classId}` : '',
      item.submittedAt ? `Thời gian nộp: ${formatDate(item.submittedAt)}` : 'Trạng thái: Chưa nộp',
      item.score !== null ? `Điểm số: ${item.score}` : 'Điểm số: Chưa chấm',
      item.notes ? `Ghi chú của giảng viên: ${item.notes}` : '',
      item.contentUrl ? `Link bài nộp: ${item.contentUrl}` : '',
      `Ngày tạo: ${formatDate(item.createdAt)}`,
    ].filter(Boolean);
    return chunkText(parts.join('\n'));
  };
  
  const buildChunkDataFn = (item, text, idx) => ({
    sourceId: item._id,
    chunkIndex: idx,
    text,
    title: `Bài nộp: ${item.assignmentId.title || ''}`,
    classId: item.assignmentId.classId || null,
    rolesAllowed: ['admin', 'teacher', 'student'],
    metadata: { 
      assignmentId: item.assignmentId._id, 
      assignmentTitle: item.assignmentId.title,
      studentId: item.studentId._id,
      studentName: item.studentId.fullName,
      studentCode: item.studentId.studentId,
      score: item.score, 
      submittedAt: item.submittedAt,
      notes: item.notes,
      contentUrl: item.contentUrl,
    },
  });
  
  return await ingestItems(filteredItems, 'submission', chunkTextFn, buildChunkDataFn, options);
}

async function ingestNotifications(options = {}) {
  const items = await NotificationModel.find({})
    .populate('classId', 'name code')
    .populate('senderId', 'fullName role')
    .populate('recipientId', 'fullName studentId')
    .lean();
  
  const chunkTextFn = (item) => {
    const parts = [
      `Thông báo hệ thống: ${item.title}`,
      item.classId ? `Lớp: ${item.classId.name || ''} (Mã: ${item.classId.code || ''})` : '',
      item.senderId ? `Người gửi: ${item.senderId.fullName || ''}${item.senderId.role ? ` (${item.senderId.role})` : ''}` : '',
      item.recipientId ? `Người nhận: ${item.recipientId.fullName || ''}${item.recipientId.studentId ? ` (${item.recipientId.studentId})` : ''}` : '',
      `Loại: ${item.type || 'general'}`,
      item.content ? `Nội dung: ${item.content}` : '',
      `Trạng thái: ${item.isRead ? 'Đã đọc' : 'Chưa đọc'}`,
      `Ngày tạo: ${formatDate(item.createdAt)}`,
    ].filter(Boolean);
    return chunkText(parts.join('\n'));
  };
  
  const buildChunkDataFn = (item, text, idx) => ({
    sourceId: item._id,
    chunkIndex: idx,
    text,
    title: item.title,
    classId: item.classId?._id || null,
    rolesAllowed: ['student', 'teacher', 'admin'],
    metadata: { 
      type: item.type, 
      isRead: item.isRead,
      senderName: item.senderId?.fullName,
      senderRole: item.senderId?.role,
      recipientName: item.recipientId?.fullName,
      recipientCode: item.recipientId?.studentId,
      className: item.classId?.name,
      classCode: item.classId?.code,
    },
  });
  
  return await ingestItems(items, 'notification', chunkTextFn, buildChunkDataFn, options);
}

async function ingestExamSessions(options = {}) {
  const items = await ExamSessionModel.find({}).populate('assignmentId', 'title').populate('studentId', 'fullName studentId').lean();
  const filteredItems = items.filter(item => item.assignmentId && item.studentId);
  
  const chunkTextFn = (item) => {
    const base = `Phiên thi của sinh viên ${item.studentId.fullName || ''} (${item.studentId.studentId || ''}) cho bài thi "${item.assignmentId.title || ''}". Trạng thái: ${item.status}${item.startedAt ? ` Bắt đầu: ${formatDate(item.startedAt)}` : ''}${item.endedAt ? ` Kết thúc: ${formatDate(item.endedAt)}` : ''}${item.totalViolations > 0 ? ` Số vi phạm: ${item.totalViolations}` : ''}`;
    return chunkText(base, 400, 50);
  };
  
  const buildChunkDataFn = (item, text, idx) => ({
    sourceId: item._id,
    chunkIndex: idx,
    text,
    title: `Phiên thi: ${item.assignmentId.title || ''}`,
    classId: null,
    rolesAllowed: ['admin', 'teacher'],
    metadata: { 
      assignmentId: item.assignmentId._id, 
      assignmentTitle: item.assignmentId.title,
      studentId: item.studentId._id,
      studentName: item.studentId.fullName,
      studentCode: item.studentId.studentId,
      status: item.status, 
      totalViolations: item.totalViolations,
      startedAt: item.startedAt,
      endedAt: item.endedAt,
    },
  });
  
  return await ingestItems(filteredItems, 'exam_session', chunkTextFn, buildChunkDataFn, options);
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const fullReingest = args.includes('--full') || args.includes('-f');
  const incremental = !fullReingest;
  const concurrency = parseInt(args.find(arg => arg.startsWith('--concurrency='))?.split('=')[1]) || 5;
  
  await connectMongo();
  await mongoose.connection.asPromise();
  
  console.log('Starting RAG ingest for all collections...');
  console.log(`Mode: ${incremental ? 'Incremental' : 'Full re-ingest'}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log('');
  
  const options = {
    incremental,
    concurrency,
    deleteOld: fullReingest,
  };
  
  const startTime = Date.now();
  const stats = {
    announcements: await ingestAnnouncements(options),
    assignments: await ingestAssignments(options),
    classes: await ingestClasses(options),
    documents: await ingestDocuments(options),
    comments: await ingestComments(options),
    users: await ingestUsers(options),
    enrollments: await ingestEnrollments(options),
    submissions: await ingestSubmissions(options),
    notifications: await ingestNotifications(options),
    examSessions: await ingestExamSessions(options),
  };
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Summary
  console.log('\n=== INGEST SUMMARY ===');
  let totalProcessed = 0, totalIngested = 0, totalSkipped = 0, totalErrors = 0;
  
  for (const [docType, stat] of Object.entries(stats)) {
    totalProcessed += stat.processed || 0;
    totalIngested += stat.ingested || 0;
    totalSkipped += stat.skipped || 0;
    totalErrors += stat.errors || 0;
    console.log(
      `${docType}: processed=${stat.processed || 0}, ` +
      `ingested=${stat.ingested || 0}, skipped=${stat.skipped || 0}, errors=${stat.errors || 0}`
    );
  }
  
  console.log(`\nTotal: processed=${totalProcessed}, ingested=${totalIngested}, skipped=${totalSkipped}, errors=${totalErrors}`);
  console.log(`Duration: ${duration}s`);
  
  const cacheStats = getCacheStats();
  console.log(`Cache: ${cacheStats.size}/${cacheStats.maxSize} embeddings cached`);
  
  console.log('\n✅ RAG ingest completed for all collections');
  process.exit(0);
}

main().catch((err) => {
  console.error('RAG ingest failed', err);
  process.exit(1);
});


