import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Button, Slider, Grid, Tabs, Tab, ToggleButtonGroup, ToggleButton,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  List, ListItem, ListItemText, ListItemSecondaryAction, Tooltip, Switch, FormControlLabel,
  LinearProgress, Card, CardContent, CardActions, Divider
} from '@mui/material';
import {
  Videocam, PlayArrow, Stop, Download, Save, Upload, Info, ZoomIn, ZoomOut,
  CameraAlt, ColorLens, Timeline, GridOn, Settings, CameraEnhance, ViewInAr
} from '@mui/icons-material';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer as ThreeEffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Shot Types
const SHOT_TYPES = {
  'extreme-wide': { name: 'Extreme Wide Shot', fov: 90, distance: 20, description: 'Cho thấy toàn bộ cảnh quan và bối cảnh' },
  'wide': { name: 'Wide Shot', fov: 65, distance: 12, description: 'Hiển thị toàn bộ chủ thể và môi trường xung quanh' },
  'medium-wide': { name: 'Medium Wide Shot', fov: 50, distance: 8, description: 'Hiển thị chủ thể từ đầu đến chân' },
  'medium': { name: 'Medium Shot', fov: 40, distance: 6, description: 'Hiển thị chủ thể từ thắt lưng trở lên' },
  'medium-close': { name: 'Medium Close-up', fov: 35, distance: 4, description: 'Hiển thị chủ thể từ ngực trở lên' },
  'close-up': { name: 'Close-up', fov: 30, distance: 2.5, description: 'Tập trung vào khuôn mặt hoặc chi tiết nhỏ' },
  'extreme-close': { name: 'Extreme Close-up', fov: 25, distance: 1.5, description: 'Chi tiết cực kỳ gần, chỉ một phần của khuôn mặt' },
};

// Camera Movements
const CAMERA_MOVEMENTS = {
  'static': { name: 'Tĩnh', icon: '📷', description: 'Camera đứng yên' },
  'pan-left': { name: 'Pan Trái', icon: '⬅️', description: 'Quay ngang sang trái' },
  'pan-right': { name: 'Pan Phải', icon: '➡️', description: 'Quay ngang sang phải' },
  'tilt-up': { name: 'Tilt Lên', icon: '⬆️', description: 'Quay dọc lên trên' },
  'tilt-down': { name: 'Tilt Xuống', icon: '⬇️', description: 'Quay dọc xuống dưới' },
  'dolly-in': { name: 'Dolly Vào', icon: '🔍', description: 'Di chuyển camera tiến về phía trước' },
  'dolly-out': { name: 'Dolly Ra', icon: '🔎', description: 'Di chuyển camera lùi ra phía sau' },
  'tracking-left': { name: 'Tracking Trái', icon: '◀️', description: 'Di chuyển camera sang trái song song' },
  'tracking-right': { name: 'Tracking Phải', icon: '▶️', description: 'Di chuyển camera sang phải song song' },
  'crane-up': { name: 'Crane Lên', icon: '⬆️📷', description: 'Nâng camera lên cao' },
  'crane-down': { name: 'Crane Xuống', icon: '⬇️📷', description: 'Hạ camera xuống thấp' },
  'orbit-left': { name: 'Orbit Trái', icon: '🔄', description: 'Xoay quanh chủ thể theo chiều kim đồng hồ' },
  'orbit-right': { name: 'Orbit Phải', icon: '🔄', description: 'Xoay quanh chủ thể ngược chiều kim đồng hồ' },
};

// Color Grading Presets (LUTs simulation)
const COLOR_PRESETS = {
  'none': { name: 'Không áp dụng', temp: 5500, sat: 1.0, contrast: 1.0, brightness: 0 },
  'cinematic': { name: 'Cinematic', temp: 6200, sat: 1.1, contrast: 1.2, brightness: 0.1 },
  'warm': { name: 'Warm', temp: 7500, sat: 1.15, contrast: 1.1, brightness: 0.05 },
  'cool': { name: 'Cool', temp: 4500, sat: 0.95, contrast: 1.15, brightness: 0 },
  'vintage': { name: 'Vintage', temp: 5800, sat: 0.8, contrast: 1.3, brightness: -0.1 },
  'dramatic': { name: 'Dramatic', temp: 5000, sat: 0.9, contrast: 1.4, brightness: -0.15 },
  'bright': { name: 'Bright', temp: 6000, sat: 1.2, contrast: 0.95, brightness: 0.2 },
};

export default function FramingGamePage() {
  // Basic Settings
  const [grid, setGrid] = useState('ruleOfThirds');
  const [safeArea, setSafeArea] = useState(10);
  const [aspect, setAspect] = useState('16:9');
  const [showGrid, setShowGrid] = useState(true);
  const [showSafeArea, setShowSafeArea] = useState(true);

  // Shot & Camera
  const [shotType, setShotType] = useState('medium');
  const [cameraMovement, setCameraMovement] = useState('static');
  const [cameraSpeed, setCameraSpeed] = useState(0.5);

  // Camera Settings
  const [aperture, setAperture] = useState(5.6);
  const [shutter, setShutter] = useState(1 / 60);
  const [iso, setIso] = useState(400);
  const [frameRate, setFrameRate] = useState(30);
  const [whiteBalance, setWhiteBalance] = useState(5500);

  // Color Grading
  const [colorPreset, setColorPreset] = useState('none');
  const [colorTemp, setColorTemp] = useState(5500);
  const [saturation, setSaturation] = useState(1.0);
  const [contrast, setContrast] = useState(1.0);
  const [brightness, setBrightness] = useState(0);

  // Focus
  const [focusDistance, setFocusDistance] = useState(6);
  const [focusTracking, setFocusTracking] = useState(false);
  const [focusObject, setFocusObject] = useState(null);

  // Recording & Timeline
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedClips, setRecordedClips] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [clipDuration, setClipDuration] = useState(10);
  const [timelineClips, setTimelineClips] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);

  // Storyboard
  const [storyboard, setStoryboard] = useState([]);
  const [viewMode, setViewMode] = useState('live'); // live, storyboard, timeline

  // UI State
  const [tab, setTab] = useState(0);
  const [exportDialog, setExportDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [infoDialog, setInfoDialog] = useState(null);

  // Refs
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const composerRef = useRef(null);
  const bokehPassRef = useRef(null);
  const colorPassRef = useRef(null);
  const cameraPositionRef = useRef({ x: 0, y: 2, z: 6 });
  const cameraRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const animationFrameRef = useRef(0);
  const recordingFramesRef = useRef([]);
  const playbackTimeRef = useRef(0);

  const apertureValues = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
  const shutterValues = [
    { display: '1/4000', value: 1/4000 }, { display: '1/2000', value: 1/2000 },
    { display: '1/1000', value: 1/1000 }, { display: '1/500', value: 1/500 },
    { display: '1/250', value: 1/250 }, { display: '1/125', value: 1/125 },
    { display: '1/60', value: 1/60 }, { display: '1/30', value: 1/30 },
  ];
  const frameRateValues = [24, 30, 60, 120];

  // Apply shot type
  useEffect(() => {
    const shot = SHOT_TYPES[shotType];
    if (shot && cameraRef.current) {
      cameraRef.current.fov = shot.fov;
      cameraPositionRef.current.z = shot.distance;
      if (cameraRef.current.updateProjectionMatrix) {
        cameraRef.current.updateProjectionMatrix();
      }
    }
  }, [shotType]);

  // Apply color preset
  useEffect(() => {
    if (colorPreset !== 'none' && COLOR_PRESETS[colorPreset]) {
      const preset = COLOR_PRESETS[colorPreset];
      setColorTemp(preset.temp);
      setSaturation(preset.sat);
      setContrast(preset.contrast);
      setBrightness(preset.brightness);
    }
  }, [colorPreset]);

  // Recording logic
  const startRecording = () => {
    setIsRecording(true);
    recordingFramesRef.current = [];
    setCurrentTime(0);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingFramesRef.current.length > 0) {
      const clip = {
        id: Date.now(),
        frames: recordingFramesRef.current,
        settings: {
          shotType,
          cameraMovement,
          aperture,
          shutter,
          iso,
          frameRate,
          colorTemp,
          saturation,
          contrast,
          brightness,
          focusDistance,
        },
        duration: currentTime,
        thumbnail: recordingFramesRef.current[0]?.data || null,
      };
      setRecordedClips(prev => [...prev, clip].slice(-10));
      setTimelineClips(prev => [...prev, { clip, startTime: 0, endTime: currentTime }]);
    }
  };

  // Playback logic
  const startPlayback = () => {
    if (selectedClip || timelineClips.length > 0) {
      setIsPlaying(true);
      playbackTimeRef.current = 0;
    }
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    playbackTimeRef.current = 0;
  };

  // Export/Import
  const exportProject = () => {
    const project = {
      clips: recordedClips,
      timeline: timelineClips,
      storyboard,
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cinematography-project-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDialog(false);
  };

  const importProject = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const project = JSON.parse(e.target.result);
          if (project.clips) setRecordedClips(project.clips);
          if (project.timeline) setTimelineClips(project.timeline);
          if (project.storyboard) setStoryboard(project.storyboard);
          setImportDialog(false);
        } catch (err) {
          alert('Lỗi khi đọc file dự án');
        }
      };
      reader.readAsText(file);
    }
  };

  // Add to storyboard
  const addToStoryboard = () => {
    const shot = {
      id: Date.now(),
      shotType,
      cameraMovement,
      description: `${SHOT_TYPES[shotType].name} - ${CAMERA_MOVEMENTS[cameraMovement].name}`,
      settings: { aperture, shutter, iso, frameRate, colorTemp, saturation, contrast },
    };
    setStoryboard(prev => [...prev, shot]);
  };

  // Download frame
  const downloadFrame = () => {
    const gl = rendererRef.current;
    if (gl) {
      const dataURL = gl.domElement.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = `frame-${Date.now()}.png`;
      a.click();
    }
  };

  // 3D Scene Component
  const Scene = () => {
    const { gl, scene, camera, size } = useThree();
    
    useEffect(() => {
      gl.outputColorSpace = THREE.SRGBColorSpace;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      rendererRef.current = gl;
      sceneRef.current = scene;
      cameraRef.current = camera;
      camera.position.set(0, 2, 6);

      // Setup post-processing
      const composer = new ThreeEffectComposer(gl);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      // Bokeh/Dof
      const bokeh = new BokehPass(scene, camera, {
        focus: focusDistance,
        aperture: Math.min(0.06, Math.max(0.001, (1.8 / aperture) * 0.03)),
        maxblur: 0.02,
      });
      composer.addPass(bokeh);
      bokehPassRef.current = bokeh;

      // Color correction shader
      const colorCorrectionShader = {
        uniforms: {
          tDiffuse: { value: null },
          tint: { value: 1.0 },
          saturation: { value: 1.0 },
          contrast: { value: 1.0 },
          brightness: { value: 0.0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float tint;
          uniform float saturation;
          uniform float contrast;
          uniform float brightness;
          varying vec2 vUv;
          
          vec3 adjustTemperature(vec3 color, float temp) {
            float tempFactor = (temp - 5500.0) / 5500.0;
            if (tempFactor > 0.0) {
              color.r += tempFactor * 0.2;
              color.b -= tempFactor * 0.1;
            } else {
              color.r += tempFactor * 0.1;
              color.b -= tempFactor * 0.2;
            }
            return color;
          }
          
          void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            vec3 color = texel.rgb;
            
            // Adjust temperature (tint)
            color = adjustTemperature(color, tint);
            
            // Adjust saturation
            float gray = dot(color, vec3(0.299, 0.587, 0.114));
            color = mix(vec3(gray), color, saturation);
            
            // Adjust contrast
            color = (color - 0.5) * contrast + 0.5;
            
            // Adjust brightness
            color += brightness;
            
            gl_FragColor = vec4(color, texel.a);
          }
        `,
      };
      const colorPass = new ShaderPass(colorCorrectionShader);
      composer.addPass(colorPass);
      colorPassRef.current = colorPass;

      composer.setSize(size.width, size.height);
      composerRef.current = composer;

      return () => {
        composer.dispose();
      };
    }, []);

    useEffect(() => {
      if (composerRef.current) composerRef.current.setSize(size.width, size.height);
    }, [size]);

    // Camera movement animation
    useFrame((state, delta) => {
      const pos = cameraPositionRef.current;
      const rot = cameraRotationRef.current;
      const movement = CAMERA_MOVEMENTS[cameraMovement];
      const speed = cameraSpeed * delta * 2;

      // Apply camera movements
      if (cameraMovement === 'pan-left') rot.y += speed;
      else if (cameraMovement === 'pan-right') rot.y -= speed;
      else if (cameraMovement === 'tilt-up') rot.x += speed * 0.5;
      else if (cameraMovement === 'tilt-down') rot.x -= speed * 0.5;
      else if (cameraMovement === 'dolly-in') pos.z -= speed * 2;
      else if (cameraMovement === 'dolly-out') pos.z += speed * 2;
      else if (cameraMovement === 'tracking-left') pos.x -= speed;
      else if (cameraMovement === 'tracking-right') pos.x += speed;
      else if (cameraMovement === 'crane-up') pos.y += speed;
      else if (cameraMovement === 'crane-down') pos.y -= speed;
      else if (cameraMovement === 'orbit-left') {
        const angle = speed;
        const radius = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        rot.y += angle;
        pos.x = Math.sin(rot.y) * radius;
        pos.z = Math.cos(rot.y) * radius;
      } else if (cameraMovement === 'orbit-right') {
        const angle = -speed;
        const radius = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        rot.y += angle;
        pos.x = Math.sin(rot.y) * radius;
        pos.z = Math.cos(rot.y) * radius;
      }

      // Update camera position and rotation
      camera.position.lerp(new THREE.Vector3(pos.x, pos.y, pos.z), 0.1);
      camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, rot.x, 0.1);
      camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, rot.y, 0.1);

      // Update bokeh
      if (bokehPassRef.current) {
        bokehPassRef.current.materialBokeh.uniforms['focus'].value = focusDistance;
        bokehPassRef.current.materialBokeh.uniforms['aperture'].value = Math.min(0.06, Math.max(0.001, (1.8 / aperture) * 0.03));
      }

      // Update color correction
      if (colorPassRef.current) {
        const tempFactor = (colorTemp - 5500) / 5500;
        colorPassRef.current.uniforms['tint'].value = colorTemp;
        colorPassRef.current.uniforms['saturation'].value = saturation;
        colorPassRef.current.uniforms['contrast'].value = contrast;
        colorPassRef.current.uniforms['brightness'].value = brightness;
      }

      // Exposure
      const baseF = 5.6, baseShutter = 1 / 60, baseIso = 400;
      const apertureStops = Math.log2((baseF * baseF) / (aperture * aperture));
      const shutterStops = Math.log2(shutter / baseShutter);
      const isoStops = Math.log2(iso / baseIso);
      const exposure = Math.pow(2, apertureStops + shutterStops + isoStops);
      gl.toneMappingExposure = THREE.MathUtils.lerp(gl.toneMappingExposure || 1, Math.min(Math.max(exposure, 0.25), 4), 0.15);

      // Recording
      if (isRecording) {
        setCurrentTime(prev => prev + delta);
        if (animationFrameRef.current % Math.floor(frameRate / 30) === 0) {
          recordingFramesRef.current.push({
            time: currentTime,
            data: gl.domElement.toDataURL('image/png'),
            position: { ...pos },
            rotation: { ...rot },
          });
        }
      }

      // Playback
      if (isPlaying && timelineClips.length > 0) {
        playbackTimeRef.current += delta;
        // Simulate playback by updating camera from recorded frames
        const clip = timelineClips[0]?.clip;
        if (clip && clip.frames.length > 0) {
          const frameIndex = Math.floor((playbackTimeRef.current % clip.duration) * frameRate);
          const frame = clip.frames[frameIndex];
          if (frame) {
            cameraPositionRef.current = frame.position;
            cameraRotationRef.current = frame.rotation;
          }
        }
      }

      animationFrameRef.current++;

      // Render
      if (composerRef.current) composerRef.current.render();
      else gl.render(scene, camera);
    });

    // Scene objects
    return (
      <>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, 5, -5]} intensity={0.5} />
        
        {/* Character/subject */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 2, 1]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        
        {/* Additional scene elements */}
        <mesh position={[-3, 0, -2]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color="#4169E1" />
        </mesh>
        
        <mesh position={[3, 0, -2]}>
          <coneGeometry args={[0.7, 1.5, 8]} />
          <meshStandardMaterial color="#228B22" />
        </mesh>
        
        <mesh position={[0, 0, -5]} rotation={[0, Math.PI / 4, 0]}>
          <torusGeometry args={[1, 0.3, 16, 100]} />
          <meshStandardMaterial color="#FF6347" />
        </mesh>

        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#555555" />
        </mesh>

        <Sky sunPosition={[100, 20, 100]} />
      </>
    );
  };

  const [aspectWidth, aspectHeight] = useMemo(() => {
    switch (aspect) {
      case '4:3': return [800, 600];
      case '1:1': return [700, 700];
      case '9:16': return [540, 960];
      case '16:9':
      default: return [960, 540];
    }
  }, [aspect]);

  return (
    <Box>
      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant={isRecording ? 'contained' : 'outlined'}
            color="error"
            startIcon={isRecording ? <Stop /> : <Videocam />}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? 'Dừng ghi' : 'Bắt đầu ghi'}
          </Button>
          <Button
            variant={isPlaying ? 'contained' : 'outlined'}
            color="primary"
            startIcon={isPlaying ? <Stop /> : <PlayArrow />}
            onClick={isPlaying ? stopPlayback : startPlayback}
            disabled={timelineClips.length === 0}
          >
            {isPlaying ? 'Dừng' : 'Phát'}
          </Button>
          <Button variant="outlined" startIcon={<Download />} onClick={downloadFrame}>
            Tải frame
          </Button>
          <Button variant="outlined" startIcon={<Save />} onClick={() => setExportDialog(true)}>
            Xuất dự án
          </Button>
          <Button variant="outlined" startIcon={<Upload />} onClick={() => setImportDialog(true)}>
            Nhập dự án
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <FormControlLabel
            control={<Switch checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />}
            label="Hiển thị lưới"
          />
          <FormControlLabel
            control={<Switch checked={showSafeArea} onChange={(e) => setShowSafeArea(e.target.checked)} />}
            label="Vùng an toàn"
          />
        </Box>
        {isRecording && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress />
            <Typography variant="caption" color="error">
              Đang ghi: {currentTime.toFixed(1)}s / {clipDuration.toFixed(1)}s
            </Typography>
          </Box>
        )}
      </Paper>

      <Grid container spacing={2}>
        {/* Main Viewport */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Xem trước</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <ToggleButtonGroup
                  size="small"
                  value={viewMode}
                  exclusive
                  onChange={(e, v) => v && setViewMode(v)}
                >
                  <ToggleButton value="live">Live</ToggleButton>
                  <ToggleButton value="storyboard">Storyboard</ToggleButton>
                  <ToggleButton value="timeline">Timeline</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>

            {viewMode === 'live' && (
              <Box
                sx={{
                  width: '100%',
                  height: '60vh',
                  bgcolor: '#000',
                  borderRadius: 2,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <Canvas>
                  <PerspectiveCamera makeDefault position={[0, 2, 6]} />
                  <Scene />
                  <OrbitControls enableDamping={false} enabled={false} />
                </Canvas>

                {/* Grid overlay */}
                {showGrid && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      p: `${safeArea}%`,
                    }}
                  >
                    {grid === 'ruleOfThirds' && (
                      <>
                        <Box sx={{ position: 'absolute', top: '33.333%', left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.6)' }} />
                        <Box sx={{ position: 'absolute', top: '66.666%', left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.6)' }} />
                        <Box sx={{ position: 'absolute', left: '33.333%', top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.6)' }} />
                        <Box sx={{ position: 'absolute', left: '66.666%', top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.6)' }} />
                      </>
                    )}
                    {grid === 'goldenRatio' && (
                      <>
                        <Box sx={{ position: 'absolute', top: '38.2%', left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.6)' }} />
                        <Box sx={{ position: 'absolute', left: '38.2%', top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.6)' }} />
                      </>
                    )}
                    {grid === 'center' && (
                      <>
                        <Box sx={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px dashed rgba(255,255,255,0.6)' }} />
                        <Box sx={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1px dashed rgba(255,255,255,0.6)' }} />
                      </>
                    )}
                  </Box>
                )}

                {/* Safe area */}
                {showSafeArea && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      p: `${safeArea}%`,
                      pointerEvents: 'none',
                      boxShadow: '0 0 0 2px rgba(255,255,0,0.4) inset',
                    }}
                  />
                )}
              </Box>
            )}

            {viewMode === 'storyboard' && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1">Storyboard ({storyboard.length} shots)</Typography>
                  <Button size="small" onClick={addToStoryboard}>
                    Thêm shot hiện tại
                  </Button>
                </Box>
                <Grid container spacing={2}>
                  {storyboard.map((shot) => (
                    <Grid item xs={12} sm={6} md={4} key={shot.id}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2">{shot.description}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {SHOT_TYPES[shot.shotType]?.name} - {CAMERA_MOVEMENTS[shot.cameraMovement]?.name}
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <Button size="small" onClick={() => {
                            setShotType(shot.shotType);
                            setCameraMovement(shot.cameraMovement);
                            setViewMode('live');
                          }}>
                            Áp dụng
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {viewMode === 'timeline' && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Timeline ({timelineClips.length} clips)
                </Typography>
                <Box sx={{ bgcolor: '#1a1a1a', p: 2, borderRadius: 1, minHeight: 200 }}>
                  {timelineClips.map((item, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        bgcolor: selectedClip === item.clip.id ? 'primary.main' : 'primary.dark',
                        p: 1,
                        mb: 1,
                        borderRadius: 1,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onClick={() => setSelectedClip(item.clip.id)}
                    >
                      <Typography variant="caption">
                        Clip {idx + 1}: {item.clip.duration.toFixed(1)}s
                      </Typography>
                      <Chip size="small" label={SHOT_TYPES[item.clip.settings.shotType]?.name} />
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Controls Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Tabs value={tab} onChange={(e, v) => setTab(v)}>
              <Tab label="Thiết lập" icon={<Settings />} iconPosition="start" />
              <Tab label="Camera" icon={<CameraAlt />} iconPosition="start" />
              <Tab label="Màu sắc" icon={<ColorLens />} iconPosition="start" />
              <Tab label="Clips" icon={<Videocam />} iconPosition="start" />
            </Tabs>

            <Box sx={{ mt: 2, maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Tab 0: Basic Settings */}
              {tab === 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Lưới hỗ trợ
                  </Typography>
                  <ToggleButtonGroup
                    fullWidth
                    size="small"
                    value={grid}
                    exclusive
                    onChange={(e, v) => v && setGrid(v)}
                    sx={{ mb: 2 }}
                  >
                    <ToggleButton value="ruleOfThirds">Rule of Thirds</ToggleButton>
                    <ToggleButton value="goldenRatio">Golden Ratio</ToggleButton>
                    <ToggleButton value="center">Center</ToggleButton>
                  </ToggleButtonGroup>

                  <Typography variant="subtitle2" gutterBottom>
                    Tỷ lệ khung hình
                  </Typography>
                  <ToggleButtonGroup
                    fullWidth
                    size="small"
                    value={aspect}
                    exclusive
                    onChange={(e, v) => v && setAspect(v)}
                    sx={{ mb: 2 }}
                  >
                    <ToggleButton value="16:9">16:9</ToggleButton>
                    <ToggleButton value="4:3">4:3</ToggleButton>
                    <ToggleButton value="1:1">1:1</ToggleButton>
                    <ToggleButton value="9:16">9:16</ToggleButton>
                  </ToggleButtonGroup>

                  <Typography variant="caption" gutterBottom>
                    Vùng an toàn: {safeArea}%
                  </Typography>
                  <Slider
                    value={safeArea}
                    min={0}
                    max={20}
                    step={1}
                    onChange={(_, v) => setSafeArea(v)}
                    sx={{ mb: 2 }}
                  />

                  <Typography variant="subtitle2" gutterBottom>
                    Loại shot
                  </Typography>
                  <ToggleButtonGroup
                    fullWidth
                    orientation="vertical"
                    size="small"
                    value={shotType}
                    exclusive
                    onChange={(e, v) => v && setShotType(v)}
                    sx={{ mb: 2 }}
                  >
                    {Object.entries(SHOT_TYPES).map(([key, shot]) => (
                      <ToggleButton key={key} value={key}>
                        <Box sx={{ textAlign: 'left', width: '100%' }}>
                          <Typography variant="body2">{shot.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {shot.description}
                          </Typography>
                        </Box>
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>

                  <Typography variant="subtitle2" gutterBottom>
                    Chuyển động camera
                  </Typography>
                  <ToggleButtonGroup
                    fullWidth
                    orientation="vertical"
                    size="small"
                    value={cameraMovement}
                    exclusive
                    onChange={(e, v) => v && setCameraMovement(v)}
                    sx={{ mb: 2 }}
                  >
                    {Object.entries(CAMERA_MOVEMENTS).map(([key, movement]) => (
                      <ToggleButton key={key} value={key}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Typography>{movement.icon}</Typography>
                          <Box sx={{ textAlign: 'left', flexGrow: 1 }}>
                            <Typography variant="body2">{movement.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {movement.description}
                            </Typography>
                          </Box>
                        </Box>
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>

                  <Typography variant="caption" gutterBottom>
                    Tốc độ chuyển động: {cameraSpeed.toFixed(1)}
                  </Typography>
                  <Slider
                    value={cameraSpeed}
                    min={0.1}
                    max={2}
                    step={0.1}
                    onChange={(_, v) => setCameraSpeed(v)}
                  />
                </Box>
              )}

              {/* Tab 1: Camera Settings */}
              {tab === 1 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Khẩu độ (f-stop): {aperture}
                  </Typography>
                  <Slider
                    value={apertureValues.indexOf(aperture)}
                    min={0}
                    max={apertureValues.length - 1}
                    step={1}
                    onChange={(_, v) => setAperture(apertureValues[v])}
                    marks={apertureValues.map((v, i) => ({ value: i, label: `f/${v}` }))}
                    sx={{ mb: 2 }}
                  />

                  <Typography variant="subtitle2" gutterBottom>
                    Tốc độ màn trập
                  </Typography>
                  <TextField
                    fullWidth
                    select
                    size="small"
                    value={shutter}
                    onChange={(e) => setShutter(parseFloat(e.target.value))}
                    sx={{ mb: 2 }}
                  >
                    {shutterValues.map((s) => (
                      <MenuItem key={s.value} value={s.value}>
                        {s.display}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Typography variant="subtitle2" gutterBottom>
                    ISO: {iso}
                  </Typography>
                  <Slider
                    value={iso}
                    min={100}
                    max={6400}
                    step={100}
                    onChange={(_, v) => setIso(v)}
                    sx={{ mb: 2 }}
                  />

                  <Typography variant="subtitle2" gutterBottom>
                    Frame Rate
                  </Typography>
                  <ToggleButtonGroup
                    fullWidth
                    size="small"
                    value={frameRate}
                    exclusive
                    onChange={(e, v) => v && setFrameRate(v)}
                    sx={{ mb: 2 }}
                  >
                    {frameRateValues.map((fr) => (
                      <ToggleButton key={fr} value={fr}>
                        {fr} fps
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>

                  <Typography variant="subtitle2" gutterBottom>
                    Cân bằng trắng: {whiteBalance}K
                  </Typography>
                  <Slider
                    value={whiteBalance}
                    min={3000}
                    max={8000}
                    step={100}
                    onChange={(_, v) => setWhiteBalance(v)}
                    sx={{ mb: 2 }}
                  />

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Khoảng cách lấy nét: {focusDistance.toFixed(1)}m
                  </Typography>
                  <Slider
                    value={focusDistance}
                    min={1}
                    max={20}
                    step={0.1}
                    onChange={(_, v) => setFocusDistance(v)}
                    sx={{ mb: 2 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={focusTracking}
                        onChange={(e) => setFocusTracking(e.target.checked)}
                      />
                    }
                    label="Theo dõi lấy nét tự động"
                  />
                </Box>
              )}

              {/* Tab 2: Color Grading */}
              {tab === 2 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Preset màu sắc
                  </Typography>
                  <ToggleButtonGroup
                    fullWidth
                    orientation="vertical"
                    size="small"
                    value={colorPreset}
                    exclusive
                    onChange={(e, v) => v && setColorPreset(v)}
                    sx={{ mb: 2 }}
                  >
                    {Object.entries(COLOR_PRESETS).map(([key, preset]) => (
                      <ToggleButton key={key} value={key}>
                        {preset.name}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Nhiệt độ màu: {colorTemp}K
                  </Typography>
                  <Slider
                    value={colorTemp}
                    min={3000}
                    max={8000}
                    step={100}
                    onChange={(_, v) => setColorTemp(v)}
                    sx={{ mb: 2 }}
                  />

                  <Typography variant="subtitle2" gutterBottom>
                    Độ bão hòa: {(saturation * 100).toFixed(0)}%
                  </Typography>
                  <Slider
                    value={saturation}
                    min={0}
                    max={2}
                    step={0.05}
                    onChange={(_, v) => setSaturation(v)}
                    sx={{ mb: 2 }}
                  />

                  <Typography variant="subtitle2" gutterBottom>
                    Độ tương phản: {(contrast * 100).toFixed(0)}%
                  </Typography>
                  <Slider
                    value={contrast}
                    min={0.5}
                    max={2}
                    step={0.05}
                    onChange={(_, v) => setContrast(v)}
                    sx={{ mb: 2 }}
                  />

                  <Typography variant="subtitle2" gutterBottom>
                    Độ sáng: {brightness > 0 ? '+' : ''}{brightness.toFixed(2)}
                  </Typography>
                  <Slider
                    value={brightness}
                    min={-0.5}
                    max={0.5}
                    step={0.01}
                    onChange={(_, v) => setBrightness(v)}
                  />
                </Box>
              )}

              {/* Tab 3: Recorded Clips */}
              {tab === 3 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Clips đã ghi ({recordedClips.length})
                  </Typography>
                  <List dense>
                    {recordedClips.map((clip) => (
                      <ListItem
                        key={clip.id}
                        button
                        selected={selectedClip === clip.id}
                        onClick={() => setSelectedClip(clip.id)}
                      >
                        <ListItemText
                          primary={`Clip ${clip.id}`}
                          secondary={`${clip.duration.toFixed(1)}s - ${SHOT_TYPES[clip.settings.shotType]?.name}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setShotType(clip.settings.shotType);
                              setCameraMovement(clip.settings.cameraMovement);
                              setAperture(clip.settings.aperture);
                              setShutter(clip.settings.shutter);
                              setIso(clip.settings.iso);
                              setFrameRate(clip.settings.frameRate);
                              setColorTemp(clip.settings.colorTemp);
                              setSaturation(clip.settings.saturation);
                              setContrast(clip.settings.contrast);
                              setBrightness(clip.settings.brightness);
                              setFocusDistance(clip.settings.focusDistance);
                            }}
                          >
                            <PlayArrow />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                  {recordedClips.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                      Chưa có clip nào. Bấm "Bắt đầu ghi" để ghi clip.
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Export Dialog */}
      <Dialog open={exportDialog} onClose={() => setExportDialog(false)}>
        <DialogTitle>Xuất dự án</DialogTitle>
        <DialogContent>
          <Typography>
            Xuất dự án hiện tại bao gồm {recordedClips.length} clips, {timelineClips.length} timeline items và {storyboard.length} storyboard shots.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>Hủy</Button>
          <Button onClick={exportProject} variant="contained">
            Xuất
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)}>
        <DialogTitle>Nhập dự án</DialogTitle>
        <DialogContent>
          <input
            type="file"
            accept=".json"
            onChange={importProject}
            style={{ display: 'none' }}
            id="import-file-input"
          />
          <label htmlFor="import-file-input">
            <Button variant="outlined" component="span" fullWidth>
              Chọn file dự án
            </Button>
          </label>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
