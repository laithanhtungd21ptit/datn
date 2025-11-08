# 🚀 Hướng dẫn triển khai dự án lên Vercel

## 📋 Mục lục
1. [Chuẩn bị trước khi deploy](#1-chuẩn-bị-trước-khi-deploy)
2. [Deploy Backend](#2-deploy-backend)
3. [Deploy Frontend](#3-deploy-frontend)
4. [Cấu hình biến môi trường](#4-cấu-hình-biến-môi-trường)
5. [Kiểm tra và xử lý lỗi](#5-kiểm-tra-và-xử-lý-lỗi)

---

## 1. Chuẩn bị trước khi deploy

### 1.1. Tạo tài khoản cần thiết

- **Vercel Account**: Đăng ký tại [vercel.com](https://vercel.com)
- **MongoDB Atlas**: Đăng ký tại [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) (miễn phí)
- **GitHub Account**: Để kết nối repository

### 1.2. Chuẩn bị MongoDB Atlas

1. Đăng nhập vào MongoDB Atlas
2. Tạo cluster mới (chọn FREE tier)
3. Tạo database user:
   - Vào **Database Access** → **Add New Database User**
   - Chọn **Password** authentication
   - Lưu lại username và password
4. Whitelist IP:
   - Vào **Network Access** → **Add IP Address**
   - Chọn **Allow Access from Anywhere** (0.0.0.0/0)
5. Lấy connection string:
   - Vào **Database** → **Connect** → **Connect your application**
   - Copy connection string (dạng: `mongodb+srv://username:password@cluster.mongodb.net/`)
   - Thay `<password>` bằng password thực tế
   - Thêm tên database vào cuối: `mongodb+srv://username:password@cluster.mongodb.net/your-database-name`

### 1.3. Push code lên GitHub

```bash
# Khởi tạo git (nếu chưa có)
git init

# Add tất cả files
git add .

# Commit
git commit -m "Prepare for Vercel deployment"

# Tạo repository trên GitHub và push
git remote add origin https://github.com/your-username/your-repo.git
git branch -M main
git push -u origin main
```

---

## 2. Deploy Backend

### 2.1. Import project vào Vercel

1. Đăng nhập vào [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import GitHub repository của bạn
4. **Configure Project**:
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: (để trống)
   - **Output Directory**: (để trống)
   - **Install Command**: `npm install`

### 2.2. Cấu hình Environment Variables cho Backend

Trong phần **Environment Variables**, thêm các biến sau:

| Key | Value | Ghi chú |
|-----|-------|---------|
| `NODE_ENV` | `production` | Môi trường production |
| `MONGODB_URI` | `mongodb+srv://...` | Connection string từ MongoDB Atlas |
| `JWT_SECRET` | `your-random-secret-key-here` | Tạo chuỗi ngẫu nhiên dài và phức tạp |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` | URL frontend (sẽ có sau khi deploy frontend) |
| `PORT` | `4000` | (Optional) |
| `VERCEL` | `1` | Đã có trong vercel.json |

**Cách tạo JWT_SECRET an toàn:**
```bash
# Trên Linux/Mac
openssl rand -base64 32

# Hoặc dùng Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2.3. Deploy Backend

1. Click **Deploy**
2. Đợi quá trình build hoàn tất (2-3 phút)
3. Sau khi deploy thành công, bạn sẽ có URL backend: `https://your-backend.vercel.app`
4. **Lưu lại URL này** để cấu hình frontend

### 2.4. Kiểm tra Backend

Truy cập các endpoint sau để kiểm tra:
- `https://your-backend.vercel.app/health` - Kiểm tra server
- `https://your-backend.vercel.app/api-docs` - Swagger documentation

---

## 3. Deploy Frontend

### 3.1. Cập nhật cấu hình Frontend

Trước khi deploy frontend, cần tạo file cấu hình API:

**Tạo file `frontend/src/config.js`:**
```javascript
const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:4000',
  socketUrl: process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000'
};

export default config;
```

**Cập nhật các file API để sử dụng config:**
Thay thế các hardcoded URL bằng `config.apiUrl`

### 3.2. Import Frontend project vào Vercel

1. Trong Vercel Dashboard, click **Add New** → **Project**
2. Chọn cùng repository (hoặc import lại)
3. **Configure Project**:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

### 3.3. Cấu hình Environment Variables cho Frontend

| Key | Value | Ghi chú |
|-----|-------|---------|
| `REACT_APP_API_URL` | `https://your-backend.vercel.app` | URL backend đã deploy |
| `REACT_APP_SOCKET_URL` | `https://your-backend.vercel.app` | URL backend cho Socket.IO |
| `CI` | `false` | Tắt CI để build không fail vì warnings |
| `DISABLE_ESLINT_PLUGIN` | `true` | Tắt ESLint trong build |

### 3.4. Deploy Frontend

1. Click **Deploy**
2. Đợi build hoàn tất (3-5 phút)
3. Sau khi deploy thành công, bạn sẽ có URL: `https://your-frontend.vercel.app`

### 3.5. Cập nhật CORS trên Backend

1. Quay lại project Backend trên Vercel
2. Vào **Settings** → **Environment Variables**
3. Cập nhật `FRONTEND_URL` = `https://your-frontend.vercel.app`
4. **Redeploy** backend:
   - Vào tab **Deployments**
   - Click vào deployment mới nhất
   - Click **...** → **Redeploy**

---

## 4. Cấu hình biến môi trường

### 4.1. Backend Environment Variables (Đầy đủ)

```env
# Server
NODE_ENV=production
PORT=4000
VERCEL=1

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# CORS
FRONTEND_URL=https://your-frontend.vercel.app

# Email (nếu có tính năng email)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# AI Features (nếu có)
OPENAI_API_KEY=sk-...
```

### 4.2. Frontend Environment Variables (Đầy đủ)

```env
REACT_APP_API_URL=https://your-backend.vercel.app
REACT_APP_SOCKET_URL=https://your-backend.vercel.app
CI=false
DISABLE_ESLINT_PLUGIN=true
```

---

## 5. Kiểm tra và xử lý lỗi

### 5.1. Kiểm tra Backend

**Test các endpoint:**
```bash
# Health check
curl https://your-backend.vercel.app/health

# API endpoint (ví dụ)
curl https://your-backend.vercel.app/api/users
```

**Xem logs:**
1. Vào Vercel Dashboard → Backend Project
2. Click vào **Deployments** → Deployment mới nhất
3. Click **View Function Logs**

### 5.2. Kiểm tra Frontend

1. Mở `https://your-frontend.vercel.app`
2. Mở **Developer Console** (F12)
3. Kiểm tra:
   - Không có lỗi CORS
   - API calls thành công
   - Socket.IO kết nối được

### 5.3. Các lỗi thường gặp

#### ❌ Lỗi CORS

**Nguyên nhân:** Frontend URL chưa được thêm vào CORS whitelist

**Giải pháp:**
1. Cập nhật `FRONTEND_URL` trong Backend environment variables
2. Redeploy backend

#### ❌ Lỗi 500 Internal Server Error

**Nguyên nhân:** Thiếu environment variables hoặc MongoDB connection failed

**Giải pháp:**
1. Kiểm tra logs trong Vercel
2. Đảm bảo `MONGODB_URI` đúng
3. Kiểm tra MongoDB Atlas whitelist IP (phải là 0.0.0.0/0)

#### ❌ Lỗi "Cannot read property 'listen' of null"

**Nguyên nhân:** Code chưa được cập nhật để hỗ trợ serverless

**Giải pháp:** Code đã được sửa trong file `index.js`

#### ❌ Socket.IO không kết nối được

**Nguyên nhân:** Vercel serverless không hỗ trợ WebSocket persistent connections

**Giải pháp:** 
- Socket.IO sẽ tự động fallback sang HTTP long-polling
- Hoặc sử dụng service riêng cho Socket.IO (Railway, Render, etc.)

#### ❌ File upload không hoạt động

**Nguyên nhân:** Vercel serverless có giới hạn 50MB và không lưu file persistent

**Giải pháp:**
- Sử dụng cloud storage (AWS S3, Cloudinary, etc.)
- Hoặc giữ file upload trên server riêng

### 5.4. Monitoring và Logs

**Xem logs realtime:**
```bash
# Cài Vercel CLI
npm i -g vercel

# Login
vercel login

# Xem logs
vercel logs your-backend.vercel.app --follow
```

---

## 6. Cập nhật và Redeploy

### 6.1. Auto Deploy (Khuyến nghị)

Vercel tự động deploy khi bạn push code lên GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

### 6.2. Manual Deploy

1. Vào Vercel Dashboard
2. Chọn project
3. Tab **Deployments** → **Redeploy**

---

## 7. Production Checklist

Trước khi đưa vào production, kiểm tra:

- [ ] MongoDB Atlas đã setup đúng và có backup
- [ ] Tất cả environment variables đã được set
- [ ] JWT_SECRET đủ mạnh (min 32 ký tự)
- [ ] CORS được cấu hình đúng
- [ ] API endpoints hoạt động bình thường
- [ ] Frontend kết nối được Backend
- [ ] Logs không có lỗi nghiêm trọng
- [ ] File upload (nếu có) hoạt động
- [ ] Authentication/Authorization hoạt động
- [ ] Email notifications (nếu có) hoạt động

---

## 8. Lưu ý quan trọng

### ⚠️ Giới hạn của Vercel Free Tier

- **Function execution**: 10s timeout
- **Bandwidth**: 100GB/tháng
- **Invocations**: 100GB-hours/tháng
- **File size**: 50MB max
- **No persistent storage**: Không lưu file upload

### 💡 Best Practices

1. **Sử dụng environment variables** cho mọi config
2. **Không commit** file `.env` lên Git
3. **Enable monitoring** và alerts
4. **Backup database** thường xuyên
5. **Test kỹ** trước khi deploy production
6. **Sử dụng custom domain** cho professional look

### 🔒 Security

1. JWT_SECRET phải đủ dài và phức tạp
2. MongoDB user chỉ có quyền cần thiết
3. Enable rate limiting (đã có trong code)
4. Sử dụng HTTPS (Vercel tự động)
5. Validate input data

---

## 9. Hỗ trợ

Nếu gặp vấn đề:

1. Kiểm tra logs trong Vercel Dashboard
2. Xem [Vercel Documentation](https://vercel.com/docs)
3. Kiểm tra [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
4. Tham khảo issues trên GitHub repository

---

**Chúc bạn deploy thành công! 🎉**
