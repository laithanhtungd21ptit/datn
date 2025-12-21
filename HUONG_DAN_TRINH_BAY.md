# HƯỚNG DẪN TRÌNH BÀY DỰ ÁN (20 PHÚT)

## 📋 TỔNG QUAN DỰ ÁN (1 phút)

**Tên dự án:** Hệ thống Quản lý Học tập Trực tuyến với AI Giám sát

**Mục đích:** 
- Hệ thống LMS (Learning Management System) tích hợp AI để quản lý lớp học, bài tập, thi cử
- Giám sát tự động trong kỳ thi bằng AI (phát hiện gian lận)
- Hỗ trợ học tập thông qua AI Chat và các game thực hành tương tác

**Công nghệ chính:**
- Frontend: React + Material-UI
- Backend: Node.js + Express + MongoDB
- Mobile: React Native (Expo)
- AI: YOLO Object Detection, MediaPipe Face/Gaze Detection, RAG Chat

---

## 🖥️ PHẦN 1: GIỚI THIỆU GIAO DIỆN WEB (3 phút)

### 1.1. Trang đăng nhập (30 giây)
- **Hiển thị:** Form đăng nhập với email/password
- **Nói:** "Hệ thống hỗ trợ 3 vai trò: Học sinh, Giảng viên, và Admin. Mỗi vai trò có giao diện và chức năng riêng."

### 1.2. Dashboard Học sinh (1 phút)
- **Hiển thị:** 
  - Thống kê tổng quan: số lớp học, bài tập, kỳ thi
  - Thông báo mới nhất
  - Lịch học sắp tới
- **Nói:** "Dashboard cung cấp cái nhìn tổng quan về tiến độ học tập, giúp học sinh theo dõi các hoạt động quan trọng."

### 1.3. Giao diện chính - Menu điều hướng (1 phút)
- **Hiển thị:** Sidebar menu với các mục:
  - Trang chủ
  - Lớp học
  - Bài tập
  - Thực hành
  - Thi
  - Tài khoản
- **Nói:** "Giao diện được thiết kế responsive, dễ sử dụng với Material-UI, hỗ trợ cả desktop và mobile."

### 1.4. Giao diện Giảng viên & Admin (30 giây)
- **Hiển thị:** Chuyển sang tài khoản giáo viên/admin
- **Nói:** "Giảng viên có thêm chức năng quản lý lớp học, tạo bài tập, và giám sát thi cử. Admin quản lý toàn bộ hệ thống."

---

## ⚙️ PHẦN 2: CHỨC NĂNG TRÊN WEB (6 phút)

### 2.1. Quản lý Lớp học (1 phút)
- **Hiển thị:** 
  - Danh sách lớp học của học sinh/giảng viên
  - Chi tiết lớp: danh sách thành viên, bài tập, thông báo
- **Nói:** 
  - "Học sinh có thể xem thông tin lớp học, tải tài liệu, nộp bài tập"
  - "Giảng viên có thể quản lý lớp học, thêm/xóa học sinh, đăng thông báo"

### 2.2. Quản lý Bài tập (1 phút)
- **Hiển thị:**
  - Danh sách bài tập (đã nộp/chưa nộp)
  - Chi tiết bài tập: mô tả, file đính kèm, deadline
  - Form nộp bài (upload file)
- **Nói:** "Học sinh có thể xem bài tập, tải đề bài, và nộp bài trực tuyến. Giảng viên có thể chấm điểm và nhận xét."

### 2.3. Thực hành Bộ môn - Game tương tác (2 phút) ⭐
- **Hiển thị:** Trang chọn môn học thực hành:
  - **Kỹ thuật nhiếp ảnh:** Game điều chỉnh độ phơi sáng
  - **Xử lý đa phương tiện:** Game xử lý ảnh - Pipeline bộ lọc
  - **Xử lý âm thanh:** Game Audio EQ - Lọc & Khuếch đại
  - **Kỹ thuật đồ họa:** Game 3D Transformations (hiển thị demo)
- **Nói:** 
  - "Đây là điểm nổi bật của dự án - các game thực hành tương tác giúp học sinh học tập hiệu quả hơn"
  - **Demo Game 3D Graphics:** "Học sinh có thể thực hành các phép biến đổi 3D (tịnh tiến, quay, scale) với giao diện trực quan, xem kết quả trong không gian 3D real-time"
  - "Các game này giúp học sinh hiểu sâu hơn về lý thuyết thông qua thực hành"

### 2.4. Hệ thống Thi cử (1 phút)
- **Hiển thị:** 
  - Danh sách kỳ thi
  - Trang thi với timer, câu hỏi, form nộp bài
- **Nói:** "Hệ thống hỗ trợ thi trực tuyến với timer tự động, lưu đáp án tự động, và nộp bài khi hết giờ."

### 2.5. Chat & Thông báo (1 phút)
- **Hiển thị:** 
  - Chat popup (góc phải màn hình)
  - Thông báo real-time
- **Nói:** "Hệ thống có chat real-time giữa học sinh và giảng viên, hỗ trợ trao đổi nhanh chóng."

---

## 🤖 PHẦN 3: TÍNH NĂNG AI (5 phút) ⭐⭐⭐

### 3.1. RAG Chat AI - Hỗ trợ học tập (1.5 phút)
- **Hiển thị:** Trang RAG Chat
- **Demo:** 
  - Chọn lớp học
  - Đặt câu hỏi về bài học/bài tập
  - AI trả lời dựa trên tài liệu của lớp học
  - Hiển thị nguồn tham khảo
- **Nói:** 
  - "RAG (Retrieval-Augmented Generation) Chat là tính năng AI hỗ trợ học tập"
  - "AI có thể trả lời câu hỏi dựa trên tài liệu, bài tập, thông báo của lớp học"
  - "Học sinh có thể hỏi về nội dung bài học, cách làm bài tập, và nhận được câu trả lời chính xác với nguồn tham khảo"

### 3.2. AI Giám sát Thi cử - Phát hiện Gian lận (3.5 phút) ⭐⭐⭐

#### 3.2.1. YOLO Object Detection (1.5 phút)
- **Hiển thị:** Trang giám sát của giáo viên
- **Nói:**
  - "Hệ thống sử dụng YOLO (You Only Look Once) để phát hiện vật thể trong camera"
  - "Sử dụng 2 model: COCO model (80 classes) và Custom model (4 classes: bật lửa, máy tính, kính mắt, bút bi)"
  - "Tự động chụp ảnh từ camera học sinh mỗi 4 giây và gửi lên server để phân tích"
  - "Khi phát hiện vật thể cấm, hệ thống tự động ghi nhận vi phạm"

#### 3.2.2. Face Detection & Gaze Tracking (1.5 phút)
- **Hiển thị:** 
  - Panel AI Monitoring trong trang thi của học sinh
  - Camera preview với face detection overlay
- **Nói:**
  - "Sử dụng MediaPipe để phát hiện khuôn mặt và theo dõi hướng nhìn"
  - "Phát hiện các vi phạm:"
    - **Multiple faces:** Phát hiện nhiều người trong khung hình (người hỗ trợ)
    - **Looking away:** Học sinh quay mặt khỏi camera quá lâu
    - **Face not detected:** Không phát hiện khuôn mặt (che camera)
  - "Tất cả vi phạm được ghi lại với timestamp và bằng chứng"

#### 3.2.3. Browser Monitoring (0.5 phút)
- **Nói:**
  - "Giám sát hành vi trình duyệt:"
    - Chuyển tab, thoát fullscreen
    - Copy/paste, right-click
    - Mở DevTools
    - Phát hiện điện thoại qua camera
  - "Tất cả hành vi đáng nghi đều được ghi lại"

### 3.3. Dashboard Giám sát của Giảng viên (1 phút)
- **Hiển thị:** Trang Teacher Monitoring
- **Nói:**
  - "Giảng viên có thể xem danh sách tất cả phiên thi đang diễn ra"
  - "Xem log vi phạm real-time của từng học sinh"
  - "Xuất báo cáo Excel/PDF về vi phạm"
  - "Có thể kết thúc phiên thi nếu phát hiện gian lận nghiêm trọng"

---

## 📱 PHẦN 4: MOBILE APP (4 phút)

### 4.1. Giới thiệu App (1 phút)
- **Hiển thị:** Màn hình đăng nhập app
- **Nói:**
  - "Ứng dụng mobile được xây dựng bằng React Native (Expo)"
  - "Hỗ trợ cả iOS và Android"
  - "Giao diện được tối ưu cho mobile với navigation drawer"

### 4.2. Chức năng chính trên App (2 phút)
- **Hiển thị:** Các màn hình chính:
  - **Dashboard:** Thống kê tổng quan
  - **Lớp học:** Danh sách và chi tiết lớp học
  - **Bài tập:** Xem và nộp bài tập
  - **Thực hành:** Truy cập các game thực hành
  - **Thi:** Làm bài thi trên mobile
- **Nói:**
  - "App cung cấp đầy đủ chức năng như web"
  - "Học sinh có thể học tập mọi lúc mọi nơi"
  - "Giao diện được thiết kế thân thiện, dễ sử dụng trên màn hình nhỏ"

### 4.3. Tính năng đặc biệt trên Mobile (1 phút)
- **Hiển thị:** 
  - Push notifications
  - Offline mode (nếu có)
- **Nói:**
  - "App hỗ trợ thông báo đẩy để học sinh không bỏ lỡ thông tin quan trọng"
  - "Giảng viên có thể giám sát thi cử ngay trên mobile"
  - "Đồng bộ dữ liệu real-time với web"

---

## 🎯 PHẦN 5: KẾT LUẬN & DEMO (1 phút)

### 5.1. Điểm nổi bật của dự án
- ✅ **AI tích hợp:** RAG Chat, Object Detection, Face/Gaze Tracking
- ✅ **Game thực hành tương tác:** 3D Graphics, Audio EQ, Image Processing
- ✅ **Giám sát thi tự động:** Phát hiện gian lận real-time
- ✅ **Đa nền tảng:** Web + Mobile
- ✅ **Real-time:** Socket.IO cho chat và monitoring

### 5.2. Demo nhanh (nếu còn thời gian)
- Mở trang thi của học sinh → Hiển thị AI monitoring đang hoạt động
- Mở RAG Chat → Đặt câu hỏi và xem AI trả lời
- Mở Game 3D Graphics → Thực hiện một phép biến đổi

---

## ⏱️ PHÂN BỔ THỜI GIAN ĐỀ XUẤT

| Phần | Thời gian | Ghi chú |
|------|-----------|---------|
| Tổng quan | 1 phút | Giới thiệu nhanh |
| Giao diện Web | 3 phút | Chuyển nhanh giữa các trang |
| Chức năng Web | 6 phút | **Nhấn mạnh Game thực hành** |
| Tính năng AI | 5 phút | **Phần quan trọng nhất** |
| Mobile App | 4 phút | Demo các màn hình chính |
| Kết luận | 1 phút | Tổng kết điểm nổi bật |
| **TỔNG** | **20 phút** | |

---

## 💡 LƯU Ý KHI TRÌNH BÀY

### ✅ Nên làm:
1. **Chuẩn bị trước:** Mở sẵn các trang quan trọng trong trình duyệt
2. **Nhấn mạnh AI:** Đây là điểm khác biệt của dự án
3. **Demo thực tế:** Cho thấy AI đang hoạt động (camera, detection)
4. **Nói rõ ràng:** Giải thích từng tính năng một cách dễ hiểu
5. **Tương tác:** Hỏi xem có câu hỏi không sau mỗi phần lớn

### ❌ Tránh:
1. **Không đi sâu vào code:** Chỉ trình bày tính năng, không giải thích code
2. **Không dừng quá lâu:** Giữ nhịp độ trình bày ổn định
3. **Không bỏ qua phần AI:** Đây là phần quan trọng nhất
4. **Không quên demo mobile:** Nếu có thể, mở app trên điện thoại thật

---

## 📝 CÂU HỎI THƯỜNG GẶP (Chuẩn bị sẵn)

**Q: AI có độ chính xác như thế nào?**
- A: YOLO có độ chính xác ~85-90% với custom model. Face detection ~95%. Có thể điều chỉnh threshold để cân bằng giữa độ nhạy và độ chính xác.

**Q: Hệ thống có thể mở rộng không?**
- A: Có, backend sử dụng microservices (YOLO service riêng), có thể scale horizontal. Database MongoDB hỗ trợ sharding.

**Q: Mobile app có đầy đủ tính năng như web không?**
- A: Có, app hỗ trợ đầy đủ các chức năng chính. Một số tính năng như game 3D có thể tối ưu hơn trên web do yêu cầu hiệu năng.

**Q: Làm sao đảm bảo tính công bằng trong thi cử?**
- A: Hệ thống ghi lại tất cả vi phạm với bằng chứng (ảnh, timestamp). Giảng viên có thể xem lại và quyết định. Không tự động đánh trượt, chỉ cảnh báo.

**Q: RAG Chat sử dụng model nào?**
- A: Sử dụng LLM (có thể là GPT hoặc model open-source) kết hợp với vector database để tìm kiếm tài liệu liên quan.

---

## 🎬 KỊCH BẢN TRÌNH BÀY MẪU

### Mở đầu (30 giây)
"Xin chào thầy cô và các bạn. Hôm nay em xin trình bày về dự án Hệ thống Quản lý Học tập Trực tuyến với AI Giám sát. Đây là một hệ thống LMS tích hợp nhiều tính năng AI để hỗ trợ học tập và đảm bảo tính công bằng trong thi cử."

### Kết thúc (30 giây)
"Cảm ơn thầy cô và các bạn đã lắng nghe. Dự án này kết hợp giữa công nghệ web hiện đại và AI để tạo ra một hệ thống học tập toàn diện. Em sẵn sàng trả lời các câu hỏi."

---

**Chúc bạn trình bày thành công! 🎉**

