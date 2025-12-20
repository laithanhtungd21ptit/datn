import axios from 'axios';
import FormData from 'form-data';

/**
 * Object Detection Service
 * Giao tiếp với Python YOLO microservice để detect objects trong images
 */
class ObjectDetectionService {
  constructor() {
    this.serviceUrl = process.env.YOLO_SERVICE_URL || 'http://localhost:8001';
    this.isAvailable = false;
    this.lastHealthCheck = null;
    this.healthCheckInterval = 60000; // Check mỗi 60 giây
    
    // Initial health check
    this.checkServiceHealth();
    
    // Periodic health check
    setInterval(() => {
      this.checkServiceHealth();
    }, this.healthCheckInterval);
  }

  /**
   * Kiểm tra YOLO service có available không
   * @returns {Promise<boolean>}
   */
  async checkServiceHealth() {
    try {
      const response = await axios.get(`${this.serviceUrl}/health`, {
        timeout: 5000
      });
      
      this.isAvailable = response.data.status === 'healthy';
      this.lastHealthCheck = new Date();
      
      if (this.isAvailable) {
        console.log('✅ YOLO service is available');
      }
      
      return true;
    } catch (error) {
      this.isAvailable = false;
      this.lastHealthCheck = new Date();
      
      console.warn('⚠️ YOLO service is not available:', error.message);
      return false;
    }
  }

  /**
   * Detect objects trong image
   * @param {Buffer} imageBuffer - Image data as buffer
   * @param {string} filename - Filename (optional)
   * @param {Object} options - Detection options
   * @returns {Promise<Object>} Detection results
   */
  async detectObjects(imageBuffer, filename = 'frame.jpg', options = {}) {
    // Check service availability
    if (!this.isAvailable) {
      console.warn('YOLO service not available, checking health...');
      await this.checkServiceHealth();
      
      if (!this.isAvailable) {
        throw new Error('YOLO service is not available');
      }
    }

    try {
      const {
        confThreshold = 0.6,
        useCoco = true
      } = options;

      // Create form data
      const formData = new FormData();
      formData.append('file', imageBuffer, {
        filename,
        contentType: 'image/jpeg'
      });

      // Call YOLO service
      const response = await axios.post(
        `${this.serviceUrl}/detect`,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          params: {
            conf_threshold: confThreshold,
            use_coco: useCoco
          },
          timeout: 10000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      // Add timestamp
      const result = {
        ...response.data,
        timestamp: new Date()
      };

      // Log detection results
      if (result.has_prohibited_items) {
        console.warn(
          `🚨 Prohibited items detected: ${result.prohibited_count} items, ` +
          `Summary: ${JSON.stringify(result.summary)}`
        );
      } else {
        console.log(`✅ No prohibited items detected (${result.count} total objects)`);
      }

      return result;
      
    } catch (error) {
      console.error('Object detection error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Mark service as unavailable if connection error
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        this.isAvailable = false;
        throw new Error(`YOLO service is not available: ${error.message}`);
      }
      
      if (error.response) {
        throw new Error(
          `Detection failed: ${error.response.data.detail || error.message}`
        );
      }
      
      throw new Error(`Detection service error: ${error.message}`);
    }
  }

  /**
   * Detect objects từ base64 image data
   * @param {string} base64Data - Base64 encoded image
   * @param {Object} options - Detection options
   * @returns {Promise<Object>} Detection results
   */
  async detectFromBase64(base64Data, options = {}) {
    try {
      // Validate input
      if (!base64Data || typeof base64Data !== 'string') {
        throw new Error('Invalid base64 data: must be a non-empty string');
      }

      // Remove data URL prefix if present
      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
      
      if (!cleanBase64 || cleanBase64.length < 100) {
        throw new Error('Invalid base64 data: too short or empty after cleaning');
      }
      
      // Convert to buffer
      let imageBuffer;
      try {
        imageBuffer = Buffer.from(cleanBase64, 'base64');
      } catch (bufferError) {
        throw new Error(`Failed to decode base64: ${bufferError.message}`);
      }

      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid image buffer: empty after decoding');
      }
      
      // Detect
      return await this.detectObjects(imageBuffer, 'frame.jpg', options);
      
    } catch (error) {
      console.error('Base64 detection error:', error);
      throw error;
    }
  }

  /**
   * Get service status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      serviceUrl: this.serviceUrl,
      isAvailable: this.isAvailable,
      lastHealthCheck: this.lastHealthCheck
    };
  }

  /**
   * Force reconnect to service
   * @returns {Promise<boolean>}
   */
  async reconnect() {
    console.log('Forcing reconnect to YOLO service...');
    return await this.checkServiceHealth();
  }
}

// Export singleton instance
const objectDetectionService = new ObjectDetectionService();
export default objectDetectionService;

