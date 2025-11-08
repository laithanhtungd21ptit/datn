# 📋 Checklist Deploy lên Vercel

## Bước 1: Chuẩn bị (5-10 phút)

- [ ] Tạo tài khoản [Vercel](https://vercel.com)
- [ ] Tạo tài khoản [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [ ] Push code lên GitHub

## Bước 2: Setup MongoDB Atlas (5 phút)

- [ ] Tạo cluster mới (FREE tier)
- [ ] Tạo database user (lưu username/password)
- [ ] Whitelist IP: `0.0.0.0/0` (Allow from anywhere)
- [ ] Copy connection string
- [ ] Thay `<password>` và thêm tên database

**Connection string mẫu:**
```
mongodb+srv://username:password@cluster.mongodb.net/your-database-name
```

## Bước 3: Deploy Backend (10 phút)

### 3.1. Import vào Vercel
- [ ] Vào Vercel Dashboard → Add New → Project
- [ ] Import GitHub repository
- [ ] Root Directory: `backend`
- [ ] Framework: Other
- [ ] Build Command: (để trống)
- [ ] Install Command: `npm install`

### 3.2. Environment Variables
Thêm các biến sau:

- [ ] `NODE_ENV` = `production`
- [ ] `MONGODB_URI` = `mongodb+srv://...` (từ bước 2)
- [ ] `JWT_SECRET` = (tạo random string dài 32+ ký tự)
- [ ] `FRONTEND_URL` = (để tạm `*`, sẽ cập nhật sau)
- [ ] `PORT` = `4000`

**Tạo JWT_SECRET:**
```bash
# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Linux/Mac
openssl rand -base64 32
```

### 3.3. Deploy
- [ ] Click Deploy
- [ ] Đợi 2-3 phút
- [ ] **Lưu lại Backend URL**: `https://your-backend.vercel.app`

### 3.4. Test Backend
- [ ] Truy cập: `https://your-backend.vercel.app/health`
- [ ] Kiểm tra response: `{"status":"ok"}`
- [ ] Xem API docs: `https://your-backend.vercel.app/api-docs`

## Bước 4: Deploy Frontend (10 phút)

### 4.1. Import vào Vercel
- [ ] Vào Vercel Dashboard → Add New → Project
- [ ] Chọn cùng GitHub repository
- [ ] Root Directory: `frontend`
- [ ] Framework: Create React App
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `build`

### 4.2. Environment Variables
- [ ] `REACT_APP_BACKEND_URL` = `https://your-backend.vercel.app` (từ bước 3.3)
- [ ] `CI` = `false`
- [ ] `DISABLE_ESLINT_PLUGIN` = `true`

### 4.3. Deploy
- [ ] Click Deploy
- [ ] Đợi 3-5 phút
- [ ] **Lưu lại Frontend URL**: `https://your-frontend.vercel.app`

## Bước 5: Cập nhật Backend CORS (5 phút)

- [ ] Quay lại Backend project trong Vercel
- [ ] Settings → Environment Variables
- [ ] Sửa `FRONTEND_URL` = `https://your-frontend.vercel.app` (từ bước 4.3)
- [ ] Deployments → Click deployment mới nhất → ... → Redeploy

## Bước 6: Kiểm tra hoạt động (5 phút)

### Backend
- [ ] `https://your-backend.vercel.app/health` → OK
- [ ] Logs không có lỗi nghiêm trọng

### Frontend
- [ ] Mở `https://your-frontend.vercel.app`
- [ ] Mở Developer Console (F12)
- [ ] Không có lỗi CORS
- [ ] Login thành công
- [ ] API calls hoạt động

### Database
- [ ] Vào MongoDB Atlas → Collections
- [ ] Kiểm tra có data được tạo

## Bước 7: Security Check

- [ ] JWT_SECRET đủ mạnh (min 32 ký tự)
- [ ] Không commit file `.env` lên Git
- [ ] MongoDB user chỉ có quyền cần thiết
- [ ] CORS chỉ cho phép frontend URL cụ thể

## 🎉 Hoàn thành!

**URLs của bạn:**
- Backend: `https://your-backend.vercel.app`
- Frontend: `https://your-frontend.vercel.app`
- API Docs: `https://your-backend.vercel.app/api-docs`

## 📝 Lưu lại thông tin

```
Backend URL: ___________________________________
Frontend URL: ___________________________________
MongoDB URI: ___________________________________
JWT Secret: ___________________________________
```

## ⚠️ Lưu ý quan trọng

### Không hoạt động trên Vercel:
- ❌ Socket.IO (WebSocket) - Cần deploy riêng
- ❌ File upload persistent - Cần dùng cloud storage (S3, Cloudinary)

### Giới hạn Free Tier:
- Function timeout: 10s
- Bandwidth: 100GB/tháng
- Invocations: 100GB-hours/tháng

## 🔄 Cập nhật sau này

Mỗi khi push code lên GitHub:
```bash
git add .
git commit -m "Your message"
git push origin main
```

Vercel sẽ tự động deploy lại cả Backend và Frontend.

## 🆘 Gặp lỗi?

Xem file `DEPLOYMENT_GUIDE.md` để biết chi tiết troubleshooting.

**Các lỗi thường gặp:**
1. CORS error → Kiểm tra `FRONTEND_URL` và redeploy backend
2. 500 error → Kiểm tra logs và MongoDB connection
3. Build failed → Kiểm tra environment variables
4. 404 on API → Kiểm tra `REACT_APP_BACKEND_URL`
