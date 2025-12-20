from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import cv2
import numpy as np
from PIL import Image
import io
import logging
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="YOLO Object Detection Service",
    description="Dual-model object detection: COCO + Custom models",
    version="1.0.0"
)

# CORS - Allow backend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong production nên chỉ định cụ thể
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model paths
CUSTOM_MODEL_PATH = os.getenv("CUSTOM_MODEL_PATH", "./models/best.pt")
USE_DUAL_MODEL = os.getenv("USE_DUAL_MODEL", "true").lower() == "true"
# COCO model size: n (nano), s (small), m (medium), l (large), x (xlarge)
# Default: 'm' (medium) - cân bằng giữa tốc độ và độ chính xác
COCO_MODEL_SIZE = os.getenv("COCO_MODEL_SIZE", "m").lower()

# Global models
coco_model = None
custom_model = None
coco_model_size = None  # Track model size

# Prohibited items configuration
PROHIBITED_ITEMS = {
    # COCO classes (common prohibited items for exam monitoring)
    'cell phone': {'severity': 'high', 'name_vi': 'Điện thoại'},
    'book': {'severity': 'medium', 'name_vi': 'Sách'},
    'laptop': {'severity': 'high', 'name_vi': 'Laptop'},
    'keyboard': {'severity': 'medium', 'name_vi': 'Bàn phím'},
    # Bỏ 'mouse' - không cần thiết
    
    # Thêm các classes hữu ích cho phòng thi
    'backpack': {'severity': 'medium', 'name_vi': 'Ba lô'},
    'handbag': {'severity': 'medium', 'name_vi': 'Túi xách'},
    'umbrella': {'severity': 'low', 'name_vi': 'Ô'},
    'remote': {'severity': 'medium', 'name_vi': 'Điều khiển'},
    'tv': {'severity': 'high', 'name_vi': 'TV'},
    'clock': {'severity': 'low', 'name_vi': 'Đồng hồ'},
    'scissors': {'severity': 'medium', 'name_vi': 'Kéo'},
    
    # Custom classes (your trained model)
    'kinh_mat': {'severity': 'low', 'name_vi': 'Kính mắt'},
    'but_bi': {'severity': 'low', 'name_vi': 'Bút bi'},
    'may_tinh': {'severity': 'medium', 'name_vi': 'Máy tính'},
    'chuot': {'severity': 'low', 'name_vi': 'Chuột'},
}

# Allowed items (won't trigger violation)
# Có thể thêm 'bottle', 'cup' nếu muốn cho phép chai nước, cốc
ALLOWED_ITEMS = []


@app.on_event("startup")
async def load_models():
    """Load YOLO models khi service start"""
    global coco_model, custom_model, coco_model_size
    
    try:
        # Load COCO pre-trained model (80 classes)
        if USE_DUAL_MODEL:
            # Validate model size
            valid_sizes = ['n', 's', 'm', 'l', 'x']
            if COCO_MODEL_SIZE not in valid_sizes:
                logger.warning(f"Invalid COCO_MODEL_SIZE '{COCO_MODEL_SIZE}', using 'm' (medium)")
                model_size = 'm'
            else:
                model_size = COCO_MODEL_SIZE
            
            model_name = f'yolov8{model_size}.pt'
            coco_model_size = model_size
            
            logger.info(f"Loading COCO pre-trained model ({model_name})...")
            logger.info(f"Model size: {model_size.upper()} - "
                       f"{'Nano (fastest)' if model_size == 'n' else ''}"
                       f"{'Small' if model_size == 's' else ''}"
                       f"{'Medium (balanced)' if model_size == 'm' else ''}"
                       f"{'Large (accurate)' if model_size == 'l' else ''}"
                       f"{'XLarge (most accurate)' if model_size == 'x' else ''}")
            
            coco_model = YOLO(model_name)  # Auto-download if not exists
            logger.info(f"✅ COCO model loaded! Classes: {len(coco_model.names)}")
        else:
            logger.info("Dual model disabled, skipping COCO model...")
        
        # Load custom model (your 4 classes)
        logger.info(f"Loading custom model from {CUSTOM_MODEL_PATH}...")
        custom_model = YOLO(CUSTOM_MODEL_PATH)
        logger.info(f"✅ Custom model loaded! Classes: {custom_model.names}")
        
        logger.info("🚀 All models ready!")
        
    except Exception as e:
        logger.error(f"❌ Failed to load models: {e}")
        raise


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "YOLO Object Detection",
        "version": "1.0.0",
        "models": {
            "coco_loaded": coco_model is not None,
            "custom_loaded": custom_model is not None,
            "dual_mode": USE_DUAL_MODEL
        }
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    if custom_model is None:
        raise HTTPException(status_code=503, detail="Custom model not loaded")
    
    health_data = {
        "status": "healthy",
        "models": {
            "custom": {
                "loaded": True,
                "path": CUSTOM_MODEL_PATH,
                "classes": custom_model.names,
                "num_classes": len(custom_model.names)
            }
        },
        "prohibited_items": list(PROHIBITED_ITEMS.keys()),
        "allowed_items": ALLOWED_ITEMS
    }
    
    if USE_DUAL_MODEL and coco_model:
        health_data["models"]["coco"] = {
            "loaded": True,
            "model_size": coco_model_size,
            "model_file": f"yolov8{coco_model_size}.pt",
            "classes": list(coco_model.names.values()),
            "num_classes": len(coco_model.names)
        }
    
    return health_data


@app.post("/detect")
async def detect_objects(
    file: UploadFile = File(...),
    conf_threshold: float = 0.6,
    use_coco: bool = True
):
    """
    Detect objects trong image với dual model system
    
    Args:
        file: Image file
        conf_threshold: Confidence threshold (default 0.5)
        use_coco: Use COCO model hay không (default True)
    
    Returns:
        {
            "success": true,
            "detections": [
                {
                    "class": "cell phone",
                    "class_vi": "Điện thoại",
                    "confidence": 0.95,
                    "bbox": [x1, y1, x2, y2],
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
    """
    if custom_model is None:
        raise HTTPException(status_code=503, detail="Custom model not loaded")
    
    try:
        # Read image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        logger.info(f"Processing image: {file.filename}, size: {img.shape}")
        
        all_detections = []
        
        # === RUN MODEL 1: COCO (if enabled) ===
        if USE_DUAL_MODEL and use_coco and coco_model:
            coco_detections = run_coco_detection(img, conf_threshold)
            all_detections.extend(coco_detections)
            logger.info(f"COCO detections: {len(coco_detections)}")
        
        # === RUN MODEL 2: CUSTOM ===
        custom_detections = run_custom_detection(img, conf_threshold)
        all_detections.extend(custom_detections)
        logger.info(f"Custom detections: {len(custom_detections)}")
        
        # === MERGE & FILTER ===
        # Remove overlapping detections (NMS)
        filtered_detections = remove_overlapping_detections(all_detections)
        logger.info(f"After NMS: {len(filtered_detections)} detections")
        
        # Filter by size - remove objects that are too small (< 1% of image area)
        size_filtered_detections = filter_by_size(filtered_detections, img)
        logger.info(f"After size filter: {len(size_filtered_detections)} detections")
        
        # Filter false positives for may_tinh (background misclassification)
        may_tinh_filtered = filter_may_tinh_false_positives(size_filtered_detections, img)
        logger.info(f"After may_tinh filter: {len(may_tinh_filtered)} detections")
        
        # Analyze prohibited items
        result = analyze_detections(may_tinh_filtered)
        
        logger.info(
            f"✅ Detection complete: {result['count']} objects, "
            f"{result['prohibited_count']} prohibited"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Detection error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def run_coco_detection(img: np.ndarray, conf_threshold: float) -> List[Dict]:
    """Run COCO model detection"""
    detections = []
    
    # Chỉ quan tâm một số classes cụ thể từ COCO (bỏ 'mouse', thêm các classes hữu ích)
    target_classes = [
        # Classes cơ bản
        'cell phone', 'book', 'laptop', 'keyboard',
        # Classes bổ sung cho phòng thi
        'backpack', 'handbag', 'umbrella', 'remote', 'tv', 'clock', 'scissors'
    ]
    
    try:
        results = coco_model(img, conf=conf_threshold, verbose=False)
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                cls = int(box.cls[0])
                class_name = coco_model.names[cls]
                
                # Chỉ lấy classes quan tâm
                if class_name in target_classes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    
                    detection = {
                        "class": class_name,
                        "class_vi": PROHIBITED_ITEMS.get(class_name, {}).get('name_vi', class_name),
                        "confidence": round(conf, 3),
                        "bbox": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
                        "source": "coco",
                        "severity": PROHIBITED_ITEMS.get(class_name, {}).get('severity', 'unknown')
                    }
                    
                    detections.append(detection)
        
    except Exception as e:
        logger.error(f"COCO detection error: {e}")
    
    return detections


def run_custom_detection(img: np.ndarray, conf_threshold: float) -> List[Dict]:
    """Run custom model detection"""
    detections = []
    
    try:
        results = custom_model(img, conf=conf_threshold, verbose=False)
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                cls = int(box.cls[0])
                class_name = custom_model.names[cls]
                
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                
                detection = {
                    "class": class_name,
                    "class_vi": PROHIBITED_ITEMS.get(class_name, {}).get('name_vi', class_name),
                    "confidence": round(conf, 3),
                    "bbox": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
                    "source": "custom",
                    "severity": PROHIBITED_ITEMS.get(class_name, {}).get('severity', 'unknown')
                }
                
                detections.append(detection)
        
    except Exception as e:
        logger.error(f"Custom detection error: {e}")
    
    return detections


def remove_overlapping_detections(
    detections: List[Dict],
    iou_threshold: float = 0.5
) -> List[Dict]:
    """
    Remove duplicate detections bằng Non-Maximum Suppression (NMS)
    
    Args:
        detections: List of detections
        iou_threshold: IoU threshold for considering overlap
    
    Returns:
        Filtered list of detections
    """
    if len(detections) <= 1:
        return detections
    
    # Sort by confidence (descending)
    detections = sorted(detections, key=lambda x: x['confidence'], reverse=True)
    
    keep = []
    
    for i, det1 in enumerate(detections):
        should_keep = True
        
        for det2 in keep:
            # Calculate IoU
            iou = calculate_iou(det1['bbox'], det2['bbox'])
            
            # If overlap is high, keep the one with higher confidence (already kept)
            if iou > iou_threshold:
                should_keep = False
                logger.debug(
                    f"Removing duplicate: {det1['class']} (IoU: {iou:.2f} "
                    f"with {det2['class']})"
                )
                break
        
        if should_keep:
            keep.append(det1)
    
    return keep


def calculate_iou(box1: List[float], box2: List[float]) -> float:
    """
    Calculate Intersection over Union (IoU) between two bounding boxes
    
    Args:
        box1: [x1, y1, x2, y2]
        box2: [x1, y1, x2, y2]
    
    Returns:
        IoU value (0 to 1)
    """
    x1_1, y1_1, x2_1, y2_1 = box1
    x1_2, y1_2, x2_2, y2_2 = box2
    
    # Calculate intersection area
    x1_i = max(x1_1, x1_2)
    y1_i = max(y1_1, y1_2)
    x2_i = min(x2_1, x2_2)
    y2_i = min(y2_1, y2_2)
    
    if x2_i < x1_i or y2_i < y1_i:
        return 0.0
    
    intersection = (x2_i - x1_i) * (y2_i - y1_i)
    
    # Calculate union area
    area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
    area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
    union = area1 + area2 - intersection
    
    return intersection / union if union > 0 else 0.0


def filter_by_size(
    detections: List[Dict],
    img: np.ndarray,
    min_area_ratio: float = 0.01
) -> List[Dict]:
    """
    Filter out objects that are too small (< min_area_ratio of image area)
    
    Args:
        detections: List of detections
        img: Image array (for calculating total area)
        min_area_ratio: Minimum area ratio (default 1% of image)
    
    Returns:
        Filtered list of detections
    """
    if len(detections) == 0:
        return detections
    
    img_area = img.shape[0] * img.shape[1]
    min_area = img_area * min_area_ratio
    
    filtered = []
    removed_count = 0
    
    for det in detections:
        bbox = det['bbox']
        x1, y1, x2, y2 = bbox
        
        # Calculate bounding box area
        bbox_area = (x2 - x1) * (y2 - y1)
        
        # Keep if area is large enough
        if bbox_area >= min_area:
            filtered.append(det)
        else:
            removed_count += 1
            logger.debug(
                f"Removed small object: {det['class']} "
                f"(area: {bbox_area:.0f} < min: {min_area:.0f})"
            )
    
    if removed_count > 0:
        logger.info(f"Size filter removed {removed_count} objects that were too small")
    
    return filtered


def filter_may_tinh_false_positives(
    detections: List[Dict],
    img: np.ndarray,
    min_confidence: float = 0.75,
    max_area_ratio: float = 0.5,
    edge_margin_ratio: float = 0.05
) -> List[Dict]:
    """
    Filter false positives cho class 'may_tinh' (background thường bị nhầm)
    
    Args:
        detections: List of detections
        img: Image array
        min_confidence: Minimum confidence cho may_tinh (default 0.75, cao hơn threshold chung)
        max_area_ratio: Maximum area ratio (background thường chiếm > 50% ảnh)
        edge_margin_ratio: Margin ở rìa ảnh (background thường ở rìa)
    
    Returns:
        Filtered list of detections
    """
    if len(detections) == 0:
        return detections
    
    img_height, img_width = img.shape[:2]
    img_area = img_height * img_width
    edge_margin_x = img_width * edge_margin_ratio
    edge_margin_y = img_height * edge_margin_ratio
    max_area = img_area * max_area_ratio
    
    filtered = []
    removed_count = 0
    
    for det in detections:
        # Chỉ filter class 'may_tinh'
        if det['class'] != 'may_tinh':
            filtered.append(det)
            continue
        
        bbox = det['bbox']
        x1, y1, x2, y2 = bbox
        conf = det['confidence']
        
        # Calculate bounding box properties
        bbox_area = (x2 - x1) * (y2 - y1)
        bbox_width = x2 - x1
        bbox_height = y2 - y1
        aspect_ratio = bbox_width / bbox_height if bbox_height > 0 else 0
        
        # Check if detection is at image edges (background characteristic)
        at_left_edge = x1 < edge_margin_x
        at_right_edge = x2 > (img_width - edge_margin_x)
        at_top_edge = y1 < edge_margin_y
        at_bottom_edge = y2 > (img_height - edge_margin_y)
        at_edges = (at_left_edge or at_right_edge) and (at_top_edge or at_bottom_edge)
        
        # Reasonable aspect ratio for a calculator (usually 1.5:1 to 3:1)
        reasonable_aspect = 1.0 <= aspect_ratio <= 4.0
        
        # Filter criteria:
        # 1. Confidence quá thấp
        # 2. Quá lớn (có thể là background)
        # 3. Ở rìa ảnh và quá lớn
        # 4. Aspect ratio không hợp lý
        
        should_remove = False
        reason = ""
        
        if conf < min_confidence:
            should_remove = True
            reason = f"confidence too low ({conf:.3f} < {min_confidence})"
        elif bbox_area > max_area:
            should_remove = True
            reason = f"too large (area: {bbox_area/img_area*100:.1f}% > {max_area_ratio*100:.1f}%)"
        elif at_edges and bbox_area > img_area * 0.3:
            should_remove = True
            reason = f"at edges and large (likely background)"
        elif not reasonable_aspect:
            should_remove = True
            reason = f"unreasonable aspect ratio ({aspect_ratio:.2f})"
        
        if should_remove:
            removed_count += 1
            logger.info(
                f"Removed may_tinh false positive: {reason}, "
                f"bbox: [{x1:.0f}, {y1:.0f}, {x2:.0f}, {y2:.0f}], "
                f"conf: {conf:.3f}"
            )
        else:
            filtered.append(det)
    
    if removed_count > 0:
        logger.info(f"may_tinh filter removed {removed_count} false positives")
    
    return filtered


def analyze_detections(detections: List[Dict]) -> Dict:
    """
    Analyze detections và tạo summary report
    
    Returns:
        {
            "success": True,
            "detections": [...],
            "count": 3,
            "has_prohibited_items": True,
            "prohibited_count": 2,
            "summary": {"high": 1, "medium": 1, "low": 0}
        }
    """
    # Filter out allowed items
    filtered = [
        det for det in detections
        if det['class'] not in ALLOWED_ITEMS
    ]
    
    # Count prohibited items by severity
    summary = {"high": 0, "medium": 0, "low": 0}
    prohibited_count = 0
    
    for det in filtered:
        if det['class'] in PROHIBITED_ITEMS:
            severity = PROHIBITED_ITEMS[det['class']]['severity']
            if severity in summary:
                summary[severity] += 1
                prohibited_count += 1
    
    return {
        "success": True,
        "detections": filtered,
        "count": len(filtered),
        "has_prohibited_items": prohibited_count > 0,
        "prohibited_count": prohibited_count,
        "summary": summary,
        "timestamp": None  # Backend sẽ add timestamp
    }


@app.post("/detect-batch")
async def detect_batch(files: List[UploadFile] = File(...)):
    """
    Detect objects trong nhiều images (batch processing)
    Useful cho testing hoặc bulk processing
    """
    results = []
    
    for file in files:
        try:
            result = await detect_objects(file)
            results.append({
                "filename": file.filename,
                "result": result
            })
        except Exception as e:
            logger.error(f"Batch detection error for {file.filename}: {e}")
            results.append({
                "filename": file.filename,
                "error": str(e)
            })
    
    return {
        "success": True,
        "results": results,
        "total": len(files),
        "processed": len(results)
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)

