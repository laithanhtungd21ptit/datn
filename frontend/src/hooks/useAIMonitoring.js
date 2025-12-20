/**
 * useAIMonitoring - React Hook for AI Monitoring
 * 
 * Easy-to-use React hook that manages AIMonitoringService lifecycle
 * 
 * FEATURES:
 * - Automatic initialization
 * - Automatic cleanup on unmount
 * - State management (violations, status, stats)
 * - Error handling
 * - TypeScript-ready
 * 
 * USAGE:
 * ```javascript
 * const {
 *   violations,
 *   isInitialized,
 *   isMonitoring,
 *   cameraReady,
 *   gazeDirection,
 *   startMonitoring,
 *   stopMonitoring,
 *   clearViolations,
 *   stats,
 *   error
 * } = useAIMonitoring({
 *   autoStart: false,
 *   onViolation: (v) => console.log(v)
 * });
 * ```
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import AIMonitoringService from '../services/AIMonitoringService';

const useAIMonitoring = (options = {}) => {
  const {
    autoStart = false,
    detectionInterval = 500,
    enableFaceDetection = true,
    enableGazeDetection = true,
    onViolation,
    onError,
    onCameraReady
  } = options;
  
  // State
  const [violations, setViolations] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [gazeDirection, setGazeDirection] = useState('unknown');
  const [isLookingAway, setIsLookingAway] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  
  // Refs
  const aiMonitoringRef = useRef(null);
  const statsIntervalRef = useRef(null);
  
  /**
   * Initialize AI monitoring
   */
  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      setError(null);
      
      const aiMonitoring = new AIMonitoringService({
        detectionInterval,
        enableFaceDetection,
        enableGazeDetection,
        enableLogging: true,
        
        onCameraReady: (videoElement) => {
          setCameraReady(true);
          if (onCameraReady) {
            onCameraReady(videoElement);
          }
        },
        
        onError: (err) => {
          setError(err.message);
          if (onError) {
            onError(err);
          }
        }
      });
      
      await aiMonitoring.initialize();
      
      // Setup callbacks
      aiMonitoring.setViolationCallback((violation) => {
        setViolations(prev => [...prev, violation]);
        if (onViolation) {
          onViolation(violation);
        }
      });
      
      aiMonitoring.setStatusChangeCallback((status) => {
        setGazeDirection(status.direction);
        setIsLookingAway(status.lookingAway);
      });
      
      aiMonitoringRef.current = aiMonitoring;
      setIsInitialized(true);
      
      // Start stats polling
      statsIntervalRef.current = setInterval(() => {
        if (aiMonitoringRef.current) {
          setStats(aiMonitoringRef.current.getStats());
        }
      }, 1000);
      
    } catch (err) {
      const errorMessage = err.message || 'Initialization failed';
      setError(errorMessage);
      if (onError) {
        onError({ message: errorMessage, error: err });
      }
      throw err;
    }
  }, [
    isInitialized,
    detectionInterval,
    enableFaceDetection,
    enableGazeDetection,
    onViolation,
    onError,
    onCameraReady
  ]);
  
  /**
   * Start monitoring
   */
  const startMonitoring = useCallback(async () => {
    if (!isInitialized) {
      await initialize();
    }
    
    if (aiMonitoringRef.current && !isMonitoring) {
      try {
        await aiMonitoringRef.current.startMonitoring();
        setIsMonitoring(true);
      } catch (err) {
        setError(err.message);
        throw err;
      }
    }
  }, [isInitialized, isMonitoring, initialize]);
  
  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (aiMonitoringRef.current && isMonitoring) {
      aiMonitoringRef.current.stopMonitoring();
      setIsMonitoring(false);
    }
  }, [isMonitoring]);
  
  /**
   * Clear violations
   */
  const clearViolations = useCallback(() => {
    setViolations([]);
    if (aiMonitoringRef.current) {
      aiMonitoringRef.current.clearViolations();
    }
  }, []);
  
  /**
   * Get video element
   */
  const getVideoElement = useCallback(() => {
    return aiMonitoringRef.current?.getVideoElement();
  }, []);
  
  /**
   * Get AI monitoring service (advanced usage)
   */
  const getService = useCallback(() => {
    return aiMonitoringRef.current;
  }, []);
  
  /**
   * Auto-start if enabled
   */
  useEffect(() => {
    if (autoStart) {
      startMonitoring();
    }
  }, [autoStart, startMonitoring]);
  
  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
      
      if (aiMonitoringRef.current) {
        aiMonitoringRef.current.cleanup();
      }
    };
  }, []);
  
  return {
    // State
    violations,
    isInitialized,
    isMonitoring,
    cameraReady,
    gazeDirection,
    isLookingAway,
    stats,
    error,
    
    // Actions
    initialize,
    startMonitoring,
    stopMonitoring,
    clearViolations,
    getVideoElement,
    getService,
    
    // Computed
    hasViolations: violations.length > 0,
    violationCount: violations.length
  };
};

export default useAIMonitoring;

