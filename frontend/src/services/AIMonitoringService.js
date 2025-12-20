/**
 * AIMonitoringService
 * 
 * Unified AI-based monitoring service combining:
 * - MultipleFaceDetector (Phase 1): Detect multiple people in frame
 * - GazeDirectionDetector (Phase 2): Detect looking away from camera
 * 
 * PURPOSE:
 * Provide a single, easy-to-use interface for all AI monitoring features
 * 
 * FEATURES:
 * - Real-time face detection (multiple people)
 * - Real-time gaze tracking (looking away)
 * - Unified violation reporting
 * - Performance monitoring
 * - Automatic camera access
 * - Configurable detection intervals
 * - Statistics aggregation
 * - Error handling and recovery
 * 
 * USAGE:
 * ```javascript
 * const aiMonitoring = new AIMonitoringService();
 * 
 * await aiMonitoring.initialize();
 * 
 * aiMonitoring.setViolationCallback((violation) => {
 *   console.log('AI Violation:', violation);
 * });
 * 
 * await aiMonitoring.startMonitoring();
 * 
 * // Later...
 * aiMonitoring.stopMonitoring();
 * ```
 */

class AIMonitoringService {
  constructor(options = {}) {
    // Configuration
    this.options = {
      // Detection intervals
      detectionInterval: 500,                 // 500ms = 2 FPS (balance speed/cpu)
      
      // Feature flags
      enableFaceDetection: true,              // Detect multiple people
      enableGazeDetection: true,              // Detect looking away
      
      // Camera settings
      videoWidth: 640,                        // Camera resolution
      videoHeight: 480,
      facingMode: 'user',                     // Front camera
      
      // Detector configs (can override defaults)
      faceDetectorConfig: {},
      gazeDetectorConfig: {},
      
      // Callbacks
      onInitialized: null,
      onCameraReady: null,
      onStatusChange: null,
      onError: null,
      
      // Logging
      enableLogging: true,
      
      ...options
    };
    
    // Detectors
    this.faceDetector = null;
    this.gazeDetector = null;
    
    // Camera
    this.videoElement = null;
    this.mediaStream = null;
    this.cameraReady = false;
    
    // State
    this.isInitialized = false;
    this.isMonitoring = false;
    this.detectionIntervalId = null;
    
    // Callbacks
    this.violationCallback = null;
    this.statusChangeCallback = null;
    
    // Statistics
    this.stats = {
      startTime: null,
      totalDetections: 0,
      faceDetections: 0,
      gazeDetections: 0,
      totalViolations: 0,
      faceViolations: 0,
      gazeViolations: 0,
      errors: 0,
      averageDetectionTime: 0
    };
    
    // Violation history
    this.violations = [];
    
    // Bind methods
    this.handleFaceViolation = this.handleFaceViolation.bind(this);
    this.handleGazeViolation = this.handleGazeViolation.bind(this);
    this.handleStatusChange = this.handleStatusChange.bind(this);
  }
  
  /**
   * Initialize AI monitoring service
   * - Initialize detectors
   * - Setup camera
   * Must be called before startMonitoring()
   */
  async initialize() {
    if (this.isInitialized) {
      this.log('Already initialized');
      return;
    }
    
    try {
      this.log('🚀 Initializing AIMonitoringService...');
      const startTime = performance.now();
      
      // Step 1: Initialize detectors
      await this.initializeDetectors();
      
      // Step 2: Setup camera
      await this.setupCamera();
      
      this.isInitialized = true;
      
      const duration = (performance.now() - startTime).toFixed(2);
      this.log(`✅ AIMonitoringService initialized in ${duration}ms`);
      
      if (this.options.onInitialized) {
        this.options.onInitialized();
      }
      
    } catch (error) {
      this.handleError('Initialization failed', error);
      throw error;
    }
  }
  
  /**
   * Initialize AI detectors (Phase 1 + Phase 2 + Phase 3)
   * Load sequentially to avoid MediaPipe CDN conflicts
   */
  async initializeDetectors() {
    this.log('Initializing AI detectors...');
    
    // Initialize MultipleFaceDetector (Phase 1) FIRST
    if (this.options.enableFaceDetection) {
      try {
        this.log('Loading MultipleFaceDetector...');
        
        const { default: MultipleFaceDetector } = await import('./ai/MultipleFaceDetector.js');
        this.faceDetector = new MultipleFaceDetector(this.options.faceDetectorConfig);
        
        await this.faceDetector.initialize();
        this.faceDetector.setViolationCallback(this.handleFaceViolation);
        this.log('✅ MultipleFaceDetector ready');
        
        // Longer delay to prevent CDN conflicts between Face Detection and Face Mesh
        this.log('⏳ Waiting 2 seconds before loading Face Mesh...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        this.log('⚠️ Failed to initialize MultipleFaceDetector: ' + error.message, 'warn');
        this.options.enableFaceDetection = false; // Disable if failed
      }
    }
    
    // Initialize GazeDirectionDetector (Phase 2) SECOND
    if (this.options.enableGazeDetection) {
      try {
        this.log('Loading GazeDirectionDetector...');
        
        const { default: GazeDirectionDetector } = await import('./ai/GazeDirectionDetector.js');
        this.gazeDetector = new GazeDirectionDetector(this.options.gazeDetectorConfig);
        
        await this.gazeDetector.initialize();
        this.gazeDetector.setViolationCallback(this.handleGazeViolation);
        this.gazeDetector.setStatusChangeCallback(this.handleStatusChange);
        this.log('✅ GazeDirectionDetector ready');
        
        // Delay before loading Pose (to avoid conflicts)
        this.log('⏳ Waiting 2 seconds before loading Pose...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        this.log('⚠️ Failed to initialize GazeDirectionDetector: ' + error.message, 'warn');
        this.options.enableGazeDetection = false; // Disable if failed
      }
    }
    
    // Check if at least one detector initialized
    if (!this.faceDetector && !this.gazeDetector) {
      throw new Error('Failed to initialize any AI detectors');
    }
    
    this.log('✅ All detectors initialized');
  }
  
  /**
   * Setup camera and video element
   */
  async setupCamera() {
    this.log('Setting up camera...');
    
    try {
      // Create video element
      this.videoElement = document.createElement('video');
      this.videoElement.setAttribute('playsinline', '');
      this.videoElement.setAttribute('autoplay', '');
      this.videoElement.muted = true;
      this.videoElement.width = this.options.videoWidth;
      this.videoElement.height = this.options.videoHeight;
      
      // Request camera access
      const constraints = {
        video: {
          width: { ideal: this.options.videoWidth },
          height: { ideal: this.options.videoHeight },
          facingMode: this.options.facingMode
        },
        audio: false
      };
      
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.mediaStream;
      
      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play()
            .then(resolve)
            .catch(reject);
        };
        
        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Camera timeout')), 10000);
      });
      
      this.cameraReady = true;
      this.log('✅ Camera ready');
      
      if (this.options.onCameraReady) {
        this.options.onCameraReady(this.videoElement);
      }
      
    } catch (error) {
      this.handleError('Camera setup failed', error);
      throw new Error(`Camera setup failed: ${error.message}`);
    }
  }
  
  /**
   * Start AI monitoring
   * Begins detection loop
   */
  async startMonitoring() {
    if (!this.isInitialized) {
      throw new Error('Not initialized. Call initialize() first.');
    }
    
    if (this.isMonitoring) {
      this.log('Already monitoring');
      return;
    }
    
    if (!this.cameraReady) {
      throw new Error('Camera not ready');
    }
    
    this.log('▶️ Starting AI monitoring...');
    
    this.isMonitoring = true;
    this.stats.startTime = Date.now();
    
    // Start detection loop
    this.detectionIntervalId = setInterval(() => {
      this.runDetection();
    }, this.options.detectionInterval);
    
    this.log(`✅ AI monitoring started (${this.options.detectionInterval}ms interval)`);
  }
  
  /**
   * Stop AI monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      this.log('Not monitoring');
      return;
    }
    
    this.log('⏸️ Stopping AI monitoring...');
    
    // Stop detection loop
    if (this.detectionIntervalId) {
      clearInterval(this.detectionIntervalId);
      this.detectionIntervalId = null;
    }
    
    this.isMonitoring = false;
    
    this.log('✅ AI monitoring stopped');
  }
  
  /**
   * Run detection (called by interval)
   */
  async runDetection() {
    if (!this.videoElement || !this.cameraReady) {
      return;
    }
    
    const startTime = performance.now();
    
    try {
      this.stats.totalDetections++;
      
      const promises = [];
      
      // Run face detection
      if (this.faceDetector && this.options.enableFaceDetection) {
        promises.push(
          this.faceDetector.detectFaces(this.videoElement).then(() => {
            this.stats.faceDetections++;
          })
        );
      }
      
      // Run gaze detection
      if (this.gazeDetector && this.options.enableGazeDetection) {
        promises.push(
          this.gazeDetector.detectGaze(this.videoElement).then(() => {
            this.stats.gazeDetections++;
          })
        );
      }
      
      
      // Run all in parallel
      await Promise.all(promises);
      
      // Update performance stats
      const detectionTime = performance.now() - startTime;
      this.updateDetectionTime(detectionTime);
      
    } catch (error) {
      this.stats.errors++;
      this.handleError('Detection error', error);
    }
  }
  
  /**
   * Handle face detection violation (from MultipleFaceDetector)
   */
  handleFaceViolation(violation) {
    violation.source = 'face_detector';
    violation.phase = 'Phase 1';
    
    this.stats.totalViolations++;
    this.stats.faceViolations++;
    
    this.violations.push(violation);
    
    this.log(`🚨 Face violation: ${violation.type}`, 'warn');
    
    if (this.violationCallback) {
      this.violationCallback(violation);
    }
  }
  
  /**
   * Handle gaze detection violation (from GazeDirectionDetector)
   */
  handleGazeViolation(violation) {
    violation.source = 'gaze_detector';
    violation.phase = 'Phase 2';
    
    this.stats.totalViolations++;
    this.stats.gazeViolations++;
    
    this.violations.push(violation);
    
    this.log(`🚨 Gaze violation: ${violation.type}`, 'warn');
    
    if (this.violationCallback) {
      this.violationCallback(violation);
    }
  }
  
  /**
   * Handle status change (from detectors)
   */
  handleStatusChange(status) {
    if (!status.source) {
      status.source = 'unknown';
    }
    
    if (this.statusChangeCallback) {
      this.statusChangeCallback(status);
    }
    
    if (this.options.onStatusChange) {
      this.options.onStatusChange(status);
    }
  }
  
  /**
   * Set violation callback
   * @param {Function} callback - (violation) => void
   */
  setViolationCallback(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    this.violationCallback = callback;
  }
  
  /**
   * Set status change callback
   * @param {Function} callback - (status) => void
   */
  setStatusChangeCallback(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    this.statusChangeCallback = callback;
  }
  
  /**
   * Get video element (for rendering)
   */
  getVideoElement() {
    return this.videoElement;
  }
  
  /**
   * Get current gaze direction
   */
  getCurrentGazeDirection() {
    if (!this.gazeDetector) return 'unknown';
    const stats = this.gazeDetector.getStats();
    return stats.currentDirection || 'unknown';
  }
  
  /**
   * Get current face count
   */
  getCurrentFaceCount() {
    if (!this.faceDetector) return 0;
    // Note: MultipleFaceDetector doesn't expose current count
    // This would need to be added to MultipleFaceDetector
    return 1; // Placeholder
  }
  
  /**
   * Get aggregated statistics
   */
  getStats() {
    const now = Date.now();
    const uptime = this.stats.startTime ? now - this.stats.startTime : 0;
    
    const stats = {
      ...this.stats,
      uptime: Math.round(uptime / 1000), // seconds
      isInitialized: this.isInitialized,
      isMonitoring: this.isMonitoring,
      cameraReady: this.cameraReady,
      averageDetectionTime: Math.round(this.stats.averageDetectionTime)
    };
    
    // Add detector-specific stats
    if (this.faceDetector) {
      stats.faceDetectorStats = this.faceDetector.getStats();
    }
    
    if (this.gazeDetector) {
      stats.gazeDetectorStats = this.gazeDetector.getStats();
    }
    
    return stats;
  }
  
  /**
   * Get violations
   * @param {Object} filter - Optional filter { type, severity, source }
   */
  getViolations(filter = {}) {
    let filtered = [...this.violations];
    
    if (filter.type) {
      filtered = filtered.filter(v => v.type === filter.type);
    }
    
    if (filter.severity) {
      filtered = filtered.filter(v => v.severity === filter.severity);
    }
    
    if (filter.source) {
      filtered = filtered.filter(v => v.source === filter.source);
    }
    
    return filtered;
  }
  
  /**
   * Clear violations
   */
  clearViolations() {
    this.violations = [];
    this.stats.totalViolations = 0;
    this.stats.faceViolations = 0;
    this.stats.gazeViolations = 0;
    
    this.log('Violations cleared');
  }
  
  /**
   * Update detection time statistics
   */
  updateDetectionTime(time) {
    const total = this.stats.totalDetections;
    const currentAvg = this.stats.averageDetectionTime;
    
    this.stats.averageDetectionTime = (
      (currentAvg * (total - 1) + time) / total
    );
  }
  
  /**
   * Handle errors
   */
  handleError(message, error) {
    this.stats.errors++;
    
    const errorObj = {
      message,
      error: error?.message || error,
      timestamp: new Date()
    };
    
    this.log(`❌ ${message}: ${error?.message || error}`, 'error');
    
    if (this.options.onError) {
      this.options.onError(errorObj);
    }
  }
  
  /**
   * Cleanup and release resources
   */
  cleanup() {
    this.log('Cleaning up AIMonitoringService...');
    
    // Stop monitoring
    this.stopMonitoring();
    
    // Cleanup detectors
    if (this.faceDetector) {
      this.faceDetector.cleanup();
      this.faceDetector = null;
    }
    
    if (this.gazeDetector) {
      this.gazeDetector.cleanup();
      this.gazeDetector = null;
    }
    
    // Release camera
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    
    this.isInitialized = false;
    this.cameraReady = false;
    
    this.log('✅ Cleanup complete');
  }
  
  /**
   * Logging utility
   */
  log(message, level = 'log') {
    if (!this.options.enableLogging && level === 'debug') return;
    
    const prefix = '[AIMonitoringService]';
    
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

export default AIMonitoringService;

