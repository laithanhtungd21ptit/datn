# ⚡ QUICK START - Deploy trong 30 phút

## 📋 Chuẩn bị
- [ ] Tài khoản Vercel (đăng ký bằng GitHub)
- [ ] Tài khoản MongoDB Atlas (FREE tier)
- [ ] Code đã push lên GitHub

## 🚀 3 Bước Deploy

### 1️⃣ Setup MongoDB (5 phút)
```
1. Tạo cluster FREE trên MongoDB Atlas
2. Tạo user + password
3. Whitelist IP: 0.0.0.0/0
4. Copy connection string:
   mongodb+srv://user:pass@cluster.mongodb.net/database-name
```

### 2️⃣ Deploy Backend (10 phút)
```
1. Vercel → Add New → Import GitHub repo
2. Root Directory: backend
3. Framework: Other
4. Environment Variables:
   - MONGODB_URI = (connection string từ bước 1)
   - JWT_SECRET = (chạy: .\generate-jwt-secret.ps1)
   - FRONTEND_URL = *
   - NODE_ENV = production
5. Deploy
6. Lưu Backend URL
```

### 3️⃣ Deploy Frontend (10 phút)
```
1. Vercel → Add New → Import cùng repo
2. Root Directory: frontend
3. Framework: Create React App
4. Environment Variables:
   - REACT_APP_BACKEND_URL = (Backend URL từ bước 2)
   - CI = false
   - DISABLE_ESLINT_PLUGIN = true
5. Deploy
6. Lưu Frontend URL
```

### 4️⃣ Cập nhật CORS (5 phút)
```
1. Vào Backend project → Settings → Environment Variables
2. Sửa FRONTEND_URL = (Frontend URL từ bước 3)
3. Deployments → Redeploy
```

## ✅ Kiểm tra
- Backend: `https://your-backend.vercel.app/health`
- Frontend: `https://your-frontend.vercel.app`
- API Docs: `https://your-backend.vercel.app/api-docs`

## 📚 Hướng dẫn chi tiết
- **Tiếng Việt**: [HUONG_DAN_DEPLOY_NHANH.md](./HUONG_DAN_DEPLOY_NHANH.md)
- **Checklist đầy đủ**: [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)
- **Troubleshooting**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 🆘 Lỗi thường gặp
| Lỗi | Giải pháp |
|-----|-----------|
| CORS error | Kiểm tra FRONTEND_URL và redeploy backend |
| 500 error | Kiểm tra MongoDB URI và logs |
| Build failed | Kiểm tra environment variables |
| 404 API | Kiểm tra REACT_APP_BACKEND_URL |

---
**Chúc bạn deploy thành công! 🎉**
