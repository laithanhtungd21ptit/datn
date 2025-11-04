# Hệ thống Quản lý Bài tập và Giám sát Học tập

## Tổng quan

Đây là hệ thống web quản lý bài tập và giám sát học tập được xây dựng bằng ReactJS và Material-UI. Hệ thống hỗ trợ hai vai trò chính: Giảng viên và Sinh viên.

## Tính năng chính

### 👨‍🏫 Dành cho Giảng viên

#### Dashboard
- Lịch dạy hôm nay
- Thông báo mới
- Thống kê nhanh (số lớp, bài tập, sinh viên)
- Biểu đồ thống kê nộp bài tập

#### Quản lý lớp học
- Danh sách lớp học
- Xem danh sách sinh viên
- Gửi thông báo đến lớp
- Tạo lớp học mới

#### Quản lý bài tập
- Danh sách bài tập
- Chi tiết bài tập (mô tả, file đính kèm, deadline)
- Danh sách sinh viên đã nộp/chưa nộp
- Chấm điểm và nhận xét
- Bình luận dưới bài tập

#### Giám sát học tập AI
- Camera giám sát sinh viên
- Phát hiện vi phạm tự động
- Log giám sát
- Cài đặt độ nhạy

### 👩‍🎓 Dành cho Sinh viên

#### Dashboard
- Lịch học hôm nay
- Deadline sắp tới
- Điểm số gần đây
- Thống kê tiến độ học tập

#### Lớp học
- Danh sách lớp tham gia
- Tham gia lớp bằng mã
- Xem tài liệu và thông báo
- Tải xuống tài liệu

#### Bài tập
- Danh sách bài tập
- Nộp bài với file đính kèm
- Xem điểm và nhận xét
- Bình luận (hỏi/đáp với GV và SV khác)

#### Tài khoản cá nhân
- Chỉnh sửa thông tin
- Đổi mật khẩu
- Cài đặt thông báo
- Thống kê học tập

## Cài đặt và Chạy

### Yêu cầu hệ thống
- Node.js 16.x trở lên
- npm hoặc yarn

### Cài đặt

1. Di chuyển vào thư mục frontend:
```bash
cd frontend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Chạy ứng dụng:
```bash
npm start
```

4. Mở trình duyệt và truy cập: `http://localhost:3000`

### Tài khoản demo

**Giảng viên:**
- Tên đăng nhập: `admin`
- Mật khẩu: `123`

**Sinh viên:**
- Tên đăng nhập: `student`
- Mật khẩu: `123`

## Cấu trúc thư mục

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── Layout/
│   │       └── Layout.js
│   ├── pages/
│   │   ├── Login/
│   │   │   └── Login.js
│   │   ├── Teacher/
│   │   │   ├── Dashboard/
│   │   │   ├── Classes/
│   │   │   ├── Assignments/
│   │   │   └── Monitoring/
│   │   └── Student/
│   │       ├── Dashboard/
│   │       ├── Classes/
│   │       ├── Assignments/
│   │       └── Profile/
│   ├── App.js
│   └── index.js
├── package.json
└── README.md
```

## Công nghệ sử dụng

- **React 18**: Framework UI chính
- **Material-UI 5**: Thư viện component UI
- **React Router**: Điều hướng trang
- **Recharts**: Biểu đồ và thống kê
- **Day.js**: Xử lý ngày tháng
- **Material Icons**: Icon

## Tính năng nổi bật

### Responsive Design
- Giao diện thích ứng trên mọi thiết bị
- Mobile-first approach

### Real-time Updates
- Thông báo real-time
- Cập nhật trạng thái tức thì

### AI Monitoring
- Giám sát camera tự động
- Phát hiện vi phạm thông minh
- Log chi tiết hoạt động

### File Management
- Upload/download file an toàn
- Hỗ trợ nhiều định dạng file
- Quản lý tài liệu có tổ chức

### Notification System
- Thông báo đa kênh (email, SMS, in-app)
- Cài đặt thông báo linh hoạt
- Lịch sử thông báo

## Phát triển thêm

### Backend Integration
- Kết nối API backend
- Authentication & Authorization
- Database integration

### Advanced Features
- Video call integration
- Advanced AI monitoring
- Mobile app
- Offline support

### Performance
- Code splitting
- Lazy loading
- Caching strategies

## Đóng góp

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## License

MIT License - xem file LICENSE để biết thêm chi tiết.

## Liên hệ

Nếu có câu hỏi hoặc góp ý, vui lòng tạo issue trên GitHub repository.
