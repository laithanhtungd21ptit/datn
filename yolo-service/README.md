# YOLO Object Detection Service

## 📋 Overview

Dual-model object detection service sử dụng:
- **COCO Model (yolov8n.pt)**: 80 classes pre-trained
- **Custom Model (best.pt)**: 4 classes của bạn (bật lửa, máy tính, kính mắt, bút bi)

## 🚀 Setup Instructions

### 1. Install Python Dependencies

```bash
cd yolo-service

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Mac/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

### 2. Add Your Trained Model

Copy your trained model file `best.pt` vào thư mục `models/`:

```bash
# Copy từ nơi bạn download
cp /path/to/your/best.pt ./models/best.pt
```

### 3. Create .env File

Tạo file `.env` trong thư mục `yolo-service/`:

```env
# YOLO Service Configuration

# Custom model path (your trained model)
CUSTOM_MODEL_PATH=./models/best.pt

# Enable/disable dual model system
# true = Use both COCO + Custom models
# false = Only use Custom model
USE_DUAL_MODEL=true

# Server configuration
PORT=8001
LOG_LEVEL=INFO
```

### 4. Run Service

```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Run service
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Hoặc:

```bash
python app/main.py
```

### 5. Verify Service

Open browser: http://localhost:8001

Expected output:
```json
{
  "status": "running",
  "service": "YOLO Object Detection",
  "version": "1.0.0",
  "models": {
    "coco_loaded": true,
    "custom_loaded": true,
    "dual_mode": true
  }
}
```

Health check: http://localhost:8001/health

## 📝 API Endpoints

### GET /
Health check

### GET /health
Detailed health check với model info

### POST /detect
Detect objects trong một image

**Request:**
```bash
curl -X POST "http://localhost:8001/detect" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-image.jpg"
```

**Response:**
```json
{
  "success": true,
  "detections": [
    {
      "class": "cell phone",
      "class_vi": "Điện thoại",
      "confidence": 0.952,
      "bbox": [120.5, 200.3, 350.8, 480.2],
      "source": "coco",
      "severity": "high"
    }
  ],
  "count": 1,
  "has_prohibited_items": true,
  "prohibited_count": 1,
  "summary": {
    "high": 1,
    "medium": 0,
    "low": 0
  }
}
```

## 🎯 Prohibited Items Configuration

File `app/main.py` line ~45:

```python
PROHIBITED_ITEMS = {
    # COCO classes
    'cell phone': {'severity': 'high', 'name_vi': 'Điện thoại'},
    'book': {'severity': 'medium', 'name_vi': 'Sách'},
    'laptop': {'severity': 'high', 'name_vi': 'Laptop'},
    
    # Custom classes
    'bat_lua': {'severity': 'high', 'name_vi': 'Bật lửa'},
    'may_tinh': {'severity': 'medium', 'name_vi': 'Máy tính'},
    'but_bi': {'severity': 'low', 'name_vi': 'Bút bi'},
}

ALLOWED_ITEMS = ['kinh_mat']  # Glasses are allowed
```

Bạn có thể customize danh sách này!

## 🔧 Troubleshooting

### Model không load được

**Error:** `FileNotFoundError: models/best.pt`

**Fix:** Đảm bảo file `best.pt` đã được copy vào `yolo-service/models/`

### Port 8001 đã được sử dụng

**Error:** `OSError: [Errno 48] Address already in use`

**Fix:** Đổi port trong `.env`:
```env
PORT=8002
```

### COCO model download lỗi

**Error:** `Failed to download yolov8n.pt`

**Fix:** Download manual từ: https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt

Sau đó đặt vào thư mục home: `~/.ultralytics/`

## 📊 Performance

- **COCO Model**: ~10-15ms per frame
- **Custom Model**: ~8-12ms per frame
- **Dual Model**: ~20-30ms per frame
- **Memory**: ~500MB (both models loaded)

## 🐳 Docker (Optional)

```dockerfile
FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY models/ ./models/

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

Build & Run:
```bash
docker build -t yolo-service .
docker run -p 8001:8001 yolo-service
```

