import { apiRequest } from '../api/client.js';

/**
 * Object Detection Service
 * Capture frames từ camera và gửi lên backend để detect prohibited objects
 */
class ObjectDetectionService {
  constructor() {
    this.isRunning = false;
    this.detectionInterval = null;
    this.videoElement = null;
    this.canvas = document.createElement('canvas');
    this.sessionId = null;
    this.onDetectionCallback = null;
    this.onErrorCallback = null;
    
    // Configuration
    this.config = {
      intervalMs: 4000, // Base interval: 4 giây
      framesPerInterval: 2, // Capture 2 frame mỗi interval
      frameDelayMs: 2000, // Delay giữa các frame: 2 giây
      confThreshold: 0.6,
      useCoco: true,
      maxRetries: 3,
      // Adaptive interval settings
      adaptiveInterval: true,
      minIntervalMs: 2000, // Tối thiểu 2 giây khi detect prohibited items
      maxIntervalMs: 4000, // Tối đa 4 giây khi không có gì
      // Debouncing settings
      debounceEnabled: true,
      debounceWindowMs: 5000, // 5 giây window để group cùng object
    };
    
    // Stats
    this.stats = {
      totalChecks: 0,
      violationsDetected: 0,
      lastCheckTime: null,
      lastViolationTime: null,
      errors: 0,
      framesCaptured: 0,
      adaptiveIntervalActive: false
    };
    
    // Debouncing: Track recent detections để tránh duplicate violations
    this.recentDetections = new Map(); // Map<objectClass, lastDetectionTime>
    
    // Pending captures trong current interval
    this.pendingCaptures = [];
  }

  /**
   * Bắt đầu object detection
   * @param {HTMLVideoElement} videoElement - Video element từ camera
   * @param {Object} options - Configuration options
   */
  async start(videoElement, options = {}) {
    if (this.isRunning) {
      console.warn('Object detection already running');
      return;
    }

    const {
      sessionId,
      intervalMs = 4000,
      framesPerInterval = 2,
      frameDelayMs = 2000,
      confThreshold = 0.6,
      useCoco = true,
      onDetection = null,
      onError = null,
      adaptiveInterval = true
    } = options;

    this.videoElement = videoElement;
    this.sessionId = sessionId;
    this.onDetectionCallback = onDetection;
    this.onErrorCallback = onError;
    this.config.intervalMs = intervalMs;
    this.config.framesPerInterval = framesPerInterval;
    this.config.frameDelayMs = frameDelayMs;
    this.config.confThreshold = confThreshold;
    this.config.useCoco = useCoco;
    this.config.adaptiveInterval = adaptiveInterval;
    this.isRunning = true;

    console.log('🔍 Starting object detection (optimized)...', {
      sessionId,
      intervalMs,
      framesPerInterval,
      frameDelayMs,
      confThreshold,
      useCoco,
      adaptiveInterval
    });

    // Reset stats và debouncing
    this.stats.totalChecks = 0;
    this.stats.violationsDetected = 0;
    this.stats.errors = 0;
    this.stats.framesCaptured = 0;
    this.stats.adaptiveIntervalActive = false;
    this.recentDetections.clear();
    this.pendingCaptures = [];

    // Chạy detection định kỳ với multi-frame capture
    this.detectionInterval = setInterval(() => {
      this.captureMultipleFrames();
    }, this.config.intervalMs);

    // Chạy ngay lần đầu
    await this.captureMultipleFrames();
  }

  /**
   * Dừng object detection
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    console.log('🛑 Object detection stopped', this.getStats());
  }

  /**
   * Capture nhiều frame trong một interval để tăng khả năng detect
   */
  async captureMultipleFrames() {
    if (!this.isRunning || !this.videoElement) {
      return;
    }

    const { framesPerInterval, frameDelayMs } = this.config;
    const results = [];

    // Capture nhiều frame cách nhau frameDelayMs
    for (let i = 0; i < framesPerInterval; i++) {
      if (!this.isRunning) break;

      // Delay giữa các frame (trừ frame đầu tiên)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, frameDelayMs));
      }

      const result = await this.captureAndDetect();
      if (result) {
        results.push(result);
      }
    }

    // Xử lý kết quả tổng hợp
    if (results.length > 0) {
      this.processMultipleResults(results);
    }
  }

  /**
   * Xử lý kết quả từ nhiều frame để tránh duplicate và tối ưu
   */
  processMultipleResults(results) {
    // Merge tất cả detections từ các frame
    const allDetections = [];
    let hasProhibitedItems = false;
    let prohibitedCount = 0;

    results.forEach(result => {
      if (result.detections) {
        allDetections.push(...result.detections);
      }
      if (result.has_prohibited_items) {
        hasProhibitedItems = true;
        prohibitedCount += result.prohibited_count || 0;
      }
    });

    // Remove duplicates dựa trên class và debouncing
    const uniqueDetections = this.deduplicateDetections(allDetections);

    // Tạo merged result
    const mergedResult = {
      success: true,
      detections: uniqueDetections,
      count: uniqueDetections.length,
      has_prohibited_items: hasProhibitedItems,
      prohibited_count: uniqueDetections.filter(d => 
        d.severity && d.severity !== 'allowed' && d.severity !== 'unknown'
      ).length,
      summary: this.calculateSummary(uniqueDetections),
      frames_processed: results.length
    };

    // Callback với merged result
    if (mergedResult.count > 0 && this.onDetectionCallback) {
      this.onDetectionCallback(mergedResult);
    }

    // Adaptive interval: Điều chỉnh interval dựa trên kết quả
    if (this.config.adaptiveInterval) {
      this.adjustInterval(hasProhibitedItems);
    }

    // Log kết quả
    if (mergedResult.count > 0) {
      console.log(`🔍 Objects detected (${results.length} frames):`, {
        total: mergedResult.count,
        prohibited: mergedResult.prohibited_count,
        items: mergedResult.detections.map(d => d.class_vi).join(', ')
      });
    }
  }

  /**
   * Loại bỏ duplicate detections dựa trên debouncing
   */
  deduplicateDetections(detections) {
    if (!this.config.debounceEnabled) {
      return detections;
    }

    const now = Date.now();
    const unique = [];
    const seen = new Set();

    detections.forEach(det => {
      const key = `${det.class}_${det.severity}`;
      const lastSeen = this.recentDetections.get(key);

      // Nếu chưa thấy hoặc đã quá debounce window
      if (!lastSeen || (now - lastSeen) > this.config.debounceWindowMs) {
        if (!seen.has(key)) {
          unique.push(det);
          seen.add(key);
          this.recentDetections.set(key, now);
        }
      }
    });

    // Cleanup old entries
    this.recentDetections.forEach((time, key) => {
      if (now - time > this.config.debounceWindowMs * 2) {
        this.recentDetections.delete(key);
      }
    });

    return unique;
  }

  /**
   * Tính summary từ detections
   */
  calculateSummary(detections) {
    const summary = { high: 0, medium: 0, low: 0 };
    detections.forEach(det => {
      if (det.severity && summary.hasOwnProperty(det.severity)) {
        summary[det.severity]++;
      }
    });
    return summary;
  }

  /**
   * Điều chỉnh interval dựa trên kết quả detection (adaptive)
   */
  adjustInterval(hasProhibitedItems) {
    const currentInterval = this.config.intervalMs;
    let newInterval = currentInterval;

    if (hasProhibitedItems) {
      // Giảm interval xuống min khi detect prohibited items
      newInterval = this.config.minIntervalMs;
      if (!this.stats.adaptiveIntervalActive) {
        console.log(`⚡ Adaptive interval: Reducing to ${newInterval}ms (prohibited items detected)`);
        this.stats.adaptiveIntervalActive = true;
      }
    } else {
      // Tăng dần interval lên max khi không có gì
      newInterval = Math.min(
        currentInterval + 500, // Tăng từ từ
        this.config.maxIntervalMs
      );
      if (this.stats.adaptiveIntervalActive && newInterval >= this.config.maxIntervalMs) {
        console.log(`⚡ Adaptive interval: Returning to ${newInterval}ms (no prohibited items)`);
        this.stats.adaptiveIntervalActive = false;
      }
    }

    // Update interval nếu thay đổi
    if (newInterval !== currentInterval) {
      this.config.intervalMs = newInterval;
      clearInterval(this.detectionInterval);
      this.detectionInterval = setInterval(() => {
        this.captureMultipleFrames();
      }, newInterval);
    }
  }

  /**
   * Capture frame từ video và gửi lên backend để detect
   */
  async captureAndDetect() {
    if (!this.isRunning || !this.videoElement) {
      return null;
    }

    try {
      // Capture frame từ video
      const imageData = this.captureFrame();
      
      if (!imageData) {
        return null; // Skip silently nếu quality check fail
      }

      this.stats.framesCaptured++;

      // Gửi lên backend
      const result = await this.detectObjects(imageData);

      // Update stats
      this.stats.totalChecks++;
      this.stats.lastCheckTime = new Date();

      // Log nếu có prohibited items
      if (result.has_prohibited_items) {
        this.stats.violationsDetected++;
        this.stats.lastViolationTime = new Date();
      }

      return result;
      
    } catch (error) {
      this.stats.errors++;
      console.error('Object detection error:', error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      return null;
    }
  }

  /**
   * Calculate average brightness of image
   * @param {ImageData} imageData - Image data from canvas
   * @returns {number} Brightness value (0-255)
   */
  calculateBrightness(imageData) {
    const data = imageData.data;
    let sum = 0;
    let count = 0;
    
    // Sample every 4th pixel for performance (RGBA)
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Calculate luminance
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
      sum += brightness;
      count++;
    }
    
    return count > 0 ? sum / count : 0;
  }

  /**
   * Capture frame từ video element thành base64 image
   * @returns {string|null} Base64 encoded image data
   */
  captureFrame() {
    if (!this.videoElement || this.videoElement.readyState !== 4) {
      return null;
    }

    try {
      const { videoWidth, videoHeight } = this.videoElement;
      
      if (videoWidth === 0 || videoHeight === 0) {
        return null;
      }

      // Image preprocessing: Resize để tối ưu tốc độ xử lý
      const MAX_SIZE = 640; // YOLO models work well with 640px
      let targetWidth = videoWidth;
      let targetHeight = videoHeight;
      
      if (videoWidth > MAX_SIZE || videoHeight > MAX_SIZE) {
        const scale = Math.min(MAX_SIZE / videoWidth, MAX_SIZE / videoHeight);
        targetWidth = Math.floor(videoWidth * scale);
        targetHeight = Math.floor(videoHeight * scale);
      }

      // Set canvas size
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;

      // Draw video frame với resize
      const ctx = this.canvas.getContext('2d');
      ctx.drawImage(this.videoElement, 0, 0, targetWidth, targetHeight);

      // Image quality check: Kiểm tra độ sáng
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const brightness = this.calculateBrightness(imageData);
      
      // Skip nếu ảnh quá tối (< 30) hoặc quá sáng (> 220)
      if (brightness < 30) {
        console.warn(`⚠️ Image too dark (brightness: ${brightness.toFixed(1)}), skipping detection`);
        return null;
      }
      
      if (brightness > 220) {
        console.warn(`⚠️ Image too bright (brightness: ${brightness.toFixed(1)}), skipping detection`);
        return null;
      }

      // Convert to base64 với quality tốt
      return this.canvas.toDataURL('image/jpeg', 0.9);
      
    } catch (error) {
      console.error('Frame capture error:', error);
      return null;
    }
  }

  /**
   * Gọi API backend để detect objects
   * @param {string} imageData - Base64 encoded image
   * @returns {Promise<Object>} Detection results
   */
  async detectObjects(imageData) {
    try {
      const result = await apiRequest(
        '/api/monitoring/detect-objects',
        {
          method: 'POST',
          body: JSON.stringify({
            sessionId: this.sessionId,
            imageData
          })
        }
      );

      return result;
      
    } catch (error) {
      console.error('Object detection API error:', error);
      
      // apiClient throws Error objects, not axios response objects
      if (error.message) {
        throw new Error(error.message || 'Detection failed');
      } else {
        throw new Error('Network error: Cannot reach detection service');
      }
    }
  }

  /**
   * Lấy thống kê
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      ...this.stats,
      config: { ...this.config }
    };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };

    // Restart interval nếu đang chạy
    if (this.isRunning && newConfig.intervalMs) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = setInterval(() => {
        this.captureMultipleFrames();
      }, this.config.intervalMs);
    }
  }

  /**
   * Check service status
   * @returns {Promise<Object>} Service status
   */
  async checkServiceStatus() {
    try {
      const result = await apiRequest('/api/monitoring/object-detection/status');
      return result;
    } catch (error) {
      console.error('Failed to check service status:', error);
      return {
        success: false,
        isAvailable: false,
        error: error.message
      };
    }
  }
}

export default ObjectDetectionService;

