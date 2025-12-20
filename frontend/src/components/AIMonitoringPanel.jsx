/**
 * AIMonitoringPanel
 * 
 * React component for displaying AI monitoring status
 * Shows camera feed, gaze direction, face count, and violations
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Alert,
  Grid,
  LinearProgress
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Face as FaceIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const AIMonitoringPanel = ({ 
  aiMonitoring, 
  isActive = false,
  showVideo = true,
  showStats = true 
}) => {
  const videoContainerRef = useRef(null);
  const [gazeDirection, setGazeDirection] = useState('unknown');
  const [isLookingAway, setIsLookingAway] = useState(false);
  const [lookingAwayDuration, setLookingAwayDuration] = useState(0);
  const [stats, setStats] = useState(null);
  
  // Update stats periodically
  useEffect(() => {
    if (!aiMonitoring || !isActive) return;
    
    const interval = setInterval(() => {
      const currentStats = aiMonitoring.getStats();
      setStats(currentStats);
    }, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, [aiMonitoring, isActive]);
  
  // Setup video element
  useEffect(() => {
    if (!aiMonitoring || !showVideo || !videoContainerRef.current) return;
    
    const videoElement = aiMonitoring.getVideoElement();
    if (!videoElement) {
      // Try to get video element from service directly
      const service = aiMonitoring;
      if (service && service.videoElement) {
        const video = service.videoElement;
        videoContainerRef.current.innerHTML = '';
        videoContainerRef.current.appendChild(video);
        
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.minHeight = '320px';
        video.style.objectFit = 'cover';
        video.style.borderRadius = '8px';
        video.style.transform = 'scaleX(-1)'; // Mirror video
      }
      return;
    }
    
    // Add video to container
    videoContainerRef.current.innerHTML = '';
    videoContainerRef.current.appendChild(videoElement);
    
    // Style video - larger and taller
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.style.minHeight = '320px';
    videoElement.style.objectFit = 'cover';
    videoElement.style.borderRadius = '8px';
    videoElement.style.transform = 'scaleX(-1)'; // Mirror video
    
  }, [aiMonitoring, showVideo, isActive]);
  
  // Setup status callback
  useEffect(() => {
    if (!aiMonitoring) return;
    
    aiMonitoring.setStatusChangeCallback((status) => {
      setGazeDirection(status.direction);
      setIsLookingAway(status.lookingAway);
      setLookingAwayDuration(Math.round(status.duration / 1000));
    });
  }, [aiMonitoring]);
  
  // Direction colors
  const getDirectionColor = (dir) => {
    if (dir === 'center') return 'success';
    if (dir === 'unknown') return 'default';
    return 'warning';
  };
  
  // Direction icon
  const getDirectionIcon = (dir) => {
    const style = { fontSize: 40 };
    switch (dir) {
      case 'left': return <span style={style}>←</span>;
      case 'right': return <span style={style}>→</span>;
      case 'up': return <span style={style}>↑</span>;
      case 'down': return <span style={style}>↓</span>;
      case 'center': return <VisibilityIcon sx={style} />;
      default: return <VisibilityIcon sx={style} color="disabled" />;
    }
  };
  
  // Vietnamese direction name
  const getDirectionVietnamese = (dir) => {
    const map = {
      'left': 'Trái',
      'right': 'Phải',
      'up': 'Trên',
      'down': 'Dưới',
      'center': 'Trung tâm',
      'unknown': 'Không xác định'
    };
    return map[dir] || dir;
  };
  
  if (!aiMonitoring) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="info">
          AI Monitoring chưa được khởi tạo
        </Alert>
      </Paper>
    );
  }
  
  // Check if camera is actually ready by checking video element or service state
  // aiMonitoring can be either the service instance or have getVideoElement method
  const checkCameraReady = () => {
    if (isActive) return true;
    if (!aiMonitoring) return false;
    
    // Check if it's a service instance with cameraReady property
    if (aiMonitoring.cameraReady !== undefined) {
      return aiMonitoring.cameraReady;
    }
    
    // Check if video element exists
    try {
      const videoElement = aiMonitoring.getVideoElement ? aiMonitoring.getVideoElement() : null;
      if (videoElement && videoElement.readyState >= 2) {
        return true; // Video is loaded enough to play
      }
    } catch (e) {
      // Ignore errors
    }
    
    return false;
  };
  
  const cameraReady = checkCameraReady();
  
  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {cameraReady ? (
          <VideocamIcon color="success" sx={{ mr: 1 }} />
        ) : (
          <VideocamOffIcon color="disabled" sx={{ mr: 1 }} />
        )}
        
        <Box sx={{ ml: 'auto' }}>
          <Chip 
            label={cameraReady ? 'Active' : 'Inactive'}
            color={cameraReady ? 'success' : 'default'}
            size="small"
          />
        </Box>
      </Box>
      
      {/* Video Feed */}
      {showVideo && (
        <Box 
          ref={videoContainerRef}
          sx={{ 
            mb: 2,
            bgcolor: '#000',
            borderRadius: 1,
            minHeight: 320,
            maxHeight: 400,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {!cameraReady && (
            <Typography color="white" sx={{ position: 'absolute', zIndex: 1 }}>
              Camera chưa được bật
            </Typography>
          )}
        </Box>
      )}
      
      {/* Gaze Direction - Only show if showStats is true */}
      {isActive && showStats && (
        <>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Hướng Nhìn
              </Typography>
              
              <Box sx={{ my: 2 }}>
                {getDirectionIcon(gazeDirection)}
              </Box>
              
              <Chip 
                label={getDirectionVietnamese(gazeDirection)}
                color={getDirectionColor(gazeDirection)}
                sx={{ mb: 1 }}
              />
              
              {isLookingAway && lookingAwayDuration > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="warning" icon={<WarningIcon />}>
                    Nhìn đi chỗ khác: {lookingAwayDuration}s
                  </Alert>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min((lookingAwayDuration / 5) * 100, 100)}
                    color="warning"
                    sx={{ mt: 1 }}
                  />
                </Box>
              )}
            </Box>
          </Paper>
          
          {/* Direction Indicator (Compass) */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom align="center">
              Chỉ Báo Hướng
            </Typography>
            <Box 
              sx={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 1,
                maxWidth: 200,
                mx: 'auto',
                mt: 2
              }}
            >
              <div />
              <Box sx={{ 
                textAlign: 'center', 
                fontSize: 24,
                color: gazeDirection === 'up' ? 'error.main' : 'text.disabled'
              }}>
                ↑
              </Box>
              <div />
              
              <Box sx={{ 
                textAlign: 'center', 
                fontSize: 24,
                color: gazeDirection === 'left' ? 'error.main' : 'text.disabled'
              }}>
                ←
              </Box>
              <Box sx={{ 
                textAlign: 'center', 
                fontSize: 24,
                color: gazeDirection === 'center' ? 'success.main' : 'text.disabled',
                fontWeight: 'bold'
              }}>
                ⊙
              </Box>
              <Box sx={{ 
                textAlign: 'center', 
                fontSize: 24,
                color: gazeDirection === 'right' ? 'error.main' : 'text.disabled'
              }}>
                →
              </Box>
              
              <div />
              <Box sx={{ 
                textAlign: 'center', 
                fontSize: 24,
                color: gazeDirection === 'down' ? 'error.main' : 'text.disabled'
              }}>
                ↓
              </Box>
              <div />
            </Box>
          </Paper>
        </>
      )}
      
      {/* Statistics */}
      {showStats && stats && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            📊 Thống Kê
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Detections
              </Typography>
              <Typography variant="h6">
                {stats.totalDetections || 0}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Violations
              </Typography>
              <Typography variant="h6" color="error">
                {stats.totalViolations || 0}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Uptime
              </Typography>
              <Typography variant="body2">
                {stats.uptime || 0}s
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Avg Time
              </Typography>
              <Typography variant="body2">
                {stats.averageDetectionTime || 0}ms
              </Typography>
            </Grid>
          </Grid>
          
          {/* Detailed Stats */}
          {stats.gazeDetectorStats && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Phân Bố Hướng Nhìn:
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">Center</Typography>
                  <Typography variant="caption">{stats.gazeDetectorStats.centerPercentage}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={parseFloat(stats.gazeDetectorStats.centerPercentage) || 0}
                  color="success"
                  sx={{ mb: 1 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">Left</Typography>
                  <Typography variant="caption">{stats.gazeDetectorStats.leftPercentage}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={parseFloat(stats.gazeDetectorStats.leftPercentage) || 0}
                  color="warning"
                  sx={{ mb: 1 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">Right</Typography>
                  <Typography variant="caption">{stats.gazeDetectorStats.rightPercentage}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={parseFloat(stats.gazeDetectorStats.rightPercentage) || 0}
                  color="warning"
                  sx={{ mb: 1 }}
                />
              </Box>
            </Box>
          )}
          
        </Paper>
      )}
    </Paper>
  );
};

export default AIMonitoringPanel;

