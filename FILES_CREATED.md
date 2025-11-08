# 📁 Danh sách files đã tạo cho deployment

## ✅ Files đã được tạo/cập nhật

### 📚 Tài liệu hướng dẫn

1. **`README.md`** - Tổng quan dự án và hướng dẫn cơ bản
2. **`QUICK_START.md`** - Hướng dẫn deploy nhanh trong 30 phút
3. **`HUONG_DAN_DEPLOY_NHANH.md`** - Hướng dẫn chi tiết bằng tiếng Việt
4. **`DEPLOY_CHECKLIST.md`** - Checklist từng bước để deploy
5. **`DEPLOYMENT_GUIDE.md`** - Hướng dẫn đầy đủ và troubleshooting

### 🔧 Backend

6. **`backend/.env.example`** - Template cho environment variables
7. **`backend/.vercelignore`** - Files bỏ qua khi deploy
8. **`backend/VERCEL_DEPLOY.md`** - Hướng dẫn deploy backend
9. **`backend/src/index.js`** - ✏️ Đã sửa để hỗ trợ serverless

### 🎨 Frontend

10. **`frontend/.env.example`** - Template cho environment variables
11. **`frontend/.vercelignore`** - Files bỏ qua khi deploy
12. **`frontend/VERCEL_DEPLOY.md`** - Hướng dẫn deploy frontend

### 🛠️ Utilities

13. **`generate-jwt-secret.ps1`** - Script PowerShell tạo JWT secret
14. **`.gitignore`** - ✏️ Đã cập nhật để cho phép .env.example

## 📖 Cách sử dụng

### Bắt đầu deploy
Đọc theo thứ tự:
1. `QUICK_START.md` - Nếu muốn deploy nhanh
2. `HUONG_DAN_DEPLOY_NHANH.md` - Nếu muốn hướng dẫn chi tiết bằng tiếng Việt
3. `DEPLOY_CHECKLIST.md` - Để check từng bước

### Khi gặp lỗi
- Đọc `DEPLOYMENT_GUIDE.md` phần Troubleshooting
- Xem logs trong Vercel Dashboard

### Tạo JWT Secret
```powershell
# Windows PowerShell
.\generate-jwt-secret.ps1
```

### Setup Environment Variables

**Backend** (xem `backend/.env.example`):
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
FRONTEND_URL=https://...
```

**Frontend** (xem `frontend/.env.example`):
```env
REACT_APP_BACKEND_URL=https://...
CI=false
DISABLE_ESLINT_PLUGIN=true
```

## 🔍 Thay đổi trong code

### `backend/src/index.js`
**Thay đổi**: Sửa logic khởi tạo server để hỗ trợ Vercel serverless

**Trước:**
```javascript
server.listen(port, async () => {
  await connectMongo();
  await bootstrapIndexes();
  console.log(`Backend listening on http://localhost:${port}`);
});
```

**Sau:**
```javascript
// For Vercel serverless, initialize database connection
if (process.env.VERCEL) {
  connectMongo().then(() => {
    bootstrapIndexes().catch(err => console.error('Bootstrap error:', err));
  }).catch(err => console.error('MongoDB connection error:', err));
} else {
  // For local development, start the server normally
  server.listen(port, async () => {
    await connectMongo();
    await bootstrapIndexes();
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

// Export app for Vercel serverless
export default app;
```

**Lý do**: Vercel serverless không cần `server.listen()`, chỉ cần export Express app.

## ⚠️ Lưu ý quan trọng

### Files không được commit lên Git
- `.env` (backend và frontend)
- `node_modules/`
- `build/`
- `uploads/` (backend)

### Files phải commit lên Git
- `.env.example` (backend và frontend)
- `vercel.json` (backend)
- `.vercelignore` (backend và frontend)
- Tất cả files hướng dẫn (*.md)

## 🚀 Workflow deploy

1. **Lần đầu**:
   - Đọc `HUONG_DAN_DEPLOY_NHANH.md`
   - Follow từng bước trong `DEPLOY_CHECKLIST.md`
   - Setup environment variables theo `.env.example`

2. **Cập nhật sau này**:
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```
   → Vercel tự động deploy

3. **Kiểm tra**:
   - Backend health: `/health`
   - API docs: `/api-docs`
   - Frontend: Mở trình duyệt + F12 console

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra `DEPLOYMENT_GUIDE.md` → Troubleshooting
2. Xem logs trong Vercel Dashboard
3. Kiểm tra MongoDB Atlas connection

---

**Tất cả files đã sẵn sàng để deploy! 🎉**
