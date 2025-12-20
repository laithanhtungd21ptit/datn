
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { 
  Box, 
  Modal, 
  Paper, 
  Typography, 
  IconButton, 
  Chip,
  Divider
} from '@mui/material';
import { Close as X, Tag as Hash } from '@mui/icons-material';
import { TransformationType } from '../types';

const MatrixGrid = ({ elements, title, color }) => {
  // Convert column-major to row-major
  const rows = [
    [elements[0], elements[4], elements[8], elements[12]],
    [elements[1], elements[5], elements[9], elements[13]],
    [elements[2], elements[6], elements[10], elements[14]],
    [elements[3], elements[7], elements[11], elements[15]],
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Chip
        label={title}
        size="small"
        sx={{
          fontSize: '0.65rem',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          border: '1px solid',
          borderColor: color,
          color: color,
          bgcolor: `${color}15`
        }}
      />
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          p: 1,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: -4,
            top: 0,
            bottom: 0,
            width: 8,
            borderLeft: '2px solid',
            borderTop: '2px solid',
            borderBottom: '2px solid',
            borderColor: 'divider',
            borderRadius: '2px 0 0 2px'
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            right: -4,
            top: 0,
            bottom: 0,
            width: 8,
            borderRight: '2px solid',
            borderTop: '2px solid',
            borderBottom: '2px solid',
            borderColor: 'divider',
            borderRadius: '0 2px 2px 0'
          }
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, px: 0.5 }}>
          {rows.flat().map((val, i) => {
            const colIdx = i % 4;
            const rowIdx = Math.floor(i / 4);
            const isTranslation = colIdx === 3 && rowIdx < 3;
            return (
              <Typography
                key={i}
                variant="body2"
                sx={{
                  width: 48,
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  py: 1,
                  color: isTranslation ? 'primary.main' : val === 0 ? 'text.disabled' : 'text.primary',
                  fontWeight: isTranslation ? 'bold' : 'normal'
                }}
              >
                {val === 0 ? '0' : val === 1 ? '1' : val.toFixed(2)}
              </Typography>
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
};

const MatrixProcessModal = ({ generationIndex, transformationPoints, previousPoints, onClose }) => {
  // Get transformation matrix (same for all points in generation)
  const transformMatrix = useMemo(() => {
    if (transformationPoints.length === 0 || !transformationPoints[0] || !transformationPoints[0].appliedTransformParams) {
      return new THREE.Matrix4(); // Identity
    }
    
    const firstPoint = transformationPoints[0];
    const params = firstPoint.appliedTransformParams || { tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 };
    const type = firstPoint.type;
    const mat = new THREE.Matrix4();
    
    if (type === TransformationType.TRANSLATION) {
      mat.makeTranslation(params.tx, params.ty, params.tz);
    } else if (type === TransformationType.ROTATION) {
      const rotEuler = new THREE.Euler(
        (params.rx * Math.PI) / 180,
        (params.ry * Math.PI) / 180,
        (params.rz * Math.PI) / 180
      );
      mat.makeRotationFromEuler(rotEuler);
    } else if (type === TransformationType.SCALING) {
      mat.makeScale(params.sx, params.sy, params.sz);
    }
    
    return mat;
  }, [transformationPoints]);

  // Calculate matrices for each point
  const pointCalculations = useMemo(() => {
    return transformationPoints.map((current, idx) => {
      // Previous point (from previous generation)
      const previous = previousPoints ? previousPoints[idx] : null;
      
      // 1. Reconstruct Previous Matrix
      const mPrev = new THREE.Matrix4();
      if (previous) {
        const prevEuler = new THREE.Euler(
          (previous.rotation[0] * Math.PI) / 180,
          (previous.rotation[1] * Math.PI) / 180,
          (previous.rotation[2] * Math.PI) / 180
        );
        mPrev.compose(
          new THREE.Vector3(...previous.position),
          new THREE.Quaternion().setFromEuler(prevEuler),
          new THREE.Vector3(...previous.scale)
        );
      }

      // 2. Transform matrix (same for all points)
      const mApplied = transformMatrix.clone();

      // 3. Result Matrix
      const mResult = new THREE.Matrix4();
      const currEuler = new THREE.Euler(
        (current.rotation[0] * Math.PI) / 180,
        (current.rotation[1] * Math.PI) / 180,
        (current.rotation[2] * Math.PI) / 180
      );
      mResult.compose(
        new THREE.Vector3(...current.position),
        new THREE.Quaternion().setFromEuler(currEuler),
        new THREE.Vector3(...current.scale)
      );

      return {
        pointIndex: idx,
        point: current,
        previous,
        applied: mApplied.elements,
        prev: mPrev.elements,
        result: mResult.elements
      };
    });
  }, [transformationPoints, previousPoints, transformMatrix]);

  return (
    <Modal
      open={true}
      onClose={onClose}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3
      }}
    >
      <Paper
        elevation={24}
        sx={{
          maxWidth: '90vw',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 4,
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, bgcolor: 'primary.dark', color: 'primary.main', borderRadius: 2, border: '1px solid', borderColor: 'primary.main' }}>
              <Hash sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                Chi tiết Phép biến đổi #{generationIndex}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {transformationPoints.length} điểm - {transformationPoints.length > 0 && transformationPoints[0] ? transformationPoints[0].type : 'N/A'}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'text.primary'
              }
            }}
          >
            <X />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
          {/* Show transformation matrix (same for all points) */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'text.primary', fontWeight: 'bold' }}>
              Ma trận biến đổi (Áp dụng cho tất cả các điểm)
            </Typography>
            {transformationPoints.length > 0 && transformationPoints[0] && (
              <MatrixGrid 
                elements={transformMatrix.elements} 
                title={`M_biến_đổi (${transformationPoints[0].type || 'N/A'})`} 
                color="#8b5cf6"
              />
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Show details for each point */}
          <Typography variant="h6" sx={{ mb: 2, color: 'text.primary', fontWeight: 'bold' }}>
            Chi tiết cho từng điểm:
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pointCalculations.map((calc) => (
              <Box key={calc.pointIndex} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ mb: 2, color: 'text.primary', fontWeight: 'bold' }}>
                  Điểm {calc.pointIndex + 1}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                  {/* Previous Matrix */}
                  <MatrixGrid 
                    elements={calc.prev} 
                    title={calc.previous ? `M_trước_đó (Điểm ${calc.pointIndex + 1})` : "Ma trận Đơn vị"} 
                    color="#71717a"
                  />

                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', borderRadius: '50%', border: '1px solid', borderColor: 'divider' }}>
                      <X sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </Box>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'text.disabled', textTransform: 'uppercase', fontStyle: 'italic' }}>
                      ×
                    </Typography>
                  </Box>

                  {/* Transform Matrix (same for all) */}
                  <MatrixGrid 
                    elements={calc.applied} 
                    title="M_biến_đổi" 
                    color="#8b5cf6"
                  />

                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', borderRadius: '50%', border: '1px solid', borderColor: 'divider' }}>
                      <Typography sx={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'text.disabled' }}>=</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'text.disabled', textTransform: 'uppercase', fontStyle: 'italic' }}>
                      Kết quả
                    </Typography>
                  </Box>

                  {/* Result Matrix */}
                  <MatrixGrid 
                    elements={calc.result} 
                    title={`M_kết_quả (Điểm ${calc.pointIndex + 1})`} 
                    color="#3b82f6"
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Footer/Formula */}
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontFamily: 'monospace', fontStyle: 'italic', color: 'text.secondary' }}>
            <Typography component="span" sx={{ color: '#8b5cf6' }}>M_transform</Typography>
            <Typography component="span">×</Typography>
            <Typography component="span" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>M_previous</Typography>
            <Typography component="span">=</Typography>
            <Typography component="span" sx={{ fontWeight: 'bold', color: 'primary.main' }}>M_new</Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
            * Phép nhân được thực hiện theo thứ tự: Ma trận biến đổi mới nhân với ma trận trạng thái trước đó (áp dụng trong hệ tọa độ toàn cục).
          </Typography>
        </Box>
      </Paper>
    </Modal>
  );
};

export default MatrixProcessModal;
