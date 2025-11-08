# 🎓 Assignment Management System

Hệ thống quản lý bài tập và lớp học cho giảng viên và sinh viên.

## 📚 Tài liệu Deploy

- **[DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)** - Checklist nhanh để deploy (30-40 phút)
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Hướng dẫn chi tiết và troubleshooting
- **[backend/VERCEL_DEPLOY.md](./backend/VERCEL_DEPLOY.md)** - Hướng dẫn deploy Backend
- **[frontend/VERCEL_DEPLOY.md](./frontend/VERCEL_DEPLOY.md)** - Hướng dẫn deploy Frontend

## 🚀 Quick Start - Deploy lên Vercel

### Bước 1: Chuẩn bị
1. Tạo tài khoản [Vercel](https://vercel.com) và [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Push code lên GitHub
3. Setup MongoDB Atlas (whitelist IP: 0.0.0.0/0)

### Bước 2: Deploy Backend
1. Import vào Vercel (Root: `backend`)
2. Set environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `FRONTEND_URL`
3. Deploy và lưu URL

### Bước 3: Deploy Frontend
1. Import vào Vercel (Root: `frontend`)
2. Set environment variables:
   - `REACT_APP_BACKEND_URL` (URL backend từ bước 2)
   - `CI=false`
3. Deploy và lưu URL

### Bước 4: Cập nhật CORS
1. Cập nhật `FRONTEND_URL` trong Backend
2. Redeploy Backend

**Chi tiết xem file [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)**

## 💻 Development - Chạy Local

### Backend
```bash
cd backend
npm install
# Tạo file .env (xem .env.example)
npm run dev
```

### Frontend
```bash
cd frontend
npm install
# Tạo file .env (xem .env.example)
npm start
```

## 🏗️ Tech Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Socket.IO (chat realtime)
- Swagger API Documentation

### Frontend
- React 18
- Material-UI (MUI)
- React Router
- Socket.IO Client

## 📁 Cấu trúc dự án

```
DATN2025/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── index.js
│   ├── vercel.json
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── api/
│   │   ├── auth/
│   │   └── App.js
│   ├── package.json
│   └── .env.example
├── DEPLOY_CHECKLIST.md
├── DEPLOYMENT_GUIDE.md
└── README.md
```

## 🔑 Environment Variables

### Backend (.env)
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
FRONTEND_URL=https://your-frontend.vercel.app
PORT=4000
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://your-backend.vercel.app
CI=false
DISABLE_ESLINT_PLUGIN=true
```

## ⚠️ Lưu ý khi deploy Vercel

### ✅ Hoạt động bình thường:
- REST API
- Authentication/Authorization
- Database operations
- File serving (static)

### ❌ Không hoạt động (Serverless limitations):
- **Socket.IO WebSocket** - Cần deploy riêng hoặc dùng HTTP long-polling
- **File upload persistent** - Cần dùng cloud storage (S3, Cloudinary)

### 📊 Giới hạn Free Tier:
- Function timeout: 10 giây
- Bandwidth: 100GB/tháng
- Max file size: 50MB

## 🔧 Troubleshooting

### CORS Error
- Kiểm tra `FRONTEND_URL` trong Backend env vars
- Redeploy Backend sau khi thay đổi

### 500 Internal Server Error
- Kiểm tra logs trong Vercel Dashboard
- Verify MongoDB connection string
- Kiểm tra MongoDB Atlas Network Access

### Build Failed
- Kiểm tra environment variables
- Xem build logs trong Vercel

**Chi tiết xem [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) phần Troubleshooting**

## 📖 API Documentation

Sau khi deploy, truy cập:
```
https://your-backend.vercel.app/api-docs
```

## 👥 Roles

- **Admin**: Quản lý toàn hệ thống
- **Teacher**: Quản lý lớp học, bài tập, chấm điểm
- **Student**: Xem bài tập, nộp bài, chat

## 🔐 Security

- JWT authentication
- Password hashing (bcrypt)
- Rate limiting
- Helmet.js security headers
- CORS protection
- Input validation

## 📝 License

MIT License

## 🆘 Support

Nếu gặp vấn đề khi deploy:
1. Kiểm tra [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
2. Xem logs trong Vercel Dashboard
3. Kiểm tra MongoDB Atlas connection

---

**Chúc bạn deploy thành công! 🎉**
