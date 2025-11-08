# 🚀 HƯỚNG DẪN DEPLOY NHANH LÊN VERCEL

## ⏱️ Thời gian: 30-40 phút

---

## BƯỚC 1: CHUẨN BỊ (10 phút)

### 1.1. Tạo tài khoản

✅ **Vercel**: https://vercel.com
- Đăng ký bằng GitHub (khuyến nghị)
- Miễn phí 100%

✅ **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- Đăng ký tài khoản mới
- Chọn FREE tier (M0 Sandbox)

### 1.2. Setup MongoDB Atlas

1. **Tạo Cluster**:
   - Click "Build a Database"
   - Chọn FREE (M0)
   - Chọn region gần Việt Nam (Singapore)
   - Tên cluster: tùy ý (vd: Cluster0)

2. **Tạo User**:
   - Username: `admin` (hoặc tùy chọn)
   - Password: Tạo password mạnh (lưu lại!)
   - Click "Create User"

3. **Whitelist IP**:
   - Click "Network Access"
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere"
   - IP: `0.0.0.0/0`
   - Click "Confirm"

4. **Lấy Connection String**:
   - Quay lại "Database"
   - Click "Connect"
   - Chọn "Connect your application"
   - Copy connection string:
   ```
   mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/
   ```
   - Thay `<password>` bằng password thực tế
   - Thêm tên database vào cuối: `/assignment-system`
   
   **Kết quả:**
   ```
   mongodb+srv://admin:MatKhauCuaBan@cluster0.xxxxx.mongodb.net/assignment-system
   ```

### 1.3. Push code lên GitHub

```bash
# Mở terminal trong thư mục dự án
git init
git add .
git commit -m "Initial commit for Vercel deployment"

# Tạo repo mới trên GitHub, sau đó:
git remote add origin https://github.com/username/ten-repo.git
git branch -M main
git push -u origin main
```

---

## BƯỚC 2: DEPLOY BACKEND (10 phút)

### 2.1. Import vào Vercel

1. Vào https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Click **"Import"** repository GitHub của bạn
4. Nếu chưa kết nối GitHub, click "Add GitHub Account"

### 2.2. Cấu hình Project

**Configure Project:**
- **Project Name**: `datn-backend` (hoặc tên khác)
- **Framework Preset**: **Other**
- **Root Directory**: Click **"Edit"** → Chọn **`backend`**
- **Build Command**: Để trống
- **Output Directory**: Để trống
- **Install Command**: `npm install`

### 2.3. Thêm Environment Variables

Click **"Environment Variables"**, thêm từng biến:

| Name | Value |
|------|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://admin:password@...` (từ bước 1.2) |
| `JWT_SECRET` | (xem bên dưới cách tạo) |
| `FRONTEND_URL` | `*` (tạm thời, sẽ cập nhật sau) |
| `PORT` | `4000` |

**Tạo JWT_SECRET:**

**Cách 1 - Dùng script (Windows):**
```powershell
# Chạy trong PowerShell
.\generate-jwt-secret.ps1
```

**Cách 2 - Tạo thủ công:**
```powershell
# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Copy kết quả và paste vào `JWT_SECRET`

### 2.4. Deploy

1. Click **"Deploy"**
2. Đợi 2-3 phút
3. Khi thấy 🎉 "Congratulations!" → Deploy thành công!
4. Click **"Continue to Dashboard"**
5. Copy URL backend (dạng: `https://datn-backend-xxx.vercel.app`)
6. **LƯU LẠI URL NÀY!**

### 2.5. Kiểm tra Backend

Mở trình duyệt, truy cập:
```
https://datn-backend-xxx.vercel.app/health
```

Nếu thấy:
```json
{"status":"ok"}
```
→ **Backend đã hoạt động! ✅**

---

## BƯỚC 3: DEPLOY FRONTEND (10 phút)

### 3.1. Import vào Vercel

1. Quay lại https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Chọn **cùng repository** GitHub
4. Click **"Import"**

### 3.2. Cấu hình Project

**Configure Project:**
- **Project Name**: `datn-frontend`
- **Framework Preset**: **Create React App**
- **Root Directory**: Click **"Edit"** → Chọn **`frontend`**
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

### 3.3. Thêm Environment Variables

| Name | Value |
|------|-------|
| `REACT_APP_BACKEND_URL` | `https://datn-backend-xxx.vercel.app` (URL từ bước 2.4) |
| `CI` | `false` |
| `DISABLE_ESLINT_PLUGIN` | `true` |

⚠️ **Chú ý**: `REACT_APP_BACKEND_URL` phải là URL backend đầy đủ, **KHÔNG** có dấu `/` ở cuối!

### 3.4. Deploy

1. Click **"Deploy"**
2. Đợi 3-5 phút (build React app lâu hơn)
3. Khi thấy 🎉 "Congratulations!" → Deploy thành công!
4. Copy URL frontend (dạng: `https://datn-frontend-xxx.vercel.app`)
5. **LƯU LẠI URL NÀY!**

---

## BƯỚC 4: CẬP NHẬT CORS (5 phút)

### 4.1. Cập nhật Backend

1. Vào https://vercel.com/dashboard
2. Click vào project **Backend** (`datn-backend`)
3. Click tab **"Settings"**
4. Click **"Environment Variables"**
5. Tìm biến `FRONTEND_URL`
6. Click **"Edit"**
7. Thay `*` bằng URL frontend: `https://datn-frontend-xxx.vercel.app`
8. Click **"Save"**

### 4.2. Redeploy Backend

1. Click tab **"Deployments"**
2. Click vào deployment **mới nhất** (ở trên cùng)
3. Click nút **"..."** (3 chấm) bên phải
4. Click **"Redeploy"**
5. Click **"Redeploy"** để confirm
6. Đợi 1-2 phút

---

## BƯỚC 5: KIỂM TRA (5 phút)

### 5.1. Kiểm tra Backend

✅ Health check:
```
https://datn-backend-xxx.vercel.app/health
```
→ Phải trả về `{"status":"ok"}`

✅ API Documentation:
```
https://datn-backend-xxx.vercel.app/api-docs
```
→ Phải hiện Swagger UI

### 5.2. Kiểm tra Frontend

1. Mở: `https://datn-frontend-xxx.vercel.app`
2. Nhấn **F12** mở Developer Console
3. Kiểm tra tab **Console**:
   - ❌ Không có lỗi màu đỏ về CORS
   - ❌ Không có lỗi "Failed to fetch"
   - ✅ Trang load bình thường

4. Thử đăng nhập:
   - Nếu login thành công → **HOÀN THÀNH! 🎉**

### 5.3. Kiểm tra Database

1. Vào MongoDB Atlas
2. Click "Browse Collections"
3. Kiểm tra có database `assignment-system` và các collections

---

## 🎉 HOÀN THÀNH!

### URLs của bạn:

```
Backend:  https://datn-backend-xxx.vercel.app
Frontend: https://datn-frontend-xxx.vercel.app
API Docs: https://datn-backend-xxx.vercel.app/api-docs
```

### Lưu lại thông tin:

```
MongoDB URI: mongodb+srv://...
JWT Secret: ...
Backend URL: ...
Frontend URL: ...
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

### Không hoạt động trên Vercel:

❌ **Socket.IO (Chat realtime)**
- Vercel serverless không hỗ trợ WebSocket
- Giải pháp: Deploy Socket.IO riêng trên Railway/Render

❌ **File Upload lưu trên server**
- Vercel không lưu file persistent
- Giải pháp: Dùng Cloudinary, AWS S3, hoặc Firebase Storage

### Giới hạn Free Tier:

- ⏱️ Function timeout: 10 giây
- 📊 Bandwidth: 100GB/tháng
- 🔢 Invocations: 100GB-hours/tháng

→ Đủ cho dự án học tập và demo!

---

## 🔄 CẬP NHẬT SAU NÀY

Mỗi khi sửa code:

```bash
git add .
git commit -m "Mô tả thay đổi"
git push origin main
```

→ Vercel tự động deploy lại cả Backend và Frontend!

---

## 🆘 GẶP LỖI?

### Lỗi 1: CORS Error

**Triệu chứng**: Console hiện lỗi "CORS policy"

**Giải pháp**:
1. Kiểm tra `FRONTEND_URL` trong Backend env vars
2. Đảm bảo đúng URL frontend
3. Redeploy Backend

### Lỗi 2: 500 Internal Server Error

**Triệu chứng**: API trả về lỗi 500

**Giải pháp**:
1. Vào Vercel Dashboard → Backend → Deployments
2. Click deployment mới nhất → "View Function Logs"
3. Kiểm tra lỗi:
   - MongoDB connection failed → Kiểm tra `MONGODB_URI`
   - Missing env var → Kiểm tra environment variables

### Lỗi 3: Build Failed

**Triệu chứng**: Deploy failed, không build được

**Giải pháp**:
1. Kiểm tra Build Logs trong Vercel
2. Frontend: Đảm bảo đã set `CI=false`
3. Backend: Kiểm tra syntax error trong code

### Lỗi 4: Cannot connect to MongoDB

**Triệu chứng**: Backend logs hiện "MongoDB connection error"

**Giải pháp**:
1. Vào MongoDB Atlas → Network Access
2. Đảm bảo có IP `0.0.0.0/0`
3. Kiểm tra username/password trong connection string
4. Kiểm tra database name trong connection string

### Lỗi 5: 404 Not Found

**Triệu chứng**: API calls trả về 404

**Giải pháp**:
1. Kiểm tra `REACT_APP_BACKEND_URL` trong Frontend
2. Đảm bảo URL đúng và không có `/` ở cuối
3. Redeploy Frontend

---

## 📚 TÀI LIỆU THAM KHẢO

- **Chi tiết đầy đủ**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Checklist**: [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)
- **Backend**: [backend/VERCEL_DEPLOY.md](./backend/VERCEL_DEPLOY.md)
- **Frontend**: [frontend/VERCEL_DEPLOY.md](./frontend/VERCEL_DEPLOY.md)

---

## 💡 MẸO HAY

### 1. Xem Logs Realtime

```bash
# Cài Vercel CLI
npm install -g vercel

# Login
vercel login

# Xem logs
vercel logs datn-backend-xxx.vercel.app --follow
```

### 2. Custom Domain (Miễn phí)

1. Mua domain (hoặc dùng Freenom miễn phí)
2. Vào Vercel → Project → Settings → Domains
3. Add domain và config DNS
4. Cập nhật `FRONTEND_URL` trong Backend

### 3. Environment cho nhiều môi trường

Vercel hỗ trợ 3 môi trường:
- **Production**: Branch `main`
- **Preview**: Pull requests
- **Development**: Branch khác

---

**Chúc bạn deploy thành công! 🚀**

Nếu gặp vấn đề, đọc file [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) để biết thêm chi tiết!
