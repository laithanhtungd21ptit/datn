# Backend Deployment trên Vercel

## ⚡ Quick Start

### 1. Cấu hình Environment Variables

Trong Vercel Dashboard, thêm các biến sau:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
FRONTEND_URL=https://your-frontend.vercel.app
PORT=4000
```

### 2. Deploy Settings

- **Framework Preset**: Other
- **Root Directory**: `backend`
- **Build Command**: (để trống)
- **Output Directory**: (để trống)
- **Install Command**: `npm install`

### 3. Kiểm tra sau khi deploy

```bash
# Health check
curl https://your-backend.vercel.app/health

# API docs
https://your-backend.vercel.app/api-docs
```

## 📝 Lưu ý

### Serverless Architecture

Backend này đã được cấu hình để chạy trên Vercel serverless:

- ✅ Không tạo HTTP server khi `process.env.VERCEL=1`
- ✅ Export Express app trực tiếp
- ✅ Database connection được khởi tạo async
- ✅ Socket.IO bị disable (không hỗ trợ trên serverless)

### File Upload

⚠️ **Quan trọng**: Vercel serverless không lưu file persistent.

**Giải pháp**:
- Sử dụng cloud storage (AWS S3, Cloudinary, etc.)
- Hoặc deploy file upload service riêng

### Socket.IO

⚠️ Socket.IO sẽ không hoạt động trên Vercel serverless.

**Giải pháp**:
- Deploy Socket.IO server riêng (Railway, Render, etc.)
- Hoặc sử dụng HTTP long-polling
- Hoặc sử dụng Vercel Edge Functions (beta)

## 🔧 Troubleshooting

### Lỗi: Cannot read property 'listen' of null

✅ **Đã fix**: Code đã được cập nhật để export app thay vì gọi `server.listen()`

### Lỗi: MongoDB connection timeout

**Kiểm tra**:
1. MongoDB Atlas Network Access: Phải whitelist `0.0.0.0/0`
2. Connection string đúng format
3. Database user có quyền truy cập

### Lỗi: CORS

**Kiểm tra**:
1. `FRONTEND_URL` đã được set đúng
2. Redeploy sau khi thay đổi env vars

## 📊 Monitoring

Xem logs:

```bash
# Cài Vercel CLI
npm i -g vercel

# Login
vercel login

# Xem logs
vercel logs your-backend.vercel.app --follow
```

## 🚀 Redeploy

Auto deploy khi push lên GitHub:

```bash
git add .
git commit -m "Update"
git push origin main
```

Hoặc manual redeploy trong Vercel Dashboard.
