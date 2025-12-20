
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Box, Paper, Typography, Chip, Card, CardContent, Divider, Button } from '@mui/material';
import { Layers, Info } from '@mui/icons-material';
import { TransformationType } from '../types';

// MiniMatrix component that takes matrix elements directly
const MiniMatrixFromElements = ({ elements, onClick, disabled = false }) => {
  const rows = useMemo(() => {
    // Convert column-major to row-major
    return [
      [elements[0], elements[4], elements[8], elements[12]],
      [elements[1], elements[5], elements[9], elements[13]],
      [elements[2], elements[6], elements[10], elements[14]],
      [elements[3], elements[7], elements[11], elements[15]],
    ];
  }, [elements]);

  return (
    <Button
      onClick={disabled ? undefined : onClick}
      fullWidth
      disabled={disabled}
      sx={{
        mt: 1,
        p: 1,
        bgcolor: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        overflow: 'hidden',
        cursor: disabled ? 'default' : 'pointer',
        '&:hover': disabled ? {} : {
          bgcolor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'primary.main',
          '&::before': {
            borderColor: 'primary.main'
          },
          '&::after': {
            borderColor: 'primary.main'
          },
          '& .info-icon': {
            opacity: 1
          }
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          left: -2,
          top: 0,
          bottom: 0,
          width: 4,
          borderLeft: '1px solid',
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'divider',
          transition: 'border-color 0.2s'
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          right: -2,
          top: 0,
          bottom: 0,
          width: 4,
          borderRight: '1px solid',
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'divider',
          transition: 'border-color 0.2s'
        }
      }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5, width: '100%' }}>
        {rows.flat().map((val, i) => {
          const colIdx = i % 4;
          const rowIdx = Math.floor(i / 4);
          const isTranslation = colIdx === 3 && rowIdx < 3;
          return (
            <Typography
              key={i}
              variant="caption"
              sx={{
                fontSize: '0.5rem',
                fontFamily: 'monospace',
                textAlign: 'center',
                color: isTranslation ? 'primary.main' : val === 0 ? 'text.disabled' : 'text.secondary',
                fontWeight: isTranslation ? 'bold' : 'normal'
              }}
            >
              {val === 0 ? '0' : val === 1 ? '1' : val.toFixed(1)}
            </Typography>
          );
        })}
      </Box>
      <Box
        className="info-icon"
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(59, 130, 246, 0.1)',
          opacity: 0,
          transition: 'opacity 0.2s',
          pointerEvents: 'none'
        }}
      >
        <Info sx={{ fontSize: 12, color: 'primary.main' }} />
      </Box>
    </Button>
  );
};

const HistoryList = ({ history, numPoints, onInspectTransformation }) => {
  // Group history by generation
  const generations = useMemo(() => {
    const gens = [];
    for (let i = 0; i < history.length; i += numPoints) {
      const generation = history.slice(i, i + numPoints);
      if (generation.length === numPoints) {
        gens.push(generation);
      }
    }
    return gens;
  }, [history, numPoints]);

  // Get transformation matrix for a generation
  const getTransformMatrix = (generation) => {
    if (generation.length === 0 || !generation[0].appliedTransformParams) {
      // Return identity matrix for initial generation
      return new THREE.Matrix4().elements;
    }
    
    const params = generation[0].appliedTransformParams;
    const transformMatrix = new THREE.Matrix4();
    
    if (generation[0].type === TransformationType.TRANSLATION) {
      transformMatrix.makeTranslation(params.tx, params.ty, params.tz);
    } else if (generation[0].type === TransformationType.ROTATION) {
      const rotEuler = new THREE.Euler(
        (params.rx * Math.PI) / 180,
        (params.ry * Math.PI) / 180,
        (params.rz * Math.PI) / 180
      );
      transformMatrix.makeRotationFromEuler(rotEuler);
    } else if (generation[0].type === TransformationType.SCALING) {
      transformMatrix.makeScale(params.sx, params.sy, params.sz);
    }
    
    return transformMatrix.elements;
  };

  return (
    <Paper 
      elevation={0}
      sx={{ 
        width: { xs: '100%', md: 288 }, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderLeft: { xs: 'none', md: '1px solid' },
        borderColor: 'divider',
        bgcolor: 'background.default'
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
          <Layers sx={{ fontSize: 18 }} />
          <Typography variant="body2" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
            Lịch sử biến đổi
          </Typography>
        </Box>
        <Chip 
          label={`${generations.length} transformations`}
          size="small"
          sx={{ 
            fontSize: '0.65rem',
            height: '20px',
            fontFamily: 'monospace',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider'
          }}
        />
      </Box>
      
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {generations.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic', textAlign: 'center', py: 5 }}>
            Chưa có dữ liệu.
          </Typography>
        )}
        
        {generations.map((generation, genIdx) => {
          const transformMatrix = getTransformMatrix(generation);
          const isInitial = genIdx === 0;
          const transformType = isInitial ? TransformationType.INITIAL : generation[0].type;
          const previousGeneration = genIdx > 0 ? generations[genIdx - 1] : null;
          
          return (
            <Card
              key={`generation-${genIdx}`}
              sx={{
                p: 1.5,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                  boxShadow: 2
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    bgcolor: `${generation[0].color}22`,
                    color: generation[0].color,
                    border: `1px solid ${generation[0].color}44`,
                    flexShrink: 0
                  }}
                >
                  {genIdx === 0 ? 'O' : genIdx}
                </Box>
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isInitial ? 'Khởi tạo' : `${transformType} #${genIdx}`}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', fontWeight: 500 }}>
                    {isInitial ? `${numPoints} điểm ban đầu` : `${numPoints} điểm - ${transformType.toLowerCase()}`}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.disabled', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isInitial ? 'Ma trận đơn vị' : 'Ma trận biến đổi'}
                  </Typography>
                  {!isInitial && (
                    <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'primary.main', opacity: 0.7 }}>
                      Click để xem chi tiết
                    </Typography>
                  )}
                </Box>
                <MiniMatrixFromElements 
                  elements={transformMatrix}
                  onClick={() => !isInitial && onInspectTransformation(genIdx, generation, previousGeneration)}
                  disabled={isInitial}
                />
              </Box>
            </Card>
          );
        })}
      </Box>
      
      <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.disabled', fontStyle: 'italic' }}>
          * Cột xanh: vector tịnh tiến
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.disabled', fontFamily: 'monospace' }}>
          M = M_trans × M_prev
        </Typography>
      </Box>
    </Paper>
  );
};

export default HistoryList;
