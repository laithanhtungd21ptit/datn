import 'dotenv/config';
import { connectMongo } from '../db/mongo.js';
import { UserModel } from '../models/User.js';
import { ClassModel } from '../models/Class.js';
import { EnrollmentModel } from '../models/Enrollment.js';

async function run() {
  try {
    await connectMongo();
    console.log('Connected to MongoDB');

    // Bước 1: Cập nhật department của tất cả sinh viên
    console.log('\n=== Bước 1: Cập nhật department sinh viên ===');

    const result = await UserModel.updateMany(
      { role: 'student' },
      { $set: { department: 'Phát triển ứng dụng đa phương tiện' } }
    );

    console.log(`Đã cập nhật department cho ${result.modifiedCount} sinh viên`);

    // Bước 2: Lấy tất cả sinh viên và lớp học hiện tại
    console.log('\n=== Bước 2: Lấy dữ liệu sinh viên và lớp học ===');

    const students = await UserModel.find({ role: 'student' }).lean();
    const classes = await ClassModel.find({}).lean();

    console.log(`Tìm thấy ${students.length} sinh viên`);
    console.log(`Tìm thấy ${classes.length} lớp học`);

    // Bước 3: Xóa tất cả enrollments cũ và tạo lại
    console.log('\n=== Bước 3: Tạo enrollments ===');

    // Xóa tất cả enrollments hiện tại
    await EnrollmentModel.deleteMany({});
    console.log('Đã xóa tất cả enrollments cũ');

    // Tạo enrollments mới cho tất cả cặp student-class
    const enrollments = [];
    for (const student of students) {
      for (const cls of classes) {
        enrollments.push({
          studentId: student._id,
          classId: cls._id,
          status: 'enrolled',
          enrolledAt: new Date()
        });
      }
    }

    // Insert nhiều cùng lúc
    const enrollmentResult = await EnrollmentModel.insertMany(enrollments);
    console.log(`Đã tạo ${enrollmentResult.length} enrollments mới`);

    // Bước 4: Cập nhật currentStudents cho các lớp
    console.log('\n=== Bước 4: Cập nhật số lượng sinh viên trong lớp ===');

    for (const cls of classes) {
      const enrollmentCount = await EnrollmentModel.countDocuments({
        classId: cls._id,
        status: 'enrolled'
      });

      await ClassModel.findByIdAndUpdate(cls._id, {
        currentStudents: enrollmentCount
      });
    }

    console.log('Đã cập nhật currentStudents cho các lớp');

    // Bước 5: Thống kê
    console.log('\n=== Thống kê ===');

    const totalStudents = await UserModel.countDocuments({ role: 'student' });
    const totalClasses = await ClassModel.countDocuments();
    const totalEnrollments = await EnrollmentModel.countDocuments();

    console.log(`Tổng số sinh viên: ${totalStudents}`);
    console.log(`Tổng số lớp học: ${totalClasses}`);
    console.log(`Tổng số enrollments: ${totalEnrollments}`);
    console.log(`Số lớp mỗi sinh viên tham gia: ${totalClasses}`);
    console.log(`Số sinh viên mỗi lớp: ${totalStudents}`);

    console.log('\n✅ Hoàn thành!');
    console.log('📝 Ghi chú: Sinh viên mới tạo sau này sẽ không tự động tham gia lớp học.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

run();
