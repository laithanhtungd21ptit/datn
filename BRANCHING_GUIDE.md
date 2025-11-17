# Hướng Dẫn Làm Việc Với Git Branches

## 📋 Các Branch Hiện Có

| Branch | Owner | Mục Đích |
|--------|-------|---------|
| **main** | Chung | Nhánh chính, production-ready |
| **tungbe** | Người 1 (bibadao8) | Phát triển tính năng của Người 1 |
| **tungfe** | Người 2 (laithanhtungd21ptit) | Phát triển tính năng của Người 2 |

---

## 🚀 Hướng Dẫn Cơ Bản

### 1. Clone Repository (Lần Đầu)
```bash
git clone https://github.com/bibadao8/DATN2025.git
cd DATN2025
```

### 2. Lấy Tất Cả Branches
```bash
git fetch origin
```

### 3. Chuyển Đổi Branch
```bash
# Xem branch hiện tại
git branch

# Chuyển sang branch khác
git checkout main           # Chuyển sang main
git checkout tungbe         # Chuyển sang tungbe
git checkout tungfe         # Chuyển sang tungfe

# Hoặc tạo và chuyển cùng lúc (nếu là remote)
git checkout -b tungfe origin/tungfe
```

---

## 👨‍💻 Quy Trình Làm Việc Cho Từng Người

### **Người 1 (bibadao8) - Branch: tungbe**

1. **Lấy code mới nhất từ GitHub**
   ```bash
   git checkout tungbe
   git pull origin tungbe
   ```

2. **Tạo feature hoặc sửa bug**
   ```bash
   git checkout -b feature/tên-tính-năng
   # ... code ...
   ```

3. **Commit và push**
   ```bash
   git add .
   git commit -m "Mô tả thay đổi"
   git push origin feature/tên-tính-năng
   ```

4. **Merge vào tungbe (tạo Pull Request hoặc merge cục bộ)**
   ```bash
   git checkout tungbe
   git merge feature/tên-tính-năng
   git push origin tungbe
   ```

5. **Khi xong, merge vào main (sau khi kiểm tra)**
   ```bash
   git checkout main
   git pull origin main
   git merge tungbe
   git push origin main
   ```

### **Người 2 (laithanhtungd21ptit) - Branch: tungfe**

Làm tương tự như Người 1, nhưng thay `tungbe` bằng `tungfe`:

```bash
git checkout tungfe
git pull origin tungfe
# ... code ...
git add .
git commit -m "Mô tả thay đổi"
git push origin tungfe
```

### **Người 3 (hoặc ai xem xét)**

```bash
git checkout main
git pull origin main  # Luôn cập nhật main
```

---

## 🔄 Quy Trình Merge Vào Main

### **Quy Tắc Chung:**
- Chỉ merge vào `main` khi code **đã test, không lỗi**
- Luôn pull `main` mới nhất trước khi merge
- Tránh confict bằng cách merge thường xuyên

### **Các Bước:**

1. **Cập nhật main**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Merge từ branch cá nhân**
   ```bash
   git merge tungbe  # hoặc tungfe
   ```

3. **Giải quyết confict (nếu có)**
   ```bash
   # Edit file confict
   git add .
   git commit -m "Resolve merge conflicts"
   ```

4. **Push lên main**
   ```bash
   git push origin main
   ```

---

## ⚠️ Tránh Confict

### **Cách Tránh:**
1. **Pull thường xuyên**
   ```bash
   git pull origin main
   ```

2. **Merge từ main vào branch cá nhân (nếu main có update)**
   ```bash
   git checkout tungbe
   git pull origin main
   # Giải quyết confict nếu có
   git push origin tungbe
   ```

3. **Không chỉnh sửa file cùng lúc**
   - Phân chia công việc rõ ràng (ai làm file nào)

---

## 📝 Lệnh Hữu Ích

```bash
# Xem commit log
git log --oneline

# Xem status
git status

# Xem thay đổi (chưa stage)
git diff

# Xem thay đổi (đã stage)
git diff --cached

# Hủy thay đổi cục bộ (cẩn thận!)
git checkout -- tên-file

# Xóa branch cục bộ
git branch -d tên-branch

# Lấy thay đổi từ remote
git fetch origin
```

---

## 🎯 Best Practices

✅ **Nên làm:**
- Commit thường xuyên (mỗi feature nhỏ = 1 commit)
- Viết message commit rõ ràng
- Pull trước khi push
- Test trước khi merge vào main

❌ **Không nên làm:**
- Push trực tiếp vào main
- Commit file lớn hoặc config cá nhân
- Merge mà không test
- Quên pull origin trước khi làm việc

---

## 🆘 Cần Giúp?

**Lệnh cơ bản để kiểm tra:**
```bash
# Status hiện tại
git status

# Xem branch và tracking
git branch -vv

# Xem commit cuối cùng
git log -1
```

Nếu có vấn đề, liên hệ trực tiếp hoặc tạo issue trên GitHub.
