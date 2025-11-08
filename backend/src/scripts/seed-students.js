import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectMongo } from '../db/mongo.js';
import { UserModel } from '../models/User.js';
import { EnrollmentModel } from '../models/Enrollment.js';
import { SubmissionModel } from '../models/Submission.js';

// Danh sách sinh viên đầy đủ theo yêu cầu
const newStudents = [
  { fullName: 'Lê Hoàng Anh', studentId: 'B21DCPT044', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Ngô Quốc Anh', studentId: 'B21DCPT045', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Nguyễn Quang Anh', studentId: 'B21DCPT047', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Nguyễn Trọng Anh', studentId: 'B21DCPT050', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Trần Xuân Bách', studentId: 'B21DCPT056', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Vũ Trọng Bảo', studentId: 'B21DCPT058', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Đoàn Thị Diễm', studentId: 'B21DCPT075', gender: 'Nữ', role: 'Thành viên' },
  { fullName: 'Hoàng Hữu Tiến Dũng', studentId: 'B21DCPT081', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Dương Văn Duy', studentId: 'B21DCPT086', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Vũ Viết Duy', studentId: 'B21DCPT089', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Mai Thành Đạt', studentId: 'B21DCPT072', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Trần Tuấn Đạt', studentId: 'B21DCPT074', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Tô Hải Đăng', studentId: 'B21DCPT068', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Trịnh Ngọc Đức', studentId: 'B21DCPT080', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Trương Xuân Giang', studentId: 'B21DCPT092', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Trần Quang Hà', studentId: 'B21DCPT007', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Nguyễn Hồng Hải', studentId: 'B21DCPT096', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Trần Ngọc Hiển', studentId: 'B21DCPT104', gender: 'Nam', role: 'Lớp phó' },
  { fullName: 'Đỗ Trung Hiếu', studentId: 'B21DCPT011', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Nguyễn Lê Duy Hiếu', studentId: 'B21DCPT105', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Phạm Quang Hiếu', studentId: 'B21DCPT107', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Phạm Văn Hiếu', studentId: 'B21DCPT109', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Trịnh Duy Hiếu', studentId: 'B21DCPT013', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Đinh Hữu Hoàng', studentId: 'B21DCPT115', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Đỗ Huy Hoàng', studentId: 'B21DCPT116', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Hà Huy Hùng', studentId: 'B21DCPT014', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Hoàng Văn Hùng', studentId: 'B21DCPT123', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Bùi Quốc Huy', studentId: 'B21DCPT129', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Hoàng Việt Hưng', studentId: 'B21DCPT126', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Cao Đinh Nam Khánh', studentId: 'B21DCPT017', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Đỗ Thanh Khánh', studentId: 'B21DCPT134', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Trần Xuân Lâm', studentId: 'B21DCPT138', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Hoàng Thị Hồng Lê', studentId: 'B21DCPT139', gender: 'Nữ', role: 'Thành viên' },
  { fullName: 'Trần Tuấn Linh', studentId: 'B21DCPT145', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Nguyễn Viết Việt Long', studentId: 'B21DCPT149', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Đỗ Tuấn Minh', studentId: 'B21DCPT023', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Phạm Xuân Nghị', studentId: 'B21DCPT168', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Phạm Thị Minh Nguyệt', studentId: 'B21DCPT028', gender: 'Nữ', role: 'Thành viên' },
  { fullName: 'Trịnh Xuân Phong', studentId: 'B21DCPT182', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Vũ Thanh Phong', studentId: 'B21DCPT183', gender: 'Nam', role: 'Lớp phó' },
  { fullName: 'Nguyễn Đức Phức', studentId: 'B21DCPT184', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Thái Kim Quý', studentId: 'B21DCPT193', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Nguyễn Thị Quỳnh', studentId: 'B21DCPT196', gender: 'Nữ', role: 'Thành viên' },
  { fullName: 'Phan Xuân Sắc', studentId: 'B21DCPT198', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Nguyễn Văn Thành', studentId: 'B21DCPT207', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Vũ Minh Thành', studentId: 'B21DCPT035', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Trần Quang Thắng', studentId: 'B21DCPT204', gender: 'Nam', role: 'Lớp trưởng' },
  { fullName: 'Hoàng Trung Tiến', studentId: 'B21DCPT216', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Phạm Minh Tiến', studentId: 'B21DCPT217', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Vũ Văn Toản', studentId: 'B21DCPT218', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Trịnh Kiều Trang', studentId: 'B21DCPT037', gender: 'Nữ', role: 'Thành viên' },
  { fullName: 'Đỗ Đăng Tuân', studentId: 'B21DCPT225', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Lại Thanh Tùng', studentId: 'B21DCPT238', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Nguyễn Thanh Tùng', studentId: 'B21DCPT229', gender: 'Nam', role: 'Thành viên' },
  { fullName: 'Nguyễn Văn Tùng', studentId: 'B21DCPT230', gender: 'Nam', role: 'Thành viên' },
];

// Danh sách địa chỉ mẫu
const addresses = [
  'Hà Nội',
  'Hồ Chí Minh',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'Nghệ An',
  'Thanh Hóa',
  'Quảng Ninh',
  'Bắc Ninh',
  'Hưng Yên'
];

// Danh sách khoa
const departments = [
  'Công nghệ thông tin',
  'Khoa học máy tính',
  'Kỹ thuật phần mềm',
  'An toàn thông tin',
  'Trí tuệ nhân tạo'
];

// Hàm tạo email chuẩn theo format: TungNT.B21PT229@stu.ptit.edu.vn
function generateEmail(fullName, studentId) {
  const parts = fullName.trim().split(' ');
  const lastName = parts.pop();
  const initials = parts.map(p => p[0]?.toUpperCase() || '').join('');
  const namePart = lastName.charAt(0).toUpperCase() + lastName.slice(1);
  // Convert B21DCPT229 to B21PT229
  const msvShort = studentId.replace('DC', '');
  return `${namePart}${initials}.${msvShort}@stu.ptit.edu.vn`;
}

// Hàm tạo số điện thoại ngẫu nhiên
function generatePhone() {
  return `09${Math.floor(10000000 + Math.random() * 90000000)}`;
}

// Hàm tạo ngày sinh ngẫu nhiên (2002-2004)
function generateDateOfBirth() {
  const year = 2002 + Math.floor(Math.random() * 3);
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  return new Date(year, month - 1, day);
}

async function run() {
  await connectMongo();

  // Bước 1: Xóa tất cả sinh viên hiện tại
  console.log('\n=== Bước 1: Xóa dữ liệu sinh viên cũ ===');
  
  // Lấy danh sách ID của sinh viên cũ
  const oldStudents = await UserModel.find({ role: 'student' }).lean();
  const oldStudentIds = oldStudents.map(s => s._id);
  
  console.log(`Tìm thấy ${oldStudents.length} sinh viên cũ`);
  
  // Xóa enrollments của sinh viên cũ
  const deletedEnrollments = await EnrollmentModel.deleteMany({ 
    studentId: { $in: oldStudentIds } 
  });
  console.log(`Đã xóa ${deletedEnrollments.deletedCount} enrollments`);
  
  // Xóa submissions của sinh viên cũ
  const deletedSubmissions = await SubmissionModel.deleteMany({ 
    studentId: { $in: oldStudentIds } 
  });
  console.log(`Đã xóa ${deletedSubmissions.deletedCount} submissions`);
  
  // Xóa users sinh viên
  const deletedUsers = await UserModel.deleteMany({ role: 'student' });
  console.log(`Đã xóa ${deletedUsers.deletedCount} users sinh viên`);

  // Bước 2: Tạo sinh viên mới
  console.log('\n=== Bước 2: Tạo sinh viên mới ===');
  
  const defaultPassword = '123456';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  
  const createdStudents = [];
  
  for (const student of newStudents) {
    // Username là MSV theo yêu cầu
    const username = student.studentId;
    const email = generateEmail(student.fullName, student.studentId);
    const phone = generatePhone();
    const dateOfBirth = generateDateOfBirth();
    const address = addresses[Math.floor(Math.random() * addresses.length)];
    const department = departments[Math.floor(Math.random() * departments.length)];
    
    const newUser = await UserModel.create({
      username, // Username là MSV
      fullName: student.fullName,
      email,
      passwordHash,
      role: 'student',
      status: 'active',
      phone,
      department,
      studentId: student.studentId,
      address,
      dateOfBirth,
      gender: student.gender,
      avatar: '',
    });
    
    createdStudents.push(newUser);
    
    console.log(`✓ Tạo sinh viên: ${student.fullName} (${student.studentId}) - Username: ${username} - Email: ${email}`);
  }
  
  console.log(`\n✅ Đã tạo thành công ${createdStudents.length} sinh viên mới`);
  
  // Bước 3: Thống kê
  console.log('\n=== Thống kê ===');
  const totalStudents = await UserModel.countDocuments({ role: 'student' });
  console.log(`Tổng số sinh viên hiện tại: ${totalStudents}`);
  
  console.log('\n=== Thông tin đăng nhập ===');
  console.log('Password mặc định cho tất cả sinh viên: 123456');
  console.log('Username là mã sinh viên (MSV)');
  console.log('\nVí dụ:');
  console.log(`- Username: ${newStudents[0].studentId}`);
  console.log(`- Password: 123456`);
  console.log(`- Email: ${generateEmail(newStudents[0].fullName, newStudents[0].studentId)}`);
  
  console.log('\n✅ Hoàn thành!');
  process.exit(0);
}

run();
