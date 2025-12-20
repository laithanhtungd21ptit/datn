
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Box, Paper, Typography, Chip, Divider } from '@mui/material';
const MatrixDisplay = ({ position, rotation, scale }) => {
  const matrixElements = useMemo(() => {
    const mat = new THREE.Matrix4();
    const euler = new THREE.Euler(
      (rotation[0] * Math.PI) / 180,
      (rotation[1] * Math.PI) / 180,
      (rotation[2] * Math.PI) / 180
    );
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    const posVec = new THREE.Vector3(...position);
    const scaleVec = new THREE.Vector3(...scale);

    mat.compose(posVec, quaternion, scaleVec);
    return mat.elements; // Array of 16 elements in column-major order
  }, [position, rotation, scale]);

  // Transform column-major to row-major for display
  const rows = [
    [matrixElements[0], matrixElements[4], matrixElements[8], matrixElements[12]],
    [matrixElements[1], matrixElements[5], matrixElements[9], matrixElements[13]],
    [matrixElements[2], matrixElements[6], matrixElements[10], matrixElements[14]],
    [matrixElements[3], matrixElements[7], matrixElements[11], matrixElements[15]],
  ];

  return (
    <Paper
      elevation={8}
      sx={{
        p: 2,
        bgcolor: 'rgba(9, 9, 11, 0.9)',
        border: '1px solid',
        borderColor: 'divider',
        width: '100%',
        maxWidth: 320,
        backdropFilter: 'blur(10px)'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Ma trận biến đổi (M)
        </Typography>
        <Chip
          label="4x4 Homogeneous"
          size="small"
          sx={{
            fontSize: '0.6rem',
            height: '18px',
            fontFamily: 'monospace',
            bgcolor: 'primary.dark',
            color: 'primary.main',
            border: '1px solid',
            borderColor: 'primary.main'
          }}
        />
      </Box>
      
      <Box sx={{ position: 'relative' }}>
        {/* Matrix Brackets */}
        <Box
          sx={{
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
          }}
        />
        <Box
          sx={{
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
          }}
        />
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, px: 1, py: 0.5 }}>
          {rows.map((row, rIdx) => 
            row.map((val, cIdx) => {
              const isTranslation = cIdx === 3 && rIdx < 3;
              const isIdentity = val === 1 && rIdx === 3 && cIdx === 3;
              const isRotationScale = val !== 0 && (rIdx < 3 && cIdx < 3);
              
              return (
                <Typography
                  key={`${rIdx}-${cIdx}`}
                  variant="body2"
                  sx={{
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    py: 0.5,
                    color: isTranslation ? 'primary.main' : 
                           isIdentity ? 'text.disabled' :
                           isRotationScale ? 'text.primary' : 'text.disabled',
                    fontWeight: isTranslation ? 'bold' : 'normal'
                  }}
                >
                  {val === 0 ? '0' : val === 1 ? '1' : val.toFixed(2)}
                </Typography>
              );
            })
          )}
        </Box>
      </Box>
      
      <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.disabled' }} />
          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', fontStyle: 'italic', fontWeight: 500 }}>
            Rotation & Scale
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', fontStyle: 'italic', fontWeight: 500 }}>
            Translation
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default MatrixDisplay;
