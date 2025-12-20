import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { Box, Paper, Typography, Chip, Card, CardContent, Divider, ThemeProvider, createTheme, CssBaseline, useMediaQuery, Drawer, IconButton } from '@mui/material';
import { FiberManualRecord, Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';
import Scene3D from './components/Scene3D';
import ControlPanel from './components/ControlPanel';
import HistoryList from './components/HistoryList';
import MatrixProcessModal from './components/MatrixProcessModal';
import { TransformationType } from './types';
import { TRANSFORMATION_COLORS } from './constants';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6',
    },
    background: {
      default: '#09090b',
      paper: '#18181b',
    },
  },
});

const Graphics3DGamePage = () => {
  const [initialPoints, setInitialPoints] = useState([[0, 0, 0]]);
  const [numPoints, setNumPoints] = useState(1); // Max 4 points
  const [objects, setObjects] = useState([]);
  const [inspectingStep, setInspectingStep] = useState(null);
  const [controlPanelOpen, setControlPanelOpen] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  
  const isMobile = useMediaQuery('(max-width: 960px)');
  const isTablet = useMediaQuery('(max-width: 1280px)');

  // Function to generate initial points from user input coordinates
  // All initial points have the same color
  const generateInitialPoints = (points) => {
    return points.map((position, i) => ({
      id: `initial-${i}`,
      type: TransformationType.INITIAL, // 'Vật thể gốc'
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: TRANSFORMATION_COLORS[0], // All initial points have the same color
      label: points.length === 1 ? 'Vật thể gốc' : `Điểm ${i + 1}`,
      timestamp: Date.now(),
    }));
  };

  // Initialize original objects when component mounts
  useEffect(() => {
    if (objects.length === 0) {
      const initialObjects = generateInitialPoints(initialPoints);
      setObjects(initialObjects);
    }
  }, []);

  const handleApplyTransform = (type, params) => {
    // Get the last set of points (one for each initial point)
    // Always take the last numPoints objects
    const lastGenerationPoints = objects.slice(-numPoints);
    
    if (lastGenerationPoints.length === 0 || lastGenerationPoints.length !== numPoints) {
      console.warn('Cannot apply transform: insufficient points', { 
        objectsLength: objects.length, 
        numPoints, 
        lastGenerationLength: lastGenerationPoints.length 
      });
      return;
    }

    // Create the transformation matrix
    const transformMatrix = new THREE.Matrix4();
    if (type === TransformationType.TRANSLATION) {
      transformMatrix.makeTranslation(params.tx, params.ty, params.tz);
    } else if (type === TransformationType.ROTATION) {
      const rotEuler = new THREE.Euler(
        (params.rx * Math.PI) / 180,
        (params.ry * Math.PI) / 180,
        (params.rz * Math.PI) / 180
      );
      transformMatrix.makeRotationFromEuler(rotEuler);
    } else if (type === TransformationType.SCALING) {
      transformMatrix.makeScale(params.sx, params.sy, params.sz);
    }

    // Apply transformation to all points in the current generation
    const newObjects = [];
    
    lastGenerationPoints.forEach((lastObj, idx) => {
      // 1. Reconstruct current state matrix (M_previous)
      const lastMatrix = new THREE.Matrix4();
      const lastEuler = new THREE.Euler(
        (lastObj.rotation[0] * Math.PI) / 180,
        (lastObj.rotation[1] * Math.PI) / 180,
        (lastObj.rotation[2] * Math.PI) / 180
      );
      lastMatrix.compose(
        new THREE.Vector3(...lastObj.position),
        new THREE.Quaternion().setFromEuler(lastEuler),
        new THREE.Vector3(...lastObj.scale)
      );

      // 2. Combine matrices: M_new = M_transform * M_previous
      const resultMatrix = new THREE.Matrix4().multiplyMatrices(transformMatrix, lastMatrix);

      // 3. Decompose back to position, rotation, scale
      const newPosVec = new THREE.Vector3();
      const newQuat = new THREE.Quaternion();
      const newScaleVec = new THREE.Vector3();
      resultMatrix.decompose(newPosVec, newQuat, newScaleVec);

      const newEuler = new THREE.Euler().setFromQuaternion(newQuat);
      
      const newPosition = [newPosVec.x, newPosVec.y, newPosVec.z];
      const newRotation = [
        (newEuler.x * 180) / Math.PI,
        (newEuler.y * 180) / Math.PI,
        (newEuler.z * 180) / Math.PI
      ];
      const newScale = [newScaleVec.x, newScaleVec.y, newScaleVec.z];

      // All points in the same generation should have the same color
      const currentGeneration = Math.floor(objects.length / numPoints);
      const colorIndex = currentGeneration % TRANSFORMATION_COLORS.length;
      const generationColor = TRANSFORMATION_COLORS[colorIndex];
      
      newObjects.push({
        id: Math.random().toString(36).substr(2, 9),
        type,
        position: newPosition,
        rotation: newRotation,
        scale: newScale,
        color: generationColor, // Same color for all points in this generation
        label: numPoints === 1 ? `${type} #${currentGeneration + 1}` : `Điểm ${idx + 1} - ${type}`,
        timestamp: Date.now(),
        appliedTransformParams: params
      });
    });

    setObjects(prev => [...prev, ...newObjects]);
  };

  const handleReset = () => {
    const defaultPoints = Array(numPoints).fill([0, 0, 0]);
    setInitialPoints(defaultPoints);
    const initialObjects = generateInitialPoints(defaultPoints);
    setObjects(initialObjects);
  };

  const handleNumPointsChange = (newNumPoints) => {
    // Limit to max 4 points
    const validNumPoints = Math.min(Math.max(1, newNumPoints), 4);
    setNumPoints(validNumPoints);
    // Keep existing points and add default [0,0,0] for new points
    const newPoints = [...initialPoints];
    while (newPoints.length < validNumPoints) {
      newPoints.push([0, 0, 0]);
    }
    while (newPoints.length > validNumPoints) {
      newPoints.pop();
    }
    setInitialPoints(newPoints);
    const initialObjects = generateInitialPoints(newPoints);
    setObjects(initialObjects);
  };

  const handleInitialPointsChange = (newPoints) => {
    setInitialPoints(newPoints);
    const initialObjects = generateInitialPoints(newPoints);
    setObjects(initialObjects);
  };

  const lastObject = objects[objects.length - 1] || null;

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', width: '100%', overflow: 'hidden', bgcolor: 'background.default', position: 'relative' }}>
        {/* Control Panel - Desktop: always visible, Mobile: Drawer */}
        {isMobile ? (
          <Drawer
            anchor="left"
            open={controlPanelOpen}
            onClose={() => setControlPanelOpen(false)}
            PaperProps={{
              sx: {
                width: 320,
                bgcolor: 'background.default'
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
              <IconButton onClick={() => setControlPanelOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
            <ControlPanel 
              onApply={handleApplyTransform} 
              onReset={handleReset} 
              onInitialPointsChange={handleInitialPointsChange}
              initialPoints={initialPoints}
              onNumPointsChange={handleNumPointsChange}
              numPoints={numPoints}
              currentObject={lastObject}
            />
          </Drawer>
        ) : (
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <ControlPanel 
              onApply={handleApplyTransform} 
              onReset={handleReset} 
              onInitialPointsChange={handleInitialPointsChange}
              initialPoints={initialPoints}
              onNumPointsChange={handleNumPointsChange}
              numPoints={numPoints}
              currentObject={lastObject}
            />
          </Box>
        )}

        <Box component="main" sx={{ flex: 1, position: 'relative', p: { xs: 1, sm: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: { xs: 1, md: 2 }, minWidth: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'auto' } }}>
              {isMobile && (
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <IconButton 
                    size="small" 
                    onClick={() => setControlPanelOpen(true)}
                    sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
                  >
                    <MenuIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => setHistoryPanelOpen(true)}
                    sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
                  >
                    <MenuIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              <Typography variant="overline" sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' }, fontWeight: 'bold', color: 'text.secondary', letterSpacing: '0.1em' }}>
                Trình mô phỏng Kỹ thuật đồ họa
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label="LAB 1: PHÉP BIẾN ĐỔI (M_trans * M_prev)" 
                  size="small"
                  sx={{ 
                    fontSize: { xs: '0.55rem', md: '0.65rem' }, 
                    height: '20px',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    color: 'primary.main',
                    fontWeight: 'bold'
                  }} 
                />
                <Chip 
                  icon={<FiberManualRecord sx={{ fontSize: '0.5rem', color: 'primary.main' }} />}
                  label={isMobile ? "Click ma trận để xem" : "Bấm vào ma trận trong lịch sử để xem chi tiết"}
                  size="small"
                  sx={{ 
                    fontSize: { xs: '0.55rem', md: '0.65rem' }, 
                    height: '20px',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    color: 'text.secondary',
                    fontWeight: 'bold',
                    display: { xs: 'none', sm: 'flex' }
                  }} 
                />
              </Box>
            </Box>
            
            <Paper 
              elevation={0}
              sx={{ 
                px: { xs: 1, md: 2 }, 
                py: { xs: 1, md: 1.5 }, 
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontSize: { xs: '0.5rem', md: '0.6rem' }, color: 'text.secondary', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Thực thể
                </Typography>
                <Typography variant="h6" sx={{ fontFamily: 'monospace', color: 'primary.main', lineHeight: 1, fontSize: { xs: '1rem', md: '1.25rem' } }}>
                  {objects.length}
                </Typography>
              </Box>
            </Paper>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Scene3D objects={objects} numPoints={numPoints} />
          </Box>
        </Box>

        {/* History List - Desktop: always visible, Mobile: Drawer */}
        {isMobile ? (
          <Drawer
            anchor="right"
            open={historyPanelOpen}
            onClose={() => setHistoryPanelOpen(false)}
            PaperProps={{
              sx: {
                width: { xs: '100%', sm: 288 },
                bgcolor: 'background.default'
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
              <IconButton onClick={() => setHistoryPanelOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
            <HistoryList 
              history={objects} 
              numPoints={numPoints}
              onInspectTransformation={(genIdx, transformationPoints, previousPoints) => {
                setInspectingStep({ 
                  generationIndex: genIdx,
                  transformationPoints, 
                  previousPoints 
                });
                setHistoryPanelOpen(false);
              }}
            />
          </Drawer>
        ) : (
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <HistoryList 
              history={objects} 
              numPoints={numPoints}
              onInspectTransformation={(genIdx, transformationPoints, previousPoints) => {
                setInspectingStep({ 
                  generationIndex: genIdx,
                  transformationPoints, 
                  previousPoints 
                });
              }}
            />
          </Box>
        )}

        {inspectingStep && (
          <MatrixProcessModal 
            generationIndex={inspectingStep.generationIndex}
            transformationPoints={inspectingStep.transformationPoints}
            previousPoints={inspectingStep.previousPoints}
            onClose={() => setInspectingStep(null)}
          />
        )}
      </Box>
    </ThemeProvider>
  );
};

export default Graphics3DGamePage;

