/**
 * MultipleFaceDetector
 * 
 * Detects multiple people in camera frame to prevent cheating
 * 
 * FEATURES:
 * - Real-time face detection using MediaPipe
 * - Identifies main student (closest to camera/center)
 * - Detects additional people (potential helpers)
 * - Configurable violation threshold (default: 3 seconds)
 * - Automatic violation reporting
 * 
 * VIOLATION LOGIC:
 * 1. Detect all faces in frame
 * 2. If > 1 face found:
 *    - Calculate distance from each face to frame center
 *    - Largest face + closest to center = main student
 *    - Other faces = potential helpers
 * 3. If multiple faces persist > threshold (3s):
 *    - Report violation: "multiple_faces"
 * 
 * USAGE:
 * ```javascript
 * const detector = new MultipleFaceDetector();
 * await detector.initialize();
 * detector.setViolationCallback((violation) => {
 *   console.log('Violation:', violation);
 * });
 * 
 * // Start detection loop
 * setInterval(() => {
 *   detector.detectFaces(videoElement);
 * }, 500);
 * ```
 */

class MultipleFaceDetector {
  constructor(options = {}) {
    // Configuration
    this.options = {
      minDetectionConfidence: 0.5,        // MediaPipe confidence threshold
      multipleFaceThreshold: 3000,        // 3 seconds before reporting
      violationCooldown: 10000,           // 10s between violations (avoid spam)
      modelComplexity: 0,                 // 0=fast, 1=accurate (use 0 for real-time)
      enableLogging: true,                // Console logging
      ...options
    };
    
    // MediaPipe Face Detection instance
    this.faceDetection = null;
    this.isInitialized = false;
    
    // State tracking
    this.multipleFaceStartTime = null;   // When multiple faces first detected
    this.currentFaceCount = 0;           // Current number of faces
    this.lastViolationTime = 0;          // Last violation report timestamp
    this.isProcessing = false;           // Prevent concurrent processing
    
    // Statistics
    this.stats = {
      totalFramesProcessed: 0,
      singleFaceFrames: 0,
      multipleFaceFrames: 0,
      noFaceFrames: 0,
      violationsReported: 0,
      averageProcessingTime: 0
    };
    
    // Callbacks
    this.onViolationCallback = null;
    this.onStatusChangeCallback = null;
    
    // Bind methods
    this.onResults = this.onResults.bind(this);
  }
  
  /**
   * Initialize MediaPipe Face Detection
   * Must be called before detection can start
   */
  async initialize() {
    if (this.isInitialized) {
      this.log('Already initialized');
      return;
    }
    
    try {
      this.log('Initializing MediaPipe Face Detection...');
      const startTime = performance.now();
      
      // Dynamically import MediaPipe (only when needed)
      const { FaceDetection } = await import('@mediapipe/face_detection');
      
      // Create instance
      this.faceDetection = new FaceDetection({
        locateFile: (file) => {
          // Ensure we always return a valid string
          if (!file) {
            console.warn('[MultipleFaceDetector] locateFile called with undefined file');
            return '';
          }
          const url = `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
          return url;
        }
      });
      
      // Configure options
      this.faceDetection.setOptions({
        model: 'short',  // 'short' range model (0-2m, faster, good for webcam)
        minDetectionConfidence: this.options.minDetectionConfidence
      });
      
      // Set results callback
      this.faceDetection.onResults(this.onResults);
      
      this.isInitialized = true;
      
      const loadTime = (performance.now() - startTime).toFixed(2);
      this.log(`✅ Face Detection initialized in ${loadTime}ms`);
      
    } catch (error) {
      console.error('❌ Failed to initialize Face Detection:', error);
      throw new Error(`MediaPipe initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Detect faces in video element
   * @param {HTMLVideoElement} videoElement - Video element from camera
   */
  async detectFaces(videoElement) {
    if (!this.isInitialized) {
      throw new Error('Detector not initialized. Call initialize() first.');
    }
    
    if (!videoElement || videoElement.readyState !== 4) {
      this.log('Video not ready', 'warn');
      return;
    }
    
    if (this.isProcessing) {
      this.log('Already processing, skipping frame', 'debug');
      return;
    }
    
    try {
      this.isProcessing = true;
      const startTime = performance.now();
      
      // Send frame to MediaPipe
      await this.faceDetection.send({ image: videoElement });
      
      // Update stats
      const processingTime = performance.now() - startTime;
      this.updateProcessingStats(processingTime);
      
    } catch (error) {
      console.error('Error during face detection:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * MediaPipe results callback
   * Called automatically when detection completes
   * @param {Object} results - MediaPipe detection results
   */
  onResults(results) {
    const detections = results.detections || [];
    const faceCount = detections.length;
    const now = Date.now();
    
    this.currentFaceCount = faceCount;
    this.stats.totalFramesProcessed++;
    
    // Update status callback
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback({
        faceCount,
        status: this.getStatus(faceCount),
        timestamp: now
      });
    }
    
    // Handle different scenarios
    if (faceCount === 0) {
      this.handleNoFace();
    } else if (faceCount === 1) {
      this.handleSingleFace(detections[0]);
    } else {
      this.handleMultipleFaces(detections);
    }
  }
  
  /**
   * Handle no face detected
   */
  handleNoFace() {
    this.stats.noFaceFrames++;
    
    // Reset multiple face timer
    this.multipleFaceStartTime = null;
    
    this.log('No face detected', 'debug');
    
    // Note: "face_not_detected" violation is handled by AI monitoring service
    // to avoid duplicate reports with gaze detector
  }
  
  /**
   * Handle single face (normal scenario)
   * @param {Object} detection - Face detection result
   */
  handleSingleFace(detection) {
    this.stats.singleFaceFrames++;
    
    // Reset multiple face timer
    this.multipleFaceStartTime = null;
    
    this.log(`✅ Single face detected (confidence: ${(detection.score * 100).toFixed(1)}%)`, 'debug');
  }
  
  /**
   * Handle multiple faces detected
   * @param {Array} detections - Array of face detections
   */
  handleMultipleFaces(detections) {
    this.stats.multipleFaceFrames++;
    
    const now = Date.now();
    const faceCount = detections.length;
    
    // Identify main student and helpers
    const mainStudent = this.findMainStudent(detections);
    const helpers = detections.filter(d => d !== mainStudent);
    
    this.log(`⚠️ Multiple faces detected: ${faceCount} (${helpers.length} potential helpers)`, 'warn');
    
    // Start timer if first detection
    if (!this.multipleFaceStartTime) {
      this.multipleFaceStartTime = now;
      this.log(`🕐 Starting multiple face timer (threshold: ${this.options.multipleFaceThreshold}ms)`);
    }
    
    // Check duration
    const duration = now - this.multipleFaceStartTime;
    
    // Check if exceeded threshold
    if (duration >= this.options.multipleFaceThreshold) {
      // Check cooldown to avoid spam
      const timeSinceLastViolation = now - this.lastViolationTime;
      
      if (timeSinceLastViolation >= this.options.violationCooldown) {
        // REPORT VIOLATION!
        this.reportViolation({
          type: 'multiple_faces',
          severity: 'critical',
          description: `Phát hiện ${faceCount} người trong khung hình`,
          evidence: {
            faceCount: faceCount,
            duration: Math.round(duration / 1000), // seconds
            mainStudentConfidence: (mainStudent.score * 100).toFixed(1),
            helperCount: helpers.length,
            allConfidences: detections.map(d => (d.score * 100).toFixed(1)),
            timestamp: new Date().toISOString()
          }
        });
        
        this.lastViolationTime = now;
        this.stats.violationsReported++;
        
        // Reset timer to continue monitoring
        this.multipleFaceStartTime = now;
      } else {
        this.log(`⏳ Violation cooldown active (${Math.round((this.options.violationCooldown - timeSinceLastViolation) / 1000)}s remaining)`, 'debug');
      }
    } else {
      const remaining = Math.round((this.options.multipleFaceThreshold - duration) / 1000);
      this.log(`⏱️ Multiple faces for ${Math.round(duration / 1000)}s (${remaining}s until violation)`, 'debug');
    }
  }
  
  /**
   * Find main student (closest to center + largest face)
   * @param {Array} detections - Array of face detections
   * @returns {Object} Main student detection
   */
  findMainStudent(detections) {
    if (detections.length === 0) return null;
    if (detections.length === 1) return detections[0];
    
    let mainStudent = detections[0];
    let bestScore = -Infinity;
    
    detections.forEach(detection => {
      const bbox = detection.boundingBox;
      
      // Calculate face center in normalized coordinates (0-1)
      const faceCenterX = bbox.xCenter;
      const faceCenterY = bbox.yCenter;
      
      // Frame center is (0.5, 0.5)
      const centerX = 0.5;
      const centerY = 0.5;
      
      // Calculate distance to center
      const distanceToCenter = Math.sqrt(
        Math.pow(faceCenterX - centerX, 2) + 
        Math.pow(faceCenterY - centerY, 2)
      );
      
      // Calculate face size (larger = closer to camera)
      const faceSize = bbox.width * bbox.height;
      
      // Combined score (lower distance + larger size = main student)
      // Weight: size is 2x more important than distance
      const score = (faceSize * 2) - distanceToCenter;
      
      if (score > bestScore) {
        bestScore = score;
        mainStudent = detection;
      }
    });
    
    return mainStudent;
  }
  
  /**
   * Report violation
   * @param {Object} violation - Violation details
   */
  reportViolation(violation) {
    this.log(`🚨 VIOLATION REPORTED: ${violation.type}`, 'error');
    
    // Add timestamp
    violation.timestamp = violation.timestamp || new Date();
    
    // Call callback if set
    if (this.onViolationCallback) {
      this.onViolationCallback(violation);
    } else {
      console.warn('No violation callback set!');
    }
  }
  
  /**
   * Get current status string
   * @param {number} faceCount - Number of faces
   * @returns {string} Status
   */
  getStatus(faceCount) {
    if (faceCount === 0) return 'no_face';
    if (faceCount === 1) return 'normal';
    return 'multiple_faces';
  }
  
  /**
   * Update processing statistics
   * @param {number} processingTime - Time taken to process frame (ms)
   */
  updateProcessingStats(processingTime) {
    const totalFrames = this.stats.totalFramesProcessed;
    const currentAvg = this.stats.averageProcessingTime;
    
    // Calculate rolling average
    this.stats.averageProcessingTime = (
      (currentAvg * (totalFrames - 1) + processingTime) / totalFrames
    );
  }
  
  /**
   * Set violation callback
   * @param {Function} callback - Callback function (violation) => void
   */
  setViolationCallback(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    this.onViolationCallback = callback;
  }
  
  /**
   * Set status change callback
   * @param {Function} callback - Callback function (status) => void
   */
  setStatusChangeCallback(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    this.onStatusChangeCallback = callback;
  }
  
  /**
   * Get current statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      currentFaceCount: this.currentFaceCount,
      isInitialized: this.isInitialized,
      isProcessing: this.isProcessing,
      multipleFaceTimerActive: this.multipleFaceStartTime !== null,
      averageProcessingTime: Math.round(this.stats.averageProcessingTime)
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalFramesProcessed: 0,
      singleFaceFrames: 0,
      multipleFaceFrames: 0,
      noFaceFrames: 0,
      violationsReported: 0,
      averageProcessingTime: 0
    };
    this.log('Statistics reset');
  }
  
  /**
   * Stop detection and cleanup
   */
  cleanup() {
    if (this.faceDetection) {
      this.faceDetection.close();
      this.faceDetection = null;
    }
    
    this.isInitialized = false;
    this.multipleFaceStartTime = null;
    this.currentFaceCount = 0;
    this.isProcessing = false;
    
    this.log('✅ Detector cleaned up');
  }
  
  /**
   * Logging utility
   * @param {string} message - Log message
   * @param {string} level - Log level (log, warn, error, debug)
   */
  log(message, level = 'log') {
    if (!this.options.enableLogging && level === 'debug') return;
    
    const prefix = '[MultipleFaceDetector]';
    
    switch (level) {
      case 'warn':
        console.warn(prefix, message);
        break;
      case 'error':
        console.error(prefix, message);
        break;
      case 'debug':
        if (this.options.enableLogging) {
          console.log(prefix, message);
        }
        break;
      default:
        console.log(prefix, message);
    }
  }
}

export default MultipleFaceDetector;

