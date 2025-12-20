import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectMongo } from '../db/mongo.js';
import { UserModel } from '../models/User.js';
import { ClassModel } from '../models/Class.js';
import { AssignmentModel } from '../models/Assignment.js';
import { EnrollmentModel } from '../models/Enrollment.js';
import { DocumentModel } from '../models/Document.js';
import { AnnouncementModel } from '../models/Announcement.js';

async function run() {
  await connectMongo();

  const users = [
    { username: 'admin', fullName: 'Admin', email: 'admin@example.com', role: 'admin', password: '123456', phone: '0123456789' },
    { username: 'teacher', fullName: 'Nguyễn Văn A', email: 'teacher@example.com', role: 'teacher', password: '123456', phone: '0123456780' },
    { username: 'teacher2', fullName: 'Trần Thị B', email: 'teacher2@example.com', role: 'teacher', password: '123456', phone: '0123456781' },
    { username: 'teacher3', fullName: 'Lê Văn C', email: 'teacher3@example.com', role: 'teacher', password: '123456', phone: '0123456782' },
    { username: 'teacher4', fullName: 'Phạm Thị D', email: 'teacher4@example.com', role: 'teacher', password: '123456', phone: '0123456783' },
    { username: 'teacher5', fullName: 'Hoàng Minh E', email: 'teacher5@example.com', role: 'teacher', password: '123456', phone: '0123456784' },
    { username: 'teacher6', fullName: 'Đỗ Thị F', email: 'teacher6@example.com', role: 'teacher', password: '123456', phone: '0123456785' },
    { username: 'teacher7', fullName: 'Bùi Văn G', email: 'teacher7@example.com', role: 'teacher', password: '123456', phone: '0123456786' },
    { username: 'student', fullName: 'Sinh Vien A', email: 'student@example.com', role: 'student', password: '123456', phone: '0123456784' },
    { username: 'student2', fullName: 'Sinh Vien B', email: 'student2@example.com', role: 'student', password: '123456', phone: '0123456785' },
    { username: 'student3', fullName: 'Sinh Vien C', email: 'student3@example.com', role: 'student', password: '123456', phone: '0123456786' },
    { username: 'student4', fullName: 'Sinh Vien D', email: 'student4@example.com', role: 'student', password: '123456', phone: '0123456787' },
    { username: 'student5', fullName: 'Sinh Vien E', email: 'student5@example.com', role: 'student', password: '123456', phone: '0123456788' },
    { username: 'student6', fullName: 'Sinh Vien F', email: 'student6@example.com', role: 'student', password: '123456', phone: '0123456789' },
    { username: 'student7', fullName: 'Sinh Vien G', email: 'student7@example.com', role: 'student', password: '123456', phone: '0123456790' },
    { username: 'student8', fullName: 'Sinh Vien H', email: 'student8@example.com', role: 'student', password: '123456', phone: '0123456791' },
  ];

  // Generate student IDs for students and teacher IDs for teachers
  let studentCounter = 1;
  let teacherCounter = 1;
  const studentUsers = users.filter(u => u.role === 'student');
  const teacherUsers = users.filter(u => u.role === 'teacher');

  for (const u of users) {
    const exists = await UserModel.findOne({ username: u.username }).lean();
    if (!exists) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      const studentId = u.role === 'student' ? `B21DCPT${String(studentCounter++).padStart(3, '0')}` : '';
      const teacherId = u.role === 'teacher' ? `GVPTIT${String(teacherCounter++).padStart(3, '0')}` : '';

      await UserModel.create({
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        passwordHash,
        phone: u.phone,
        studentId,
        teacherId,
      });
      // eslint-disable-next-line no-console
      console.log('Seeded user:', u.username, u.role === 'student' ? `(Student ID: ${studentId})` : u.role === 'teacher' ? `(Teacher ID: ${teacherId})` : '');
    } else {
      // Update existing users without IDs
      const updateData = {};
      if (u.role === 'student' && !exists.studentId) {
        updateData.studentId = `B21DCPT${String(studentCounter++).padStart(3, '0')}`;
      }
      if (u.role === 'teacher' && !exists.teacherId) {
        updateData.teacherId = `GVPTIT${String(teacherCounter++).padStart(3, '0')}`;
      }
      if (Object.keys(updateData).length > 0) {
        await UserModel.findByIdAndUpdate(exists._id, updateData);
        console.log('Updated user:', u.username, updateData.studentId ? `(Student ID: ${updateData.studentId})` : updateData.teacherId ? `(Teacher ID: ${updateData.teacherId})` : '');
      }
    }
  }

  // Load created users
  const admin = await UserModel.findOne({ username: 'admin' }).lean();
  const teacher = await UserModel.findOne({ username: 'teacher' }).lean();
  const teacher2 = await UserModel.findOne({ username: 'teacher2' }).lean();
  const teacher3 = await UserModel.findOne({ username: 'teacher3' }).lean();
  const teacher4 = await UserModel.findOne({ username: 'teacher4' }).lean();
  const teacher5 = await UserModel.findOne({ username: 'teacher5' }).lean();
  const teacher6 = await UserModel.findOne({ username: 'teacher6' }).lean();
  const teacher7 = await UserModel.findOne({ username: 'teacher7' }).lean();
  const students = await UserModel.find({ role: 'student' }).lean();
  const [student, student2, student3, student4, student5, student6, student7, student8] = students;

  // Create classes for teachers
  const classesPayload = [
    { name: 'Lập trình Web', code: 'WEB101', department: 'CNTT', credits: 3, teacher: teacher },
    { name: 'Cơ sở dữ liệu', code: 'DB201', department: 'CNTT', credits: 3, teacher: teacher },
    { name: 'Lập trình Java', code: 'JAVA201', department: 'CNTT', credits: 4, teacher: teacher },
    { name: 'Thuật toán', code: 'ALG301', department: 'CNTT', credits: 3, teacher: teacher2 },
    { name: 'Cấu trúc dữ liệu', code: 'DS401', department: 'CNTT', credits: 4, teacher: teacher2 },
    { name: 'Thuật toán nâng cao', code: 'ADV501', department: 'CNTT', credits: 3, teacher: teacher2 },
    { name: 'Hệ điều hành', code: 'OS501', department: 'CNTT', credits: 3, teacher: teacher3 },
    { name: 'Hệ thống nhúng', code: 'EMB601', department: 'CNTT', credits: 3, teacher: teacher3 },
    { name: 'Mạng máy tính', code: 'NET601', department: 'CNTT', credits: 4, teacher: teacher4 },
    { name: 'An toàn mạng', code: 'SEC701', department: 'CNTT', credits: 3, teacher: teacher4 },
    { name: 'Trí tuệ nhân tạo', code: 'AI501', department: 'CNTT', credits: 3, teacher: teacher5 },
    { name: 'Học máy', code: 'ML601', department: 'CNTT', credits: 4, teacher: teacher5 },
    { name: 'Công nghệ phần mềm', code: 'SE401', department: 'CNTT', credits: 3, teacher: teacher6 },
    { name: 'Thiết kế hệ thống', code: 'SD501', department: 'CNTT', credits: 4, teacher: teacher6 },
    { name: 'Đồ họa máy tính', code: 'CG401', department: 'CNTT', credits: 3, teacher: teacher7 },
    { name: 'Thị giác máy tính', code: 'CV501', department: 'CNTT', credits: 3, teacher: teacher7 },
  ];

  const classIds = [];
  for (const c of classesPayload) {
    let cls = await ClassModel.findOne({ code: c.code }).lean();
    if (!cls) {
      const teacherId = c.teacher?._id || teacher._id;
      cls = await ClassModel.create({
        name: c.name,
        code: c.code,
        department: c.department,
        credits: c.credits || 3,
        teacherId
      });
      // eslint-disable-next-line no-console
      console.log('Seeded class:', c.code);
    }
    classIds.push(cls._id);
  }

  // Enroll students to classes for demo purposes
  const demoEnrollments = [
    { classCode: 'WEB101', studentUsername: 'student' },
    { classCode: 'WEB101', studentUsername: 'student2' },
    { classCode: 'WEB101', studentUsername: 'student3' },
    { classCode: 'DB201', studentUsername: 'student' },
    { classCode: 'DB201', studentUsername: 'student4' },
    { classCode: 'JAVA201', studentUsername: 'student' },
    { classCode: 'JAVA201', studentUsername: 'student5' },
    { classCode: 'ALG301', studentUsername: 'student3' },
    { classCode: 'ALG301', studentUsername: 'student6' },
    { classCode: 'DS401', studentUsername: 'student' },
    { classCode: 'DS401', studentUsername: 'student2' },
  ];

  for (const enroll of demoEnrollments) {
    const cls = await ClassModel.findOne({ code: enroll.classCode }).lean();
    const st = await UserModel.findOne({ username: enroll.studentUsername }).lean();
    if (cls && st) {
      const exists = await EnrollmentModel.findOne({ classId: cls._id, studentId: st._id });
      if (!exists) {
        await EnrollmentModel.create({ classId: cls._id, studentId: st._id, status: 'enrolled' });
      }
    }
  }

  // Create assignments for classes
  const now = new Date();
  const addDays = (d) => new Date(now.getTime() + d * 24 * 3600 * 1000);
  const assignments = [
    { classCode: 'WEB101', title: 'BTVN tuần 1: HTML/CSS', description: 'Hoàn thành các bài tập về HTML cơ bản và CSS styling. Nộp file HTML/CSS.', dueDate: addDays(7), isExam: false },
    { classCode: 'WEB101', title: 'BTVN tuần 2: JavaScript', description: 'Viết các function JavaScript cơ bản và xử lý DOM events.', dueDate: addDays(14), isExam: false },
    { classCode: 'WEB101', title: 'Giữa kỳ Web', description: 'Bài thi giữa kỳ môn Lập trình Web. Bao gồm HTML, CSS, JavaScript.', dueDate: addDays(21), isExam: true, durationMinutes: 90 },
    { classCode: 'JAVA201', title: 'BTVN OOP Java', description: 'Implement các khái niệm OOP: encapsulation, inheritance, polymorphism.', dueDate: addDays(13), isExam: false },
    { classCode: 'DB201', title: 'BTVN SQL', description: 'Viết các câu truy vấn SQL cho các tình huống thực tế.', dueDate: addDays(10), isExam: false },
    { classCode: 'DB201', title: 'Thiết kế ERD', description: 'Thiết kế sơ đồ ERD cho hệ thống quản lý sinh viên.', dueDate: addDays(17), isExam: false },
    { classCode: 'ALG301', title: 'BTVN Thuật toán sắp xếp', description: 'Implement và phân tích độ phức tạp các thuật toán sắp xếp.', dueDate: addDays(12), isExam: false },
    { classCode: 'ALG301', title: 'BTVN Thuật toán tìm kiếm', description: 'Implement binary search và các thuật toán tìm kiếm khác.', dueDate: addDays(19), isExam: false },
    { classCode: 'ADV501', title: 'BTVN Dynamic Programming', description: 'Giải các bài toán sử dụng kỹ thuật quy hoạch động.', dueDate: addDays(16), isExam: false },
    { classCode: 'DS401', title: 'BTVN Stack và Queue', description: 'Implement stack và queue sử dụng array và linked list.', dueDate: addDays(8), isExam: false },
    { classCode: 'DS401', title: 'BTVN Tree và Graph', description: 'Implement cây nhị phân và các thuật toán duyệt graph.', dueDate: addDays(15), isExam: false },
    { classCode: 'OS501', title: 'BTVN Process Management', description: 'Mô tả vòng đời process và các thuật toán scheduling.', dueDate: addDays(9), isExam: false },
    { classCode: 'EMB601', title: 'BTVN Embedded Systems', description: 'Thiết kế và lập trình cho hệ thống nhúng sử dụng Arduino.', dueDate: addDays(20), isExam: false },
    { classCode: 'NET601', title: 'BTVN TCP/IP', description: 'Giải thích các tầng trong mô hình TCP/IP và chức năng của từng tầng.', dueDate: addDays(11), isExam: false },
    { classCode: 'SEC701', title: 'BTVN Network Security', description: 'Phân tích các lỗ hổng bảo mật mạng và phương pháp phòng chống.', dueDate: addDays(18), isExam: false },
    { classCode: 'AI501', title: 'BTVN Machine Learning Basics', description: 'Implement thuật toán linear regression và logistic regression.', dueDate: addDays(14), isExam: false },
    { classCode: 'ML601', title: 'BTVN Neural Networks', description: 'Xây dựng và huấn luyện mạng neural cơ bản sử dụng TensorFlow.', dueDate: addDays(22), isExam: false },
    { classCode: 'SE401', title: 'BTVN Software Engineering', description: 'Áp dụng quy trình phát triển phần mềm cho một dự án nhỏ.', dueDate: addDays(12), isExam: false },
    { classCode: 'CG401', title: 'BTVN Computer Graphics', description: 'Implement các thuật toán vẽ đường thẳng và tô màu.', dueDate: addDays(15), isExam: false },
    { classCode: 'CV501', title: 'BTVN Computer Vision', description: 'Xử lý ảnh cơ bản: filtering, edge detection, feature extraction.', dueDate: addDays(19), isExam: false },
  ];
  for (const a of assignments) {
    const cls = await ClassModel.findOne({ code: a.classCode }).lean();
    if (!cls) continue;
    const exists = await AssignmentModel.findOne({ classId: cls._id, title: a.title });
    if (!exists) {
      await AssignmentModel.create({ classId: cls._id, title: a.title, description: a.description, dueDate: a.dueDate, isExam: !!a.isExam, durationMinutes: a.durationMinutes || null });
      // eslint-disable-next-line no-console
      console.log('Seeded assignment:', a.title);
    }
  }

  // Create sample announcements for classes
  const AnnouncementModel = (await import('../models/Announcement.js')).AnnouncementModel;

  const announcements = [
    { classCode: 'WEB101', title: 'Thông báo lịch học tuần tới', content: 'Lịch học tuần tới sẽ có thay đổi. Buổi học thứ 3 sẽ được chuyển từ 14:00 thành 16:00. Vui lòng cập nhật lịch cá nhân.', type: 'general' },
    { classCode: 'WEB101', title: 'Bài tập tuần 1 đã được đăng', content: 'Bài tập HTML/CSS cơ bản đã được đăng lên hệ thống. Deadline: 23:59 ngày mai.', type: 'assignment' },
    { classCode: 'DB201', title: 'Điểm bài tập SQL đã được cập nhật', content: 'Điểm số bài tập SQL đã được cập nhật. Các bạn có thể xem chi tiết trong mục Bài tập.', type: 'general' },
    { classCode: 'JAVA201', title: 'Lịch thi giữa kỳ', content: 'Thi giữa kỳ môn Lập trình Java sẽ diễn ra vào ngày 20/01/2024 tại phòng A101.', type: 'exam' },
    { classCode: 'ALG301', title: 'Tài liệu tham khảo bổ sung', content: 'Đã upload tài liệu tham khảo về thuật toán sắp xếp. Các bạn tải về để ôn tập.', type: 'general' },
  ];

  for (const ann of announcements) {
    const cls = await ClassModel.findOne({ code: ann.classCode }).lean();
    if (cls) {
      const exists = await AnnouncementModel.findOne({ classId: cls._id, title: ann.title });
      if (!exists) {
        await AnnouncementModel.create({
          classId: cls._id,
          teacherId: cls.teacherId, // Use the class's teacherId
          title: ann.title,
          content: ann.content,
          type: ann.type
        });
        // eslint-disable-next-line no-console
        console.log('Seeded announcement:', ann.title);
      }
    }
  }

  // Create sample submissions only for enrolled students
  const SubmissionModel = (await import('../models/Submission.js')).SubmissionModel;

  // Get all enrollments
  const enrollments = await EnrollmentModel.find({ status: 'enrolled' }).lean();
  const enrollmentMap = new Map();
  enrollments.forEach(e => {
    if (!enrollmentMap.has(e.classId.toString())) {
      enrollmentMap.set(e.classId.toString(), []);
    }
    enrollmentMap.get(e.classId.toString()).push(e.studentId);
  });

  // Create submissions for enrolled students only
  const allAssignments = await AssignmentModel.find({}).lean();
  for (const asg of allAssignments) {
    const enrolledStudents = enrollmentMap.get(asg.classId.toString()) || [];
    for (const studentId of enrolledStudents) {
      const already = await SubmissionModel.findOne({ assignmentId: asg._id, studentId });
      if (!already) {
        // Seed khoảng 70% submissions cho homework, 50% cho exams
        const submitRate = asg.isExam ? 0.5 : 0.7;
        if (Math.random() < submitRate) {
          const submittedAt = new Date(Date.now() - Math.random() * 7 * 24 * 3600 * 1000); // Random within last week
          const created = await SubmissionModel.create({
            assignmentId: asg._id,
            studentId,
            contentUrl: '/uploads/sample-submission.pdf',
            notes: `Nộp bài tự động cho ${asg.title}`,
            submittedAt
          });
          // Chấm điểm cho ~60% submissions
          if (Math.random() < 0.6) {
            const score = Math.round((5 + Math.random() * 5) * 10) / 10; // 5.0 - 10.0
            const gradedAt = new Date(submittedAt.getTime() + Math.random() * 3 * 24 * 3600 * 1000); // Grade within 3 days
            await SubmissionModel.findByIdAndUpdate(created._id, {
              $set: {
                score,
                notes: `${created.notes} | Điểm: ${score}/10`,
                updatedAt: gradedAt
              }
            });
          }
        }
      }
    }
  }

  // Get actual submissions from database
  const actualSubmissions = await SubmissionModel.find({}).sort({ createdAt: -1 }).limit(5).lean();

  // Create sample notifications for students
  const { NotificationModel } = await import('./models/Notification.js');

  // Get some sample data for notifications
  const sampleClasses = await ClassModel.find({}).limit(3).lean();
  const sampleStudents = students.slice(0, 3);

  for (const student of sampleStudents) {
    for (const cls of sampleClasses.slice(0, 2)) { // Each student gets notifications from 2 classes
      // Create assignment notification
      const assignments = await AssignmentModel.find({ classId: cls._id }).limit(1).lean();
      if (assignments.length > 0) {
        const assignment = assignments[0];
        await NotificationModel.create({
          recipientId: student._id,
          senderId: cls.teacherId,
          classId: cls._id,
          type: 'assignment_created',
          title: `Bài tập mới: ${assignment.title}`,
          content: `Giảng viên đã giao bài tập "${assignment.title}". Hạn nộp: ${new Date(assignment.dueDate).toLocaleString('vi-VN')}.`,
          metadata: { assignmentId: assignment._id },
          isRead: Math.random() > 0.5 // Random read status for demo
        });
      }

      // Create document notification
      const documents = await DocumentModel.find({ classId: cls._id }).limit(1).lean();
      if (documents.length > 0) {
        const document = documents[0];
        await NotificationModel.create({
          recipientId: student._id,
          senderId: cls.teacherId,
          classId: cls._id,
          type: 'document_uploaded',
          title: `Tài liệu mới: ${document.title}`,
          content: `Giảng viên đã tải lên tài liệu "${document.title}". Vui lòng kiểm tra và tải xuống nếu cần.`,
          metadata: { documentId: document._id },
          isRead: Math.random() > 0.5
        });
      }

      // Create announcement notification
      const announcements = await AnnouncementModel.find({ classId: cls._id }).limit(1).lean();
      if (announcements.length > 0) {
        const announcement = announcements[0];
        await NotificationModel.create({
          recipientId: student._id,
          senderId: cls.teacherId,
          classId: cls._id,
          type: 'announcement_created',
          title: `Thông báo: ${announcement.title}`,
          content: announcement.content,
          metadata: { announcementId: announcement._id },
          isRead: Math.random() > 0.5
        });
      }
    }
  }

  console.log('Seeded sample notifications');

  // Create sample user activities and system logs after all data is created
  const { UserActivityModel } = await import('../models/UserActivity.js');
  const { SystemLogModel } = await import('../models/SystemLog.js');

  // Sample activities for different users
  const activities = [
    {
      userId: admin._id,
      role: 'admin',
      actionType: 'login',
      description: 'Admin logged in to system',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      userId: teacher._id,
      role: 'teacher',
      actionType: 'create_assignment',
      targetEntityId: allAssignments.length > 0 ? allAssignments[0]._id : null,
      targetEntityType: 'assignment',
      description: allAssignments.length > 0 ? `Created assignment: ${allAssignments[0].title}` : 'Created assignment',
      metadata: allAssignments.length > 0 ? { classId: allAssignments[0].classId, dueDate: allAssignments[0].dueDate } : {},
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    },
    {
      userId: student._id,
      role: 'student',
      actionType: 'submit_assignment',
      targetEntityId: allAssignments.length > 0 ? allAssignments[0]._id : null,
      targetEntityType: 'assignment',
      description: allAssignments.length > 0 ? `Submitted assignment: ${allAssignments[0].title}` : 'Submitted assignment',
      metadata: { filesCount: 1 },
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
    },
    {
      userId: teacher._id,
      role: 'teacher',
      actionType: 'grade_submission',
      targetEntityId: actualSubmissions.length > 0 ? actualSubmissions[0]._id : null,
      targetEntityType: 'assignment',
      description: `Graded submission for ${student.fullName}: 8.5/10`,
      metadata: { score: 8.5, assignmentId: allAssignments.length > 0 ? allAssignments[0]._id : null, studentId: student._id },
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
    },
    {
      userId: student._id,
      role: 'student',
      actionType: 'join_class',
      targetEntityId: classIds.length > 0 ? classIds[0] : null,
      targetEntityType: 'class',
      description: 'Joined class via enrollment',
      metadata: { classId: classIds.length > 0 ? classIds[0] : null },
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) // 2 days ago
    }
  ];

  for (const activity of activities) {
    if (activity.targetEntityId) { // Only create if we have valid IDs
      const exists = await UserActivityModel.findOne({
        userId: activity.userId,
        actionType: activity.actionType,
        targetEntityId: activity.targetEntityId,
        createdAt: activity.createdAt
      });
      if (!exists) {
        await UserActivityModel.create(activity);
        // eslint-disable-next-line no-console
        console.log('Seeded user activity:', activity.actionType);
      }
    }
  }

  // Sample system logs
  const systemLogs = [
    {
      level: 'error',
      message: 'Database connection timeout',
      source: 'database',
      metadata: { connectionString: 'mongodb://localhost:27017', timeout: 10000 }
    },
    {
      level: 'warn',
      message: 'High memory usage detected',
      source: 'server',
      metadata: { memoryUsage: '85%', threshold: '80%' }
    },
    {
      level: 'info',
      message: 'User authentication successful',
      source: 'auth',
      userId: admin._id,
      metadata: { username: 'admin', ipAddress: '127.0.0.1' }
    }
  ];

  for (const log of systemLogs) {
    const exists = await SystemLogModel.findOne({
      level: log.level,
      message: log.message,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Only check last 24 hours
    });
    if (!exists) {
      await SystemLogModel.create(log);
      // eslint-disable-next-line no-console
      console.log('Seeded system log:', log.level, '-', log.message);
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seed completed');
  process.exit(0);
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});


