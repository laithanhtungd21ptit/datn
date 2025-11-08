# Frontend Deployment trên Vercel

## ⚡ Quick Start

### 1. Cấu hình Environment Variables

Trong Vercel Dashboard, thêm các biến sau:

```env
REACT_APP_BACKEND_URL=https://your-backend.vercel.app
CI=false
DISABLE_ESLINT_PLUGIN=true
```

### 2. Deploy Settings

- **Framework Preset**: Create React App
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

### 3. Sau khi deploy

1. Copy URL frontend: `https://your-frontend.vercel.app`
2. Quay lại Backend project
3. Cập nhật `FRONTEND_URL` trong Backend environment variables
4. Redeploy Backend

## 📝 Lưu ý

### Build Configuration

File `package.json` đã được cấu hình:

```json
"build": "DISABLE_ESLINT_PLUGIN=true CI=false react-scripts build"
```

Nhưng trên Vercel cần set qua Environment Variables để override.

### API URL

Frontend sử dụng `REACT_APP_BACKEND_URL` từ environment variables:

```javascript
const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
```

### CORS

Đảm bảo Backend đã whitelist frontend URL trong CORS configuration.

## 🔧 Troubleshooting

### Lỗi: Build failed due to ESLint warnings

✅ **Giải pháp**: Set `CI=false` và `DISABLE_ESLINT_PLUGIN=true`

### Lỗi: API calls failed (CORS)

**Kiểm tra**:
1. `REACT_APP_BACKEND_URL` đúng URL backend
2. Backend đã set `FRONTEND_URL` đúng
3. Backend đã redeploy sau khi thay đổi env vars

### Lỗi: 404 on refresh

**Nguyên nhân**: React Router cần server-side routing

✅ **Giải pháp**: Vercel tự động handle với Create React App

## 🚀 Custom Domain (Optional)

1. Vào Vercel Dashboard → Project → Settings → Domains
2. Add custom domain
3. Follow DNS configuration instructions
4. Cập nhật `FRONTEND_URL` trong Backend

## 📊 Performance

Vercel tự động optimize:
- ✅ Static file caching
- ✅ CDN distribution
- ✅ Automatic HTTPS
- ✅ Gzip compression
- ✅ Image optimization

## 🔄 Redeploy

Auto deploy khi push lên GitHub:

```bash
git add .
git commit -m "Update"
git push origin main
```
