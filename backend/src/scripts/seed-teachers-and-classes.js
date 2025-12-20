import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectMongo } from '../db/mongo.js';
import { UserModel } from '../models/User.js';
import { ClassModel } from '../models/Class.js';
import { AssignmentModel } from '../models/Assignment.js';
import { EnrollmentModel } from '../models/Enrollment.js';
import { DocumentModel } from '../models/Document.js';
import { AnnouncementModel } from '../models/Announcement.js';

// Danh sách môn học và giảng viên từ yêu cầu
const classTeacherMapping = [
  { subject: 'Nhập môn đa phương tiện', teacher: 'Hà Thị Hồng Ngân' },
  { subject: 'Tin học cơ sở 1', teacher: 'Nguyễn Quý Sỹ' },
  { subject: 'Cơ sở tạo hình', teacher: 'Hà Thị Hồng Ngân' },
  { subject: 'Toán cao cấp 1', teacher: 'Trần Việt Anh' },
  { subject: 'Triết học Mác-Lênin', teacher: 'Phạm Hữu Cường' },
  { subject: 'Giáo dục thể chất 1', teacher: 'Trần Khánh Liên' },
  { subject: 'Thiết kế đồ họa', teacher: 'Nguyễn Lê Mai' },
  { subject: 'Mỹ thuật cơ bản', teacher: 'Nguyễn Thị Hà Phương' },
  { subject: 'Kỹ thuật nhiếp ảnh', teacher: 'Nguyễn Cảnh Châu' },
  { subject: 'Tin học cơ sở 2', teacher: 'Ninh Thị Thu Trang' },
  { subject: 'Toán cao cấp 2', teacher: 'Hoàng Phi Dũng' },
  { subject: 'Tiếng Anh (Course 1)', teacher: 'Vũ Nguyên Hạnh' },
  { subject: 'Kinh tế chính trị Mác-Lênin', teacher: 'Đặng Minh Phước' },
  { subject: 'Giáo dục thể chất 2', teacher: 'Trần Khánh Liên' },
  { subject: 'Kỹ năng làm việc nhóm', teacher: 'Trần Hà Giang' },
  { subject: 'Thiết kế hình động', teacher: 'Trần Quốc Trung' },
  { subject: 'Kỹ thuật quay phim', teacher: 'Nguyễn Cảnh Châu' },
  { subject: 'Toán rời rạc 1', teacher: 'Nguyễn Thùy Trang' },
  { subject: 'Ngôn ngữ lập trình C++', teacher: 'Ninh Thị Thu Trang' },
  { subject: 'Xác suất thống kê', teacher: 'Trần Việt Anh' },
  { subject: 'Tiếng Anh (Course 2)', teacher: 'Lê Thị Thu Hạnh' },
  { subject: 'Chủ nghĩa xã hội khoa học', teacher: 'Đinh Mạnh Sơn' },
  { subject: 'Kỹ năng tạo lập văn bản', teacher: 'Lê Vũ Điệp' },
  { subject: 'Thiết kế đồ họa 3D', teacher: 'Nguyễn Phương Anh' },
  { subject: 'Thiết kế tương tác đa phương tiện', teacher: 'Nguyễn Thị Tuyết Mai' },
  { subject: 'Xử lý và truyền thông đa phương tiện', teacher: 'Vũ Hữu Tiến' },
  { subject: 'Kiến trúc máy tính', teacher: 'Nguyễn Quý Sỹ' },
  { subject: 'Cấu trúc dữ liệu và giải thuật', teacher: 'Nguyễn Mạnh Sơn' },
  { subject: 'Tiếng Anh (Course 3)', teacher: 'Phạm Thị Nguyên Thư' },
  { subject: 'Tư tưởng Hồ Chí Minh', teacher: 'Phan Thanh Khánh' },
  { subject: 'Kịch bản đa phương tiện', teacher: 'Phí Công Huy' },
  { subject: 'Thiết kế Web cơ bản', teacher: 'Vũ Thị Tú Anh' },
  { subject: 'Dụng Audio và Video phi tuyến', teacher: 'Nguyễn Cảnh Châu' },
  { subject: 'Ngôn ngữ lập trình Java', teacher: 'Vũ Hữu Tiến' },
  { subject: 'Tiếng Anh (Course 3 Plus)', teacher: 'Phạm Thị Nguyên Thư' },
  { subject: 'Lịch sử Đảng cộng sản Việt Nam', teacher: 'Đinh Mạnh Ninh' },
  { subject: 'Phương pháp luận nghiên cứu khoa học', teacher: 'Nguyễn Thị Khánh Chi' },
  { subject: 'Kỹ năng thuyết trình', teacher: 'Vũ Khánh Ly' },
  { subject: 'Lập trình âm thanh', teacher: 'Phạm Văn Sự' },
  { subject: 'Bản quyền số', teacher: 'Trần Quý Nam' },
  { subject: 'Nhập môn công nghệ phần mềm', teacher: 'Nguyễn Mạnh Hùng' },
  { subject: 'Cơ sở dữ liệu', teacher: 'Đặng Văn Hanh' },
  { subject: 'Kỹ thuật đồ họa', teacher: 'Nguyễn Thị Thanh Tâm' },
  { subject: 'Lập trình mạng với C++', teacher: 'Vũ Thị Tú Anh' },
  { subject: 'Chuyên đề phát triển ứng dụng đa phương tiện', teacher: 'Hoàng Đăng Hải' },
  { subject: 'Lập trình ứng dụng trên đầu cuối di động', teacher: 'Trần Quý Nam' },
  { subject: 'Lập trình game cơ bản', teacher: 'Đặng Văn Hanh' },
  { subject: 'Xử lý ảnh và video', teacher: 'Vũ Hữu Tiến' },
  { subject: 'Lập trình web', teacher: 'Nguyễn Quang Hưng' },
  { subject: 'Thị giác máy tính', teacher: 'Phạm Văn Sự' },
  { subject: 'Thực tập chuyên sâu', teacher: 'Trần Quý Nam' },
  { subject: 'Phát triển ứng dụng IoT', teacher: 'Nguyễn Quốc Uy' },
  { subject: 'Khai phá dữ liệu đa phương tiện', teacher: 'Trần Quý Nam' },
  { subject: 'Phát triển ứng dụng thực tại ảo', teacher: 'Nguyễn Thị Thanh Tâm' },
  { subject: 'An toàn thông tin', teacher: 'Hoàng Đăng Hải' }
];

// Map tên môn học sang department dựa trên code trong seed-classes.js
const subjectToDepartment = {
  'Nhập môn đa phương tiện': 'Đa phương tiện',
  'Tin học cơ sở 1': 'Công nghệ thông tin',
  'Cơ sở tạo hình': 'Đa phương tiện',
  'Toán cao cấp 1': 'Khoa học cơ bản',
  'Triết học Mác-Lênin': 'Khoa học cơ bản',
  'Giáo dục thể chất 1': 'Khoa học cơ bản',
  'Thiết kế đồ họa': 'Đa phương tiện',
  'Mỹ thuật cơ bản': 'Đa phương tiện',
  'Kỹ thuật nhiếp ảnh': 'Đa phương tiện',
  'Tin học cơ sở 2': 'Công nghệ thông tin',
  'Toán cao cấp 2': 'Khoa học cơ bản',
  'Tiếng Anh (Course 1)': 'Khoa học cơ bản',
  'Kinh tế chính trị Mác-Lênin': 'Khoa học cơ bản',
  'Giáo dục thể chất 2': 'Khoa học cơ bản',
  'Kỹ năng làm việc nhóm': 'Kỹ năng mềm',
  'Thiết kế hình động': 'Đa phương tiện',
  'Kỹ thuật quay phim': 'Đa phương tiện',
  'Toán rời rạc 1': 'Công nghệ thông tin',
  'Ngôn ngữ lập trình C++': 'Công nghệ thông tin',
  'Xác suất thống kê': 'Khoa học cơ bản',
  'Tiếng Anh (Course 2)': 'Khoa học cơ bản',
  'Chủ nghĩa xã hội khoa học': 'Khoa học cơ bản',
  'Kỹ năng tạo lập văn bản': 'Kỹ năng mềm',
  'Thiết kế đồ họa 3D': 'Đa phương tiện',
  'Thiết kế tương tác đa phương tiện': 'Đa phương tiện',
  'Xử lý và truyền thông đa phương tiện': 'Đa phương tiện',
  'Kiến trúc máy tính': 'Công nghệ thông tin',
  'Cấu trúc dữ liệu và giải thuật': 'Công nghệ thông tin',
  'Tiếng Anh (Course 3)': 'Khoa học cơ bản',
  'Tư tưởng Hồ Chí Minh': 'Khoa học cơ bản',
  'Kịch bản đa phương tiện': 'Đa phương tiện',
  'Thiết kế Web cơ bản': 'Đa phương tiện',
  'Dụng Audio và Video phi tuyến': 'Đa phương tiện',
  'Ngôn ngữ lập trình Java': 'Công nghệ thông tin',
  'Tiếng Anh (Course 3 Plus)': 'Khoa học cơ bản',
  'Lịch sử Đảng cộng sản Việt Nam': 'Khoa học cơ bản',
  'Phương pháp luận nghiên cứu khoa học': 'Kỹ năng mềm',
  'Kỹ năng thuyết trình': 'Kỹ năng mềm',
  'Lập trình âm thanh': 'Công nghệ thông tin',
  'Bản quyền số': 'Đa phương tiện',
  'Nhập môn công nghệ phần mềm': 'Công nghệ thông tin',
  'Cơ sở dữ liệu': 'Công nghệ thông tin',
  'Kỹ thuật đồ họa': 'Công nghệ thông tin',
  'Lập trình mạng với C++': 'Công nghệ thông tin',
  'Chuyên đề phát triển ứng dụng đa phương tiện': 'Đa phương tiện',
  'Lập trình ứng dụng trên đầu cuối di động': 'Công nghệ thông tin',
  'Lập trình game cơ bản': 'Công nghệ thông tin',
  'Xử lý ảnh và video': 'Công nghệ thông tin',
  'Lập trình web': 'Công nghệ thông tin',
  'Thị giác máy tính': 'Công nghệ thông tin',
  'Thực tập chuyên sâu': 'Đa phương tiện',
  'Phát triển ứng dụng IOT': 'Công nghệ thông tin',
  'Khai phá dữ liệu đa phương tiện': 'Đa phương tiện',
  'Phát triển ứng dụng thực tại ảo': 'Đa phương tiện',
  'An toàn thông tin': 'Công nghệ thông tin'
};

// Danh sách môn học với thông tin chi tiết từ seed-classes.js
const courses = [
  { code: 'MUL1320', name: 'Nhập môn đa phương tiện', credits: 2 },
  { code: 'INT1154', name: 'Tin học cơ sở 1', credits: 2 },
  { code: 'MUL1228', name: 'Cơ sở tạo hình', credits: 3 },
  { code: 'BAS1219', name: 'Toán cao cấp 1', credits: 2 },
  { code: 'BAS1150', name: 'Triết học Mác-Lênin', credits: 3 },
  { code: 'BAS1106', name: 'Giáo dục thể chất 1', credits: 2 },
  { code: 'MUL13150', name: 'Thiết kế đồ họa', credits: 3 },
  { code: 'MUL13149', name: 'Mỹ thuật cơ bản', credits: 3 },
  { code: 'MUL13122', name: 'Kỹ thuật nhiếp ảnh', credits: 2 },
  { code: 'INT1155', name: 'Tin học cơ sở 2', credits: 2 },
  { code: 'BAS1220', name: 'Toán cao cấp 2', credits: 2 },
  { code: 'BAS1157', name: 'Tiếng Anh (Course 1)', credits: 4 },
  { code: 'BAS1151', name: 'Kinh tế chính trị Mác-Lênin', credits: 2 },
  { code: 'BAS1107', name: 'Giáo dục thể chất 2', credits: 2 },
  { code: 'SKD1102', name: 'Kỹ năng làm việc nhóm', credits: 1 },
  { code: 'MUL14134', name: 'Thiết kế hình động', credits: 3 },
  { code: 'MUL1314', name: 'Kỹ thuật quay phim', credits: 3 },
  { code: 'INT1358', name: 'Toán rời rạc 1', credits: 3 },
  { code: 'INT1339', name: 'Ngôn ngữ lập trình C++', credits: 3 },
  { code: 'BAS1226', name: 'Xác suất thống kê', credits: 2 },
  { code: 'BAS1158', name: 'Tiếng Anh (Course 2)', credits: 4 },
  { code: 'BAS1152', name: 'Chủ nghĩa xã hội khoa học', credits: 2 },
  { code: 'SKD1103', name: 'Kỹ năng tạo lập văn bản', credits: 1 },
  { code: 'MUL1454', name: 'Thiết kế đồ họa 3D', credits: 3 },
  { code: 'MUL13151', name: 'Thiết kế tương tác đa phương tiện', credits: 3 },
  { code: 'MUL1307', name: 'Xử lý và truyền thông đa phương tiện', credits: 2 },
  { code: 'INT1325', name: 'Kiến trúc máy tính', credits: 2 },
  { code: 'INT1306', name: 'Cấu trúc dữ liệu và giải thuật', credits: 3 },
  { code: 'BAS1159', name: 'Tiếng Anh (Course 3)', credits: 4 },
  { code: 'BAS1122', name: 'Tư tưởng Hồ Chí Minh', credits: 2 },
  { code: 'MUL1423', name: 'Kịch bản đa phương tiện', credits: 2 },
  { code: 'MUL13152', name: 'Thiết kế Web cơ bản', credits: 3 },
  { code: 'MUL13124', name: 'Dụng Audio và Video phi tuyến', credits: 3 },
  { code: 'MUL13108', name: 'Ngôn ngữ lập trình Java', credits: 3 },
  { code: 'BAS1160', name: 'Tiếng Anh (Course 3 Plus)', credits: 2 },
  { code: 'BAS1153', name: 'Lịch sử Đảng cộng sản Việt Nam', credits: 2 },
  { code: 'SKD1107', name: 'Phương pháp luận nghiên cứu khoa học', credits: 2 },
  { code: 'SKD1101', name: 'Kỹ năng thuyết trình', credits: 1 },
  { code: 'MUL14126', name: 'Lập trình âm thanh', credits: 2 },
  { code: 'MUL13148', name: 'Bản quyền số', credits: 2 },
  { code: 'INT1340', name: 'Nhập môn công nghệ phần mềm', credits: 3 },
  { code: 'INT1313', name: 'Cơ sở dữ liệu', credits: 3 },
  { code: 'INT13111', name: 'Kỹ thuật đồ họa', credits: 3 },
  { code: 'INT13110', name: 'Lập trình mạng với C++', credits: 3 },
  { code: 'MUL1451', name: 'Chuyên đề phát triển ứng dụng đa phương tiện', credits: 1 },
  { code: 'MUL1448', name: 'Lập trình ứng dụng trên đầu cuối di động', credits: 3 },
  { code: 'MUL1446', name: 'Lập trình game cơ bản', credits: 3 },
  { code: 'MUL14125', name: 'Xử lý ảnh và video', credits: 3 },
  { code: 'INT1434', name: 'Lập trình web', credits: 3 },
  { code: 'ELE14104', name: 'Thị giác máy tính', credits: 3 },
  { code: 'MUL14204', name: 'Thực tập chuyên sâu', credits: 4 },
  { code: 'MUL14154', name: 'Phát triển ứng dụng IoT', credits: 3 },
  { code: 'MUL14130', name: 'Khai phá dữ liệu đa phương tiện', credits: 3 },
  { code: 'MUL14129', name: 'Phát triển ứng dụng thực tại ảo', credits: 3 },
  { code: 'INT14165', name: 'An toàn thông tin', credits: 3 }
];

// Hàm tạo email giảng viên
function generateTeacherEmail(fullName) {
  // Loại bỏ dấu và chuẩn hóa
  const normalized = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

  const parts = normalized.split(' ');
  const lastName = parts[parts.length - 1];
  const middleInitials = parts.slice(0, -1).map(p => p.charAt(0).toUpperCase()).join('');

  return `${lastName}${middleInitials}@ptit.edu.vn`;
}

// Hàm tạo số điện thoại ngẫu nhiên
function generatePhone() {
  return `09${Math.floor(10000000 + Math.random() * 90000000)}`;
}

// Hàm tạo mô tả môn học
function generateDescription(courseName, department) {
  const descriptions = {
    'Đa phương tiện': [
      'Môn học cung cấp kiến thức nền tảng về lĩnh vực đa phương tiện, bao gồm lý thuyết và thực hành.',
      'Khám phá các kỹ thuật xử lý và tạo ra nội dung đa phương tiện chuyên nghiệp.',
      'Phát triển kỹ năng thiết kế và sản xuất các sản phẩm đa phương tiện hiện đại.'
    ],
    'Công nghệ thông tin': [
      'Môn học tập trung vào các khái niệm cốt lõi và kỹ năng thực hành trong lĩnh vực công nghệ thông tin.',
      'Cung cấp nền tảng vững chắc về lập trình và các công nghệ tiên tiến.',
      'Phát triển năng lực giải quyết vấn đề trong các dự án công nghệ thực tế.'
    ],
    'Khoa học cơ bản': [
      'Môn học xây dựng nền tảng kiến thức khoa học cơ bản cho sinh viên ngành kỹ thuật.',
      'Cung cấp các công cụ toán học và logic cần thiết cho việc học tập và nghiên cứu.',
      'Phát triển tư duy phản biện và khả năng phân tích các vấn đề khoa học.'
    ],
    'Kỹ năng mềm': [
      'Môn học phát triển các kỹ năng mềm cần thiết cho môi trường học tập và làm việc.',
      'Nâng cao khả năng giao tiếp, làm việc nhóm và thuyết trình hiệu quả.',
      'Chuẩn bị cho sinh viên các kỹ năng quan trọng để thành công trong sự nghiệp.'
    ]
  };

  const deptDescriptions = descriptions[department] || descriptions['Công nghệ thông tin'];
  return deptDescriptions[Math.floor(Math.random() * deptDescriptions.length)];
}

// Hàm tạo danh sách assignment mẫu
function generateAssignments(courseName, credits) {
  const assignments = [];

  // Assignment 1: Bài tập lớn
  assignments.push({
    title: `Bài tập lớn ${courseName}`,
    description: `Bài tập lớn đánh giá kiến thức tổng hợp về môn ${courseName}`,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày từ nay
    isExam: false,
    durationMinutes: null,
    maxScore: 10
  });

  // Assignment 2: Giữa kỳ (nếu môn có >= 3 tín chỉ)
  if (credits >= 3) {
    assignments.push({
      title: `Kiểm tra giữa kỳ ${courseName}`,
      description: `Kiểm tra đánh giá kiến thức giữa kỳ môn ${courseName}`,
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 ngày từ nay
      isExam: true,
      durationMinutes: 90,
      maxScore: 10
    });
  }

  // Assignment 3: Cuối kỳ
  assignments.push({
    title: `Kiểm tra cuối kỳ ${courseName}`,
    description: `Kiểm tra tổng kết môn ${courseName}`,
    dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 ngày từ nay
    isExam: true,
    durationMinutes: 120,
    maxScore: 10
  });

  return assignments;
}

// Hàm tạo email sinh viên chuẩn theo format không dấu
function generateStudentEmail(fullName, studentId) {
  const normalized = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

  const parts = normalized.split(' ');
  const lastName = parts[parts.length - 1];
  const initials = parts.slice(0, -1).map(p => p.charAt(0).toUpperCase()).join('');
  const namePart = lastName.charAt(0).toUpperCase() + lastName.slice(1);
  const msvShort = studentId.replace('DC', '');
  return `${namePart}${initials}.${msvShort}@stu.ptit.edu.vn`;
}

async function run() {
  try {
    await connectMongo();
    console.log('Connected to MongoDB');

    // Bước 1: Xóa tất cả dữ liệu giảng viên và lớp học cũ
    console.log('\n=== Bước 1: Xóa dữ liệu giảng viên và lớp học cũ ===');

    // Lấy danh sách ID của lớp cũ
    const oldClasses = await ClassModel.find({}).lean();
    const oldClassIds = oldClasses.map(c => c._id);

    console.log(`Tìm thấy ${oldClasses.length} lớp học cũ`);

    // Xóa enrollments của lớp cũ
    const deletedEnrollments = await EnrollmentModel.deleteMany({
      classId: { $in: oldClassIds }
    });
    console.log(`Đã xóa ${deletedEnrollments.deletedCount} enrollments`);

    // Xóa assignments của lớp cũ
    const deletedAssignments = await AssignmentModel.deleteMany({
      classId: { $in: oldClassIds }
    });
    console.log(`Đã xóa ${deletedAssignments.deletedCount} assignments`);

    // Xóa documents của lớp cũ
    const deletedDocuments = await DocumentModel.deleteMany({
      classId: { $in: oldClassIds }
    });
    console.log(`Đã xóa ${deletedDocuments.deletedCount} documents`);

    // Xóa announcements của lớp cũ
    const deletedAnnouncements = await AnnouncementModel.deleteMany({
      classId: { $in: oldClassIds }
    });
    console.log(`Đã xóa ${deletedAnnouncements.deletedCount} announcements`);

    // Xóa classes
    const deletedClasses = await ClassModel.deleteMany({});
    console.log(`Đã xóa ${deletedClasses.deletedCount} classes`);

    // Xóa tất cả giảng viên (bao gồm cả từ seed.js ban đầu)
    const deletedTeachers = await UserModel.deleteMany({ role: 'teacher' });
    console.log(`Đã xóa ${deletedTeachers.deletedCount} giảng viên`);

    // Bước 2: Tạo danh sách giảng viên duy nhất
    console.log('\n=== Bước 2: Tạo giảng viên mới ===');

    const uniqueTeachers = {};
    classTeacherMapping.forEach(item => {
      if (!uniqueTeachers[item.teacher]) {
        uniqueTeachers[item.teacher] = {
          fullName: item.teacher,
          department: subjectToDepartment[item.subject] || 'Công nghệ thông tin',
          subjects: []
        };
      }
      uniqueTeachers[item.teacher].subjects.push(item.subject);
    });

    const defaultPassword = '123456';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    let teacherCounter = 1;
    const createdTeachers = [];

    for (const [teacherName, teacherData] of Object.entries(uniqueTeachers)) {
      const email = generateTeacherEmail(teacherName);
      const username = email; // Username là email
      const phone = generatePhone();

      try {
        let teacher = await UserModel.findOne({ email });
        if (!teacher) {
          teacher = await UserModel.create({
            username,
            fullName: teacherName,
            email,
            passwordHash,
            role: 'teacher',
            status: 'active',
            phone,
            department: teacherData.department,
            teacherId: `GVPTIT${String(teacherCounter).padStart(3, '0')}`,
            avatar: '',
          });
        } else {
          // Cập nhật thông tin nếu teacher đã tồn tại
          const updateData = {
            fullName: teacherName,
            role: 'teacher',
            status: 'active',
            phone,
            department: teacherData.department,
            teacherId: `GVPTIT${String(teacherCounter).padStart(3, '0')}`,
          };
          // Chỉ cập nhật username nếu chưa set hoặc khác
          if (!teacher.username || teacher.username !== email) {
            updateData.username = email;
          }
          await UserModel.findByIdAndUpdate(teacher._id, updateData);
        }

        createdTeachers.push(teacher);
        console.log(`✓ ${teacher ? 'Cập nhật' : 'Tạo'} giảng viên: ${teacherName} (${teacher.teacherId}) - Username/Email: ${email} - Khoa: ${teacherData.department}`);
        teacherCounter++;
      } catch (error) {
        console.log(`⚠️ Lỗi với giảng viên: ${teacherName} - ${error.message}`);
      }
    }

    console.log(`\n✅ Đã tạo thành công ${createdTeachers.length} giảng viên`);

    // Bước 3: Tạo lớp học và gắn giảng viên
    console.log('\n=== Bước 3: Tạo lớp học mới ===');

    const createdClasses = [];

    for (const mapping of classTeacherMapping) {
      // Tìm course info
      const courseInfo = courses.find(c => c.name === mapping.subject);
      if (!courseInfo) {
        console.log(`⚠️ Không tìm thấy thông tin course cho môn: ${mapping.subject}`);
        console.log(`Available courses: ${courses.map(c => c.name).join(', ')}`);
        continue;
      }

      // Tìm teacher
      const teacher = createdTeachers.find(t => t.fullName === mapping.teacher);
      if (!teacher) {
        console.log(`⚠️ Không tìm thấy giảng viên: ${mapping.teacher}`);
        continue;
      }

      const department = subjectToDepartment[mapping.subject] || 'Công nghệ thông tin';
      const description = generateDescription(mapping.subject, department);

      const cls = await ClassModel.create({
        name: mapping.subject,
        code: courseInfo.code,
        department,
        credits: courseInfo.credits,
        description,
        teacherId: teacher._id,
        isActive: true,
        semester: '20241',
        year: 2024,
        maxStudents: 60,
        currentStudents: 0
      });

      createdClasses.push(cls);

      console.log(`✓ Tạo lớp: ${courseInfo.code} - ${mapping.subject} - GV: ${teacher.fullName}`);

      // Tạo assignments cho lớp
      const assignments = generateAssignments(mapping.subject, courseInfo.credits);
      for (const assignment of assignments) {
        await AssignmentModel.create({
          ...assignment,
          classId: cls._id,
          teacherId: teacher._id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    console.log(`\n✅ Đã tạo thành công ${createdClasses.length} lớp học`);

    // Bước 4: Cập nhật email sinh viên
    console.log('\n=== Bước 4: Cập nhật email sinh viên ===');

    const students = await UserModel.find({ role: 'student' }).lean();
    let updatedCount = 0;

    for (const student of students) {
      const newEmail = generateStudentEmail(student.fullName, student.studentId);
      if (newEmail !== student.email) {
        await UserModel.findByIdAndUpdate(student._id, { email: newEmail });
        updatedCount++;
      }
    }

    console.log(`Đã cập nhật email cho ${updatedCount} sinh viên`);

    // Bước 5: Thống kê
    console.log('\n=== Thống kê ===');

    const totalClasses = await ClassModel.countDocuments();
    const totalTeachers = await UserModel.countDocuments({ role: 'teacher' });
    const totalStudents = await UserModel.countDocuments({ role: 'student' });

    console.log(`Tổng số lớp học: ${totalClasses}`);
    console.log(`Tổng số giảng viên: ${totalTeachers}`);
    console.log(`Tổng số sinh viên: ${totalStudents}`);

    // Thống kê theo khoa
    const departmentStats = {};
    for (const cls of createdClasses) {
      if (!departmentStats[cls.department]) {
        departmentStats[cls.department] = { count: 0, totalCredits: 0 };
      }
      departmentStats[cls.department].count++;
      departmentStats[cls.department].totalCredits += cls.credits;
    }

    console.log('\nPhân bố lớp học theo khoa:');
    for (const [dept, stats] of Object.entries(departmentStats)) {
      console.log(`- ${dept}: ${stats.count} môn, ${stats.totalCredits} tín chỉ`);
    }

    console.log('\n=== Thông tin đăng nhập ===');
    console.log('Password mặc định cho giảng viên: 123456');
    console.log('Username giảng viên: Email của giảng viên (ví dụ: NganHTH@ptit.edu.vn)');
    console.log('Email giảng viên theo format: HọTên@ptit.edu.vn (không dấu)');

    console.log('\n✅ Hoàn thành!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

run();
