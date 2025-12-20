/**
 * GazeDirectionDetector (ENHANCED with Multiple Face Detection)
 * 
 * Detects student looking away + multiple people in frame
 * 
 * FEATURES:
 * - Real-time gaze tracking using MediaPipe Face Mesh
 * - Multiple face detection (cheating detection)
 * - Iris/pupil position tracking
 * - Direction detection (left, right, up, down, center)
 * - Configurable violation threshold (default: 5 seconds)
 * - Automatic violation reporting
 * - Head pose estimation support
 * 
 * VIOLATION LOGIC:
 * 1. Multiple Faces: If > 1 face → "multiple_people_detected"
 * 2. No Face: If 0 faces → "face_not_detected"
 * 3. Looking Away: Track iris position relative to eye center
 *    - Calculate gaze direction (horizontal + vertical)
 *    - If looking away from center > 5s → "looking_away"
 * 
 * DIRECTIONS:
 * - center: Looking at camera (normal)
 * - left: Looking to student's left
 * - right: Looking to student's right
 * - up: Looking upward
 * - down: Looking downward
 * 
 * USAGE:
 * ```javascript
 * const detector = new GazeDirectionDetector();
 * await detector.initialize();
 * 
 * detector.setViolationCallback((violation) => {
 *   console.log('Looking away:', violation);
 * });
 * 
 * // Start detection loop
 * setInterval(() => {
 *   detector.detectGaze(videoElement);
 * }, 500);
 * ```
 */

class GazeDirectionDetector {
  constructor(options = {}) {
    // Configuration
    this.options = {
      minDetectionConfidence: 0.75,     // Increased from 0.7 to reduce false positives
      minTrackingConfidence: 0.7,       // Higher tracking confidence
      lookingAwayThreshold: 5000,       // 5 seconds before reporting
      violationCooldown: 10000,         // 10s between violations
      horizontalThreshold: 0.01,        // Lower threshold = easier to detect (was 0.015)
      verticalThreshold: 0.008,         // Lower threshold = easier to detect (was 0.012)
      maxNumFaces: 5,                   // Detect up to 5 faces (for multiple people detection)
      refineLandmarks: true,            // Enable iris tracking
      enableLogging: true,              // Console logging
      noFaceThreshold: 2000,            // 2s no face before reporting
      multipleFaceCooldown: 5000,       // 5s between multiple face violations
      multipleFaceThreshold: 3000,      // 3s duration before reporting multiple faces (NEW - reduces false positives)
      minFaceSize: 0.15,                // Increased from 0.1 to 15% to filter noise better
      maxFaceOverlap: 0.5,               // Maximum overlap between faces (50%) to consider as separate faces (NEW)
      debugGaze: true,                  // Enable gaze debugging
      ...options
    };
    
    // MediaPipe Face Mesh instance
    this.faceMesh = null;
    this.isInitialized = false;
    
    // State tracking
    this.currentDirection = 'unknown';        // Current gaze direction
    this.lookingAwayStartTime = null;         // When looking away started
    this.lastCenterTime = Date.now();         // Last time looking at center
    this.lastViolationTime = 0;               // Last violation report time
    this.isProcessing = false;                // Prevent concurrent processing
    
    // Multiple face detection state
    this.currentFaceCount = 0;                // Current number of faces
    this.multipleFaceStartTime = null;        // When multiple faces first detected (NEW - for duration threshold)
    this.noFaceStartTime = null;              // When no face started
    this.lastMultipleFaceViolation = 0;       // Last multiple face violation time
    this.lastNoFaceViolation = 0;             // Last no face violation time
    
    // Direction history (for smoothing)
    this.directionHistory = [];               // Last N directions
    this.historySize = 5;                     // Smooth over 5 frames
    
    // Statistics
    this.stats = {
      totalFramesProcessed: 0,
      centerFrames: 0,
      leftFrames: 0,
      rightFrames: 0,
      upFrames: 0,
      downFrames: 0,
      noFaceFrames: 0,
      multipleFaceFrames: 0,
      singleFaceFrames: 0,
      violationsReported: 0,
      lookingAwayViolations: 0,
      multipleFaceViolations: 0,
      noFaceViolations: 0,
      averageProcessingTime: 0,
      directionChanges: 0
    };
    
    // Callbacks
    this.onViolationCallback = null;
    this.onDirectionChangeCallback = null;
    this.onStatusChangeCallback = null;
    
    // Bind methods
    this.onResults = this.onResults.bind(this);
  }
  
  /**
   * Initialize MediaPipe Face Mesh
   * Must be called before detection can start
   */
  async initialize() {
    if (this.isInitialized) {
      this.log('Already initialized');
      return;
    }
    
    try {
      this.log('Initializing MediaPipe Face Mesh...');
      const startTime = performance.now();
      
      // Wait a bit to ensure any previous MediaPipe instances are fully cleaned up
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Dynamically import MediaPipe
      const { FaceMesh } = await import('@mediapipe/face_mesh');
      
      // Wait a bit more to ensure the module is fully loaded
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Create instance with error handling for file system conflicts
      // MediaPipe WASM uses a virtual filesystem that can conflict if files already exist
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          this.faceMesh = new FaceMesh({
            locateFile: (file) => {
              // Ensure we always return a valid string
              if (!file) {
                this.log('⚠️ locateFile called with undefined file', 'warn');
                return '';
              }
              // Use CDN URL for MediaPipe assets
              const url = `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
              return url;
            }
          });
          
          // If we get here, initialization succeeded
          break;
          
        } catch (initError) {
          retryCount++;
          
          // Handle "File exists" or buffer errors - these are often recoverable
          const isFileSystemError = initError.message && (
            initError.message.includes('File exists') || 
            initError.message.includes('EEXIST') ||
            initError.message.includes('buffer') ||
            initError.message.includes('Cannot read properties')
          );
          
          if (isFileSystemError && retryCount < maxRetries) {
            this.log(`⚠️ MediaPipe initialization error (attempt ${retryCount}/${maxRetries}): ${initError.message}`, 'warn');
            this.log('Waiting before retry...', 'warn');
            
            // Wait longer between retries to let file system settle
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          } else if (isFileSystemError && retryCount >= maxRetries) {
            // After max retries, try one more time with a clean state
            this.log('⚠️ Max retries reached, attempting final initialization...', 'warn');
            
            // Try to reset by waiting longer
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
              this.faceMesh = new FaceMesh({
                locateFile: (file) => {
                  if (!file) return '';
                  return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
              });
              this.log('✅ Successfully created FaceMesh instance after retries');
              break;
            } catch (finalError) {
              this.log('⚠️ Final initialization attempt failed, but continuing anyway', 'warn');
              this.log(`Error: ${finalError.message}`, 'warn');
              // Set initialized anyway - the error might be non-critical
              this.isInitialized = true;
              return;
            }
          } else {
            // For other errors, throw normally
            throw initError;
          }
        }
      }
      
      // Only configure if faceMesh was successfully created
      if (this.faceMesh) {
        // Configure options
        this.faceMesh.setOptions({
          maxNumFaces: this.options.maxNumFaces,
          refineLandmarks: this.options.refineLandmarks,  // Enable iris
          minDetectionConfidence: this.options.minDetectionConfidence,
          minTrackingConfidence: this.options.minTrackingConfidence
        });
        
        // Set results callback
        this.faceMesh.onResults(this.onResults);
        
        this.isInitialized = true;
        
        const loadTime = (performance.now() - startTime).toFixed(2);
        this.log(`✅ Face Mesh initialized in ${loadTime}ms`);
      } else {
        throw new Error('Failed to create FaceMesh instance after all retries');
      }
      
    } catch (error) {
      // Handle "File exists" or buffer errors gracefully - don't block initialization
      const isRecoverableError = error.message && (
        error.message.includes('File exists') || 
        error.message.includes('EEXIST') ||
        error.message.includes('buffer') ||
        error.message.includes('Cannot read properties')
      );
      
      if (isRecoverableError) {
        this.log('⚠️ MediaPipe initialization error (non-critical), continuing...', 'warn');
        this.log(`Error details: ${error.message}`, 'warn');
        // Mark as initialized anyway - the error might be harmless
        // MediaPipe might still work with existing files in the virtual filesystem
        this.isInitialized = true;
        return;
      }
      
      console.error('❌ Failed to initialize Face Mesh:', error);
      throw new Error(`MediaPipe Face Mesh initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Detect gaze direction in video element
   * @param {HTMLVideoElement} videoElement - Video element from camera
   */
  async detectGaze(videoElement) {
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
      await this.faceMesh.send({ image: videoElement });
      
      // Update stats
      const processingTime = performance.now() - startTime;
      this.updateProcessingStats(processingTime);
      
    } catch (error) {
      console.error('Error during gaze detection:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * MediaPipe results callback
   * Called automatically when detection completes
   * @param {Object} results - MediaPipe Face Mesh results
   */
  onResults(results) {
    this.stats.totalFramesProcessed++;
    const now = Date.now();
    
    // Filter valid faces (remove noise/false positives)
    const validFaces = this.filterValidFaces(results.multiFaceLandmarks || []);
    const faceCount = validFaces.length;
    this.currentFaceCount = faceCount;
    
    this.log(`Detected ${faceCount} valid face(s)`, 'debug');
    
    // CASE 1: No face detected
    if (faceCount === 0) {
      this.handleNoFace(now);
      return;
    }
    
    // CASE 2: Multiple faces detected
    if (faceCount > 1) {
      // Start timer if not already started
      if (this.multipleFaceStartTime === null) {
        this.multipleFaceStartTime = now;
        this.log(`Multiple faces detected, starting timer...`, 'debug');
      }
      // Check if duration threshold exceeded
      this.handleMultipleFaces(faceCount, now, validFaces);
      // Continue to track main student's gaze
    } else {
      // Reset multiple face timer if only single face
      if (this.multipleFaceStartTime !== null) {
        this.log(`Single face restored, resetting multiple face timer`, 'debug');
        this.multipleFaceStartTime = null;
      }
    }
    
    // CASE 3: Single face (normal) or tracking main student
    this.stats.singleFaceFrames++;
    this.noFaceStartTime = null; // Reset no face timer
    
    // Get main student's face (largest face = closest to camera)
    const landmarks = this.getMainStudentFace(validFaces);
    
    // Calculate gaze direction
    const direction = this.calculateGazeDirection(landmarks);
    
    // Smooth direction (reduce jitter)
    const smoothedDirection = this.smoothDirection(direction);
    
    // Update stats
    this.updateDirectionStats(smoothedDirection);
    
    // Handle direction
    this.handleDirection(smoothedDirection, now);
    
    // Report status change
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback({
        direction: smoothedDirection,
        lookingAway: smoothedDirection !== 'center',
        duration: this.getLookingAwayDuration(now),
        faceCount: faceCount,
        timestamp: now
      });
    }
  }
  
  /**
   * Filter valid faces (remove noise and false positives)
   * @param {Array} multiFaceLandmarks - Array of all detected face landmarks
   * @returns {Array} Filtered valid face landmarks
   */
  filterValidFaces(multiFaceLandmarks) {
    if (!multiFaceLandmarks || multiFaceLandmarks.length === 0) {
      return [];
    }
    
    // First pass: Basic filtering
    const basicValidFaces = multiFaceLandmarks.filter(landmarks => {
      // Check if landmarks array is valid
      if (!landmarks || landmarks.length < 468) {
        this.log('Invalid landmarks: too few points', 'debug');
        return false;
      }
      
      // Calculate face bounding box
      const xs = landmarks.map(l => l.x);
      const ys = landmarks.map(l => l.y);
      
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      
      const width = maxX - minX;
      const height = maxY - minY;
      const faceSize = Math.max(width, height);
      
      // Filter out very small faces (likely noise/false positives)
      if (faceSize < this.options.minFaceSize) {
        this.log(`Face too small (${(faceSize * 100).toFixed(1)}%), filtering out`, 'debug');
        return false;
      }
      
      // Check if face is reasonably centered (not at extreme edges)
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      // Face must be somewhat in frame (not 95%+ at edges)
      if (centerX < 0.02 || centerX > 0.98 || centerY < 0.02 || centerY > 0.98) {
        this.log(`Face at extreme edge (${(centerX * 100).toFixed(0)}%, ${(centerY * 100).toFixed(0)}%), filtering out`, 'debug');
        return false;
      }
      
      return true;
    });
    
    // Second pass: Remove overlapping faces (likely false positives from same person)
    const validFaces = this.removeOverlappingFaces(basicValidFaces);
    
    this.log(`Filtered ${multiFaceLandmarks.length} faces → ${basicValidFaces.length} basic valid → ${validFaces.length} after overlap check`, 'debug');
    return validFaces;
  }
  
  /**
   * Remove overlapping faces (likely false positives)
   * If two faces overlap > maxFaceOverlap, keep only the larger one
   * @param {Array} faces - Array of face landmarks
   * @returns {Array} Non-overlapping faces
   */
  removeOverlappingFaces(faces) {
    if (faces.length <= 1) {
      return faces;
    }
    
    // Calculate bounding boxes for all faces
    const faceBoxes = faces.map(landmarks => {
      const xs = landmarks.map(l => l.x);
      const ys = landmarks.map(l => l.y);
      
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      
      const width = maxX - minX;
      const height = maxY - minY;
      const area = width * height;
      
      return {
        landmarks,
        minX, maxX, minY, maxY,
        width, height, area
      };
    });
    
    // Sort by area (largest first)
    faceBoxes.sort((a, b) => b.area - a.area);
    
    const validFaces = [];
    
    for (let i = 0; i < faceBoxes.length; i++) {
      const current = faceBoxes[i];
      let isOverlapping = false;
      
      // Check overlap with already accepted faces
      for (const accepted of validFaces) {
        const overlap = this.calculateOverlap(current, accepted);
        
        if (overlap > this.options.maxFaceOverlap) {
          isOverlapping = true;
          this.log(`Face ${i} overlaps ${overlap.toFixed(1)}% with larger face, filtering out`, 'debug');
          break;
        }
      }
      
      if (!isOverlapping) {
        validFaces.push(current);
      }
    }
    
    return validFaces.map(box => box.landmarks);
  }
  
  /**
   * Calculate overlap percentage between two face bounding boxes
   * @param {Object} box1 - First face box
   * @param {Object} box2 - Second face box
   * @returns {number} Overlap percentage (0-1)
   */
  calculateOverlap(box1, box2) {
    // Calculate intersection
    const intersectionMinX = Math.max(box1.minX, box2.minX);
    const intersectionMaxX = Math.min(box1.maxX, box2.maxX);
    const intersectionMinY = Math.max(box1.minY, box2.minY);
    const intersectionMaxY = Math.min(box1.maxY, box2.maxY);
    
    if (intersectionMinX >= intersectionMaxX || intersectionMinY >= intersectionMaxY) {
      return 0; // No overlap
    }
    
    const intersectionWidth = intersectionMaxX - intersectionMinX;
    const intersectionHeight = intersectionMaxY - intersectionMinY;
    const intersectionArea = intersectionWidth * intersectionHeight;
    
    // Calculate union
    const unionArea = box1.area + box2.area - intersectionArea;
    
    // Return overlap as percentage of smaller face
    const smallerArea = Math.min(box1.area, box2.area);
    return intersectionArea / smallerArea;
  }
  
  /**
   * Get main student's face (largest/closest to camera)
   * @param {Array} multiFaceLandmarks - Array of face landmarks
   * @returns {Array} Main student's landmarks
   */
  getMainStudentFace(multiFaceLandmarks) {
    if (multiFaceLandmarks.length === 1) {
      return multiFaceLandmarks[0];
    }
    
    // Calculate face size for each face (distance between eye corners)
    const faceSizes = multiFaceLandmarks.map(landmarks => {
      const leftEyeCorner = landmarks[33];  // Left eye outer corner
      const rightEyeCorner = landmarks[263]; // Right eye outer corner
      
      const dx = rightEyeCorner.x - leftEyeCorner.x;
      const dy = rightEyeCorner.y - leftEyeCorner.y;
      
      return Math.sqrt(dx * dx + dy * dy);
    });
    
    // Find largest face (closest to camera)
    let maxSizeIndex = 0;
    let maxSize = faceSizes[0];
    
    for (let i = 1; i < faceSizes.length; i++) {
      if (faceSizes[i] > maxSize) {
        maxSize = faceSizes[i];
        maxSizeIndex = i;
      }
    }
    
    return multiFaceLandmarks[maxSizeIndex];
  }
  
  /**
   * Handle multiple faces detected (VIOLATION)
   * @param {number} faceCount - Number of faces detected
   * @param {number} now - Current timestamp
   * @param {Array} validFaces - Array of valid face landmarks
   */
  handleMultipleFaces(faceCount, now, validFaces) {
    this.stats.multipleFaceFrames++;
    
    // Check if duration threshold exceeded
    if (this.multipleFaceStartTime === null) {
      this.multipleFaceStartTime = now;
      return; // Wait for threshold
    }
    
    const duration = now - this.multipleFaceStartTime;
    
    // Check if exceeded threshold
    if (duration >= this.options.multipleFaceThreshold) {
    // Check cooldown
    const timeSinceLastViolation = now - this.lastMultipleFaceViolation;
    
    if (timeSinceLastViolation >= this.options.multipleFaceCooldown) {
      // REPORT VIOLATION!
      this.reportViolation({
        type: 'multiple_people_detected',
        description: `Phát hiện ${faceCount} người trong khung hình`,
        evidence: {
          faceCount: faceCount,
          maxAllowed: 1,
            duration: Math.round(duration / 1000), // seconds
            threshold: Math.round(this.options.multipleFaceThreshold / 1000),
          timestamp: new Date().toISOString(),
          message: 'Chỉ được phép có 1 sinh viên trong khung hình'
        }
      });
      
      this.lastMultipleFaceViolation = now;
      this.stats.multipleFaceViolations++;
      this.stats.violationsReported++;
      
        // Reset timer to continue monitoring
        this.multipleFaceStartTime = now;
        
        this.log(`🚨 Multiple faces detected: ${faceCount} people (duration: ${Math.round(duration / 1000)}s)`, 'error');
      } else {
        const remaining = Math.round((this.options.multipleFaceCooldown - timeSinceLastViolation) / 1000);
        this.log(`⏳ Multiple face violation cooldown active (${remaining}s remaining)`, 'debug');
      }
    } else {
      const remaining = Math.round((this.options.multipleFaceThreshold - duration) / 1000);
      this.log(`⏱️ Multiple faces for ${Math.round(duration / 1000)}s (${remaining}s until violation)`, 'debug');
    }
  }
  
  /**
   * Calculate gaze direction from face landmarks
   * @param {Array} landmarks - MediaPipe face landmarks
   * @returns {string} Direction: 'center', 'left', 'right', 'up', 'down'
   */
  calculateGazeDirection(landmarks) {
    // MediaPipe Face Mesh landmark indices:
    // Left iris center: 468
    // Right iris center: 473
    // Left eye center: 33
    // Right eye center: 263
    // Nose tip: 1
    
    // Validate iris landmarks exist (requires refineLandmarks: true)
    if (!landmarks[468] || !landmarks[473]) {
      this.log('⚠️ Iris landmarks not found! refineLandmarks may not be enabled', 'warn');
      return 'center';  // Default to center if iris not detected
    }
    
    const leftIris = landmarks[468];
    const rightIris = landmarks[473];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    
    // Validate eye landmarks
    if (!leftEye || !rightEye) {
      this.log('⚠️ Eye landmarks not found!', 'warn');
      return 'center';
    }
    
    // Calculate average iris position
    const irisX = (leftIris.x + rightIris.x) / 2;
    const irisY = (leftIris.y + rightIris.y) / 2;
    
    // Calculate eye center position
    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;
    
    // Calculate gaze vector (from eye center to iris)
    const gazeX = irisX - eyeCenterX;
    const gazeY = irisY - eyeCenterY;
    
    // Debug logging
    if (this.options.debugGaze) {
      this.log(`Gaze: X=${gazeX.toFixed(4)}, Y=${gazeY.toFixed(4)} | Thresholds: H=${this.options.horizontalThreshold}, V=${this.options.verticalThreshold}`, 'debug');
    }
    
    // Determine direction based on thresholds
    const horizontalThreshold = this.options.horizontalThreshold;
    const verticalThreshold = this.options.verticalThreshold;
    
    // Priority: Check vertical first, then horizontal
    // This gives more accurate results for diagonal looks
    
    let direction = 'center';
    
    // Check vertical direction (more strict)
    if (Math.abs(gazeY) > verticalThreshold) {
      direction = gazeY > 0 ? 'down' : 'up';
      if (this.options.debugGaze) {
        this.log(`→ Direction: ${direction.toUpperCase()} (|gazeY|=${Math.abs(gazeY).toFixed(4)} > ${verticalThreshold})`, 'debug');
      }
    }
    // Check horizontal direction
    // NOTE: Direction is INVERTED due to mirror effect (camera perspective vs user perspective)
    // When user looks LEFT, iris moves RIGHT in camera view → gazeX > 0 → we report 'left'
    else if (Math.abs(gazeX) > horizontalThreshold) {
      direction = gazeX > 0 ? 'left' : 'right';  // INVERTED to match user's actual direction
      if (this.options.debugGaze) {
        this.log(`→ Direction: ${direction.toUpperCase()} (|gazeX|=${Math.abs(gazeX).toFixed(4)} > ${horizontalThreshold})`, 'debug');
      }
    } else {
      if (this.options.debugGaze) {
        this.log(`→ Direction: CENTER (below thresholds)`, 'debug');
      }
    }
    
    return direction;
  }
  
  /**
   * Smooth direction to reduce jitter
   * Uses majority voting over last N frames
   * @param {string} direction - Current direction
   * @returns {string} Smoothed direction
   */
  smoothDirection(direction) {
    // Add to history
    this.directionHistory.push(direction);
    
    // Keep only last N frames
    if (this.directionHistory.length > this.historySize) {
      this.directionHistory.shift();
    }
    
    // If history too small, return current
    if (this.directionHistory.length < 3) {
      return direction;
    }
    
    // Count occurrences
    const counts = {};
    this.directionHistory.forEach(dir => {
      counts[dir] = (counts[dir] || 0) + 1;
    });
    
    // Find most common direction (majority vote)
    let maxCount = 0;
    let mostCommon = direction;
    
    Object.keys(counts).forEach(dir => {
      if (counts[dir] > maxCount) {
        maxCount = counts[dir];
        mostCommon = dir;
      }
    });
    
    return mostCommon;
  }
  
  /**
   * Handle direction change
   * @param {string} direction - Current direction
   * @param {number} now - Current timestamp
   */
  handleDirection(direction, now) {
    const previousDirection = this.currentDirection;
    
    // Direction changed
    if (direction !== previousDirection && previousDirection !== 'unknown') {
      this.stats.directionChanges++;
      
      // Notify callback
      if (this.onDirectionChangeCallback) {
        this.onDirectionChangeCallback({
          from: previousDirection,
          to: direction,
          timestamp: now
        });
      }
    }
    
    // Update current direction
    this.currentDirection = direction;
    
    // Handle based on direction
    if (direction === 'center') {
      this.handleLookingAtCenter(now);
    } else {
      this.handleLookingAway(direction, now);
    }
  }
  
  /**
   * Handle looking at center (normal)
   * @param {number} now - Current timestamp
   */
  handleLookingAtCenter(now) {
    // Reset timer
    this.lookingAwayStartTime = null;
    this.lastCenterTime = now;
    
    this.log('👁️ Looking at center', 'debug');
  }
  
  /**
   * Handle looking away from center
   * @param {string} direction - Direction looking
   * @param {number} now - Current timestamp
   */
  handleLookingAway(direction, now) {
    // Start timer if first detection
    if (!this.lookingAwayStartTime) {
      this.lookingAwayStartTime = now;
      this.log(`👀 Started looking ${direction}`, 'debug');
    }
    
    // Check duration
    const duration = now - this.lookingAwayStartTime;
    
    // Check if exceeded threshold
    if (duration >= this.options.lookingAwayThreshold) {
      // Check cooldown
      const timeSinceLastViolation = now - this.lastViolationTime;
      
      if (timeSinceLastViolation >= this.options.violationCooldown) {
        // REPORT VIOLATION!
        this.reportViolation({
          type: 'looking_away',
          description: this.getViolationDescription(direction),
          evidence: {
            direction: direction,
            duration: Math.round(duration / 1000), // seconds
            threshold: Math.round(this.options.lookingAwayThreshold / 1000),
            directionVietnamese: this.getDirectionVietnamese(direction),
            timestamp: new Date().toISOString()
          }
        });
        
        this.lastViolationTime = now;
        this.stats.lookingAwayViolations++;
        this.stats.violationsReported++;
        
        // Reset timer to continue monitoring
        this.lookingAwayStartTime = now;
      } else {
        const remaining = Math.round((this.options.violationCooldown - timeSinceLastViolation) / 1000);
        this.log(`⏳ Violation cooldown active (${remaining}s remaining)`, 'debug');
      }
    } else {
      const remaining = Math.round((this.options.lookingAwayThreshold - duration) / 1000);
      this.log(`⏱️ Looking ${direction} for ${Math.round(duration / 1000)}s (${remaining}s until violation)`, 'debug');
    }
  }
  
  /**
   * Handle no face detected
   * @param {number} now - Current timestamp
   */
  handleNoFace(now) {
    this.stats.noFaceFrames++;
    
    // Reset gaze timers
    this.lookingAwayStartTime = null;
    this.currentDirection = 'unknown';
    
    // Start no face timer if not started
    if (!this.noFaceStartTime) {
      this.noFaceStartTime = now;
      this.log('⚠️ No face detected - timer started', 'warn');
    }
    
    // Check duration
    const duration = now - this.noFaceStartTime;
    
    // If no face for > threshold, report violation
    if (duration >= this.options.noFaceThreshold) {
      const timeSinceLastViolation = now - this.lastNoFaceViolation;
      
      if (timeSinceLastViolation >= this.options.violationCooldown) {
        // REPORT VIOLATION!
        this.reportViolation({
          type: 'face_not_detected',
          description: 'Không phát hiện khuôn mặt sinh viên',
          evidence: {
            duration: Math.round(duration / 1000),
            threshold: Math.round(this.options.noFaceThreshold / 1000),
            timestamp: new Date().toISOString(),
            message: 'Sinh viên cần ở trong khung hình'
          }
        });
        
        this.lastNoFaceViolation = now;
        this.stats.noFaceViolations++;
        this.stats.violationsReported++;
        
        // Reset timer to continue monitoring
        this.noFaceStartTime = now;
      }
    }
  }
  
  /**
   * Get looking away duration
   * @param {number} now - Current timestamp
   * @returns {number} Duration in milliseconds (0 if looking at center)
   */
  getLookingAwayDuration(now) {
    if (!this.lookingAwayStartTime) {
      return 0;
    }
    return now - this.lookingAwayStartTime;
  }
  
  /**
   * Get direction in Vietnamese
   * @param {string} direction - Direction in English
   * @returns {string} Direction in Vietnamese
   */
  getDirectionVietnamese(direction) {
    const map = {
      'left': 'trái',
      'right': 'phải',
      'up': 'trên',
      'down': 'dưới',
      'center': 'trung tâm',
      'unknown': 'không xác định'
    };
    return map[direction] || direction;
  }
  
  /**
   * Get violation description with correct Vietnamese grammar
   * @param {string} direction - Direction in English
   * @returns {string} Violation description in Vietnamese
   */
  getViolationDescription(direction) {
    const descriptions = {
      'left': 'Sinh viên nhìn sang trái quá lâu',
      'right': 'Sinh viên nhìn sang phải quá lâu',
      'up': 'Sinh viên nhìn lên trên quá lâu',
      'down': 'Sinh viên nhìn xuống dưới quá lâu',
      'center': 'Sinh viên đang trong vùng nhìn hợp lệ',
      'unknown': 'Hướng nhìn không xác định'
    };
    return descriptions[direction] || `Sinh viên nhìn ${direction} quá lâu`;
  }
  
  /**
   * Update direction statistics
   * @param {string} direction - Current direction
   */
  updateDirectionStats(direction) {
    switch (direction) {
      case 'center':
        this.stats.centerFrames++;
        break;
      case 'left':
        this.stats.leftFrames++;
        break;
      case 'right':
        this.stats.rightFrames++;
        break;
      case 'up':
        this.stats.upFrames++;
        break;
      case 'down':
        this.stats.downFrames++;
        break;
    }
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
   * Set direction change callback
   * @param {Function} callback - Callback function (change) => void
   */
  setDirectionChangeCallback(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    this.onDirectionChangeCallback = callback;
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
    const total = this.stats.totalFramesProcessed;
    
    return {
      ...this.stats,
      currentDirection: this.currentDirection,
      currentFaceCount: this.currentFaceCount,
      isLookingAway: this.currentDirection !== 'center' && this.currentDirection !== 'unknown',
      lookingAwayDuration: this.getLookingAwayDuration(Date.now()),
      isInitialized: this.isInitialized,
      isProcessing: this.isProcessing,
      lookingAwayTimerActive: this.lookingAwayStartTime !== null,
      noFaceTimerActive: this.noFaceStartTime !== null,
      averageProcessingTime: Math.round(this.stats.averageProcessingTime),
      // Percentages
      centerPercentage: total > 0 ? (this.stats.centerFrames / total * 100).toFixed(1) : 0,
      leftPercentage: total > 0 ? (this.stats.leftFrames / total * 100).toFixed(1) : 0,
      rightPercentage: total > 0 ? (this.stats.rightFrames / total * 100).toFixed(1) : 0,
      upPercentage: total > 0 ? (this.stats.upFrames / total * 100).toFixed(1) : 0,
      downPercentage: total > 0 ? (this.stats.downFrames / total * 100).toFixed(1) : 0,
      multipleFacePercentage: total > 0 ? (this.stats.multipleFaceFrames / total * 100).toFixed(1) : 0,
      noFacePercentage: total > 0 ? (this.stats.noFaceFrames / total * 100).toFixed(1) : 0
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalFramesProcessed: 0,
      centerFrames: 0,
      leftFrames: 0,
      rightFrames: 0,
      upFrames: 0,
      downFrames: 0,
      noFaceFrames: 0,
      multipleFaceFrames: 0,
      singleFaceFrames: 0,
      violationsReported: 0,
      lookingAwayViolations: 0,
      multipleFaceViolations: 0,
      noFaceViolations: 0,
      averageProcessingTime: 0,
      directionChanges: 0
    };
    
    this.directionHistory = [];
    this.log('Statistics reset');
  }
  
  /**
   * Stop detection and cleanup
   */
  async cleanup() {
    try {
      // Stop any ongoing processing
      this.isProcessing = false;
      
      if (this.faceMesh) {
        try {
          // Close MediaPipe instance gracefully
          this.faceMesh.close();
          // Wait a bit to ensure cleanup completes
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (closeError) {
          // Ignore errors during cleanup
          this.log('Warning during FaceMesh cleanup: ' + closeError.message, 'warn');
        }
        this.faceMesh = null;
      }
      
      // Reset state
      this.isInitialized = false;
      this.lookingAwayStartTime = null;
      this.multipleFaceStartTime = null; // Reset multiple face timer
      this.noFaceStartTime = null;
      this.currentDirection = 'unknown';
      this.currentFaceCount = 0;
      this.directionHistory = [];
      
      this.log('✅ Detector cleaned up');
    } catch (error) {
      console.error('Error during cleanup:', error);
      // Ensure state is reset even if cleanup fails
      this.isInitialized = false;
      this.faceMesh = null;
    }
  }
  
  /**
   * Logging utility
   * @param {string} message - Log message
   * @param {string} level - Log level (log, warn, error, debug)
   */
  log(message, level = 'log') {
    if (!this.options.enableLogging && level === 'debug') return;
    
    const prefix = '[GazeDirectionDetector]';
    
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

export default GazeDirectionDetector;

