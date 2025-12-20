import 'dotenv/config';
import { connectMongo } from '../db/mongo.js';
import { UserModel } from '../models/User.js';
import { ClassModel } from '../models/Class.js';
import { AssignmentModel } from '../models/Assignment.js';
import { EnrollmentModel } from '../models/Enrollment.js';
import { DocumentModel } from '../models/Document.js';
import { AnnouncementModel } from '../models/Announcement.js';

// Danh sách môn học đầy đủ theo yêu cầu
const courses = [
  { code: 'BAS1220', name: 'Toán cao cấp 2', credits: 2 },
  { code: 'BAS1226', name: 'Xác suất thống kê', credits: 2 },
  { code: 'CDT1434', name: 'Đồ án tốt nghiệp', credits: 6 },
  { code: 'ELE14104', name: 'Thị giác máy tính', credits: 3 },
  { code: 'INT1155', name: 'Tin học cơ sở 2', credits: 2 },
  { code: 'INT13110', name: 'Lập trình mạng với C++', credits: 3 },
  { code: 'INT13111', name: 'Kỹ thuật đồ họa', credits: 3 },
  { code: 'INT1313', name: 'Cơ sở dữ liệu', credits: 3 },
  { code: 'INT1358', name: 'Toán rời rạc 1', credits: 3 },
  { code: 'INT14165', name: 'An toàn thông tin', credits: 3 },
  { code: 'MUL1238', name: 'Cơ sở tạo hình', credits: 3 },
  { code: 'MUL1307', name: 'Xử lý và truyền thông đa phương tiện', credits: 2 },
  { code: 'MUL13108', name: 'Ngôn ngữ lập trình Java', credits: 3 },
  { code: 'MUL1320', name: 'Nhập môn đa phương tiện', credits: 2 },
  { code: 'MUL14125', name: 'Xử lý ảnh và video', credits: 3 },
  { code: 'MUL14126', name: 'Lập trình âm thanh', credits: 2 },
  { code: 'MUL14129', name: 'Phát triển ứng dụng thực tại ảo', credits: 3 },
  { code: 'MUL14130', name: 'Khai phá dữ liệu đa phương tiện', credits: 3 },
  { code: 'MUL14154', name: 'Phát triển ứng dụng IoT', credits: 3 },
  { code: 'MUL1422', name: 'Tổ chức sản xuất sản phẩm đa phương tiện', credits: 2 },
  { code: 'MUL1446', name: 'Lập trình game cơ bản', credits: 3 },
  { code: 'MUL1448', name: 'Lập trình ứng dụng trên đầu cuối di động', credits: 3 },
  { code: 'MUL1451', name: 'Chuyên đề phát triển ứng dụng đa phương tiện', credits: 1 },
  { code: 'MUL2019', name: 'Thực tập tốt nghiệp', credits: 6 },
  { code: 'SKD1103', name: 'Kỹ năng tạo lập Văn bản', credits: 1 },
  { code: 'BAS1158', name: 'Tiếng Anh (Course 2)', credits: 4 },
  { code: 'INT1339', name: 'Ngôn ngữ lập trình C++', credits: 3 },
  { code: 'MUL13149', name: 'Mỹ thuật cơ bản', credits: 3 },
  { code: 'MUL1423', name: 'Kịch bản đa phương tiện', credits: 2 },
  { code: 'INT1325', name: 'Kiến trúc máy tính và hệ điều hành', credits: 2 },
  { code: 'MUL13122', name: 'Kỹ thuật nhiếp ảnh', credits: 2 },
  { code: 'MUL13148', name: 'Bản quyền số', credits: 2 },
  { code: 'MUL13152', name: 'Thiết kế web cơ bản', credits: 3 },
  { code: 'MUL14134', name: 'Thiết kế hình động 1', credits: 3 },
  { code: 'MUL1454', name: 'Thiết kế đồ họa 3D', credits: 3 },
  { code: 'INT1434', name: 'Lập trình Web', credits: 3 },
  { code: 'MUL13124', name: 'Dựng audio và video phi tuyến', credits: 3 },
  { code: 'MUL1314', name: 'Kỹ thuật quay phim', credits: 3 },
  { code: 'MUL13150', name: 'Thiết kế đồ họa', credits: 3 },
  { code: 'MUL13151', name: 'Thiết kế tương tác đa phương tiện', credits: 3 },
  { code: 'MUL1415', name: 'Kỹ xảo đa phương tiện', credits: 2 },
  { code: 'INT1340', name: 'Nhập môn công nghệ phần mềm', credits: 3 },
  { code: 'MUL14204', name: 'Thực tập chuyên sâu', credits: 4 },
  { code: 'BAS1219', name: 'Toán cao cấp 1', credits: 2 },
  { code: 'BAS1151', name: 'Kinh tế chính trị Mác- Lênin', credits: 2 },
  { code: 'SKD1108', name: 'Phương pháp luận nghiên cứu khoa học', credits: 2 },
  { code: 'INT1306', name: 'Cấu trúc dữ liệu và giải thuật', credits: 3 },
  { code: 'BAS1107', name: 'Giáo dục thể chất 2', credits: 2 },
  { code: 'BAS1153', name: 'Lịch sử Đảng cộng sản Việt Nam', credits: 2 },
  { code: 'BAS1160', name: 'Tiếng Anh (Course 3 Plus)', credits: 2 },
  { code: 'BAS1122', name: 'Tư tưởng Hồ Chí Minh', credits: 2 },
  { code: 'BAS1152', name: 'Chủ nghĩa xã hội khoa học', credits: 2 },
  { code: 'BAS1150', name: 'Triết học Mác - Lênin', credits: 3 },
  { code: 'INT1154', name: 'Tin học cơ sở 1', credits: 2 },
  { code: 'SKD1102', name: 'Kỹ năng làm việc nhóm', credits: 1 },
  { code: 'BAS1159', name: 'Tiếng Anh (Course 3)', credits: 4 },
  { code: 'BAS1106', name: 'Giáo dục thể chất 1', credits: 2 },
  { code: 'BAS1157', name: 'Tiếng Anh (Course 1)', credits: 4 },
  { code: 'SKD1101', name: 'Kỹ năng thuyết trình', credits: 1 },
];

// Hàm xác định khoa dựa trên mã môn học
function getDepartment(courseCode) {
  if (courseCode.startsWith('MUL')) {
    return 'Đa phương tiện';
  } else if (courseCode.startsWith('INT')) {
    return 'Công nghệ thông tin';
  } else if (courseCode.startsWith('BAS')) {
    return 'Khoa học cơ bản';
  } else if (courseCode.startsWith('SKD')) {
    return 'Kỹ năng mềm';
  } else if (courseCode.startsWith('CDT') || courseCode.startsWith('ELE')) {
    return 'Kỹ thuật';
  }
  return 'Công nghệ thông tin'; // Default
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
    ],
    'Kỹ thuật': [
      'Môn học cung cấp kiến thức chuyên sâu về các lĩnh vực kỹ thuật tiên tiến.',
      'Kết hợp lý thuyết và thực hành để phát triển năng lực kỹ thuật chuyên môn.',
      'Ứng dụng các công nghệ kỹ thuật vào giải quyết các vấn đề thực tiễn.'
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

async function run() {
  try {
    await connectMongo();
    console.log('Connected to MongoDB');

    // Bước 1: Xóa tất cả lớp học hiện tại
    console.log('\n=== Bước 1: Xóa dữ liệu lớp học cũ ===');
    
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

    // Bước 2: Lấy giảng viên mặc định
    console.log('\n=== Bước 2: Lấy giảng viên ===');
    
    // Lấy giảng viên đầu tiên làm mặc định
    const defaultTeacher = await UserModel.findOne({ role: 'teacher' }).lean();
    if (!defaultTeacher) {
      console.error('❌ Không tìm thấy giảng viên nào trong database. Vui lòng chạy npm run seed trước.');
      process.exit(1);
    }
    
    console.log(`Sử dụng giảng viên mặc định: ${defaultTeacher.fullName} (${defaultTeacher.teacherId})`);

    // Bước 3: Tạo lớp học mới
    console.log('\n=== Bước 3: Tạo lớp học mới ===');
    
    const createdClasses = [];
    
    for (const course of courses) {
      const department = getDepartment(course.code);
      const description = generateDescription(course.name, department);
      
      // Kiểm tra lớp đã tồn tại chưa
      let cls = await ClassModel.findOne({ code: course.code }).lean();
      
      if (!cls) {
        cls = await ClassModel.create({
          name: course.name,
          code: course.code,
          department,
          credits: course.credits,
          description,
          teacherId: defaultTeacher._id,
          isActive: true,
          semester: '20241', // Mặc định học kỳ 1 năm 2024
          year: 2024,
          maxStudents: 60,
          currentStudents: 0
        });
        
        console.log(`✓ Tạo lớp: ${course.code} - ${course.name} (${department})`);
      } else {
        console.log(`- Lớp đã tồn tại: ${course.code} - ${course.name}`);
      }
      
      createdClasses.push(cls);
      
      // Tạo assignments cho lớp
      const assignments = generateAssignments(course.name, course.credits);
      for (const assignment of assignments) {
        await AssignmentModel.create({
          ...assignment,
          classId: cls._id,
          teacherId: defaultTeacher._id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    console.log(`\n✅ Đã tạo thành công ${createdClasses.length} lớp học`);
    
    // Bước 4: Thống kê
    console.log('\n=== Thống kê ===');
    
    // Thống kê theo khoa
    const departmentStats = {};
    for (const course of courses) {
      const dept = getDepartment(course.code);
      if (!departmentStats[dept]) {
        departmentStats[dept] = { count: 0, totalCredits: 0 };
      }
      departmentStats[dept].count++;
      departmentStats[dept].totalCredits += course.credits;
    }
    
    console.log('\nPhân bố theo khoa:');
    for (const [dept, stats] of Object.entries(departmentStats)) {
      console.log(`- ${dept}: ${stats.count} môn, ${stats.totalCredits} tín chỉ`);
    }
    
    const totalClasses = await ClassModel.countDocuments();
    console.log(`\nTổng số lớp học trong database: ${totalClasses}`);
    
    console.log('\n✅ Hoàn thành!');
    console.log('📝 Ghi chú: Giảng viên sẽ được cập nhật sau theo yêu cầu của bạn.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

run();
