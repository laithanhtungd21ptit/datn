import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Card, 
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { 
  OpenWith as Move, 
  RotateRight as Rotate3d, 
  AspectRatio as Maximize, 
  Add as Plus, 
  Refresh as RefreshCcw, 
  Settings
} from '@mui/icons-material';
import { TransformationType } from '../types';

const ControlPanel = ({ 
  onApply, 
  onReset, 
  onInitialPointsChange,
  initialPoints,
  onNumPointsChange,
  numPoints,
  currentObject
}) => {
  const [params, setParams] = useState({
    tx: 0, ty: 0, tz: 0,
    rx: 0, ry: 0, rz: 0,
    sx: 1, sy: 1, sz: 1
  });

  const [activeTab, setActiveTab] = useState('translate');

  const handleChange = (key, val) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  const handleInitialPointChange = (pointIndex, coordIndex, val) => {
    const newVal = parseFloat(val) || 0;
    const newPoints = [...initialPoints];
    if (!newPoints[pointIndex]) {
      newPoints[pointIndex] = [0, 0, 0];
    }
    const newPoint = [...newPoints[pointIndex]];
    newPoint[coordIndex] = newVal;
    newPoints[pointIndex] = newPoint;
    onInitialPointsChange(newPoints);
  };

  const handleApply = (type) => {
    onApply(type, params);
  };

  const InputGroup = ({ label, keys, type }) => {
    const getIcon = () => {
      if (type === TransformationType.TRANSLATION) return <Move sx={{ fontSize: 18, color: 'primary.main' }} />;
      if (type === TransformationType.ROTATION) return <Rotate3d sx={{ fontSize: 18, color: 'secondary.main' }} />;
      return <Maximize sx={{ fontSize: 18, color: 'success.main' }} />;
    };

    const getColor = (key) => {
      if (key[1] === 'x') return '#ef4444';
      if (key[1] === 'y') return '#22c55e';
      return '#3b82f6';
    };

    return (
      <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'text.secondary' }}>
            {getIcon()}
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {label}
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2 }}>
            {keys.map((k) => (
              <TextField
                key={k}
                label={k[1].toUpperCase()}
                type="number"
                size="small"
                value={params[k]}
                onChange={(e) => handleChange(k, e.target.value)}
                inputProps={{ step: 0.5 }}
                sx={{
                  '& .MuiInputLabel-root': {
                    color: getColor(k),
                    fontWeight: 'bold',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase'
                  },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: 'divider',
                    },
                    '&:hover fieldset': {
                      borderColor: getColor(k),
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: getColor(k),
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: getColor(k),
                    fontFamily: 'monospace',
                    fontWeight: 'bold'
                  }
                }}
              />
            ))}
          </Box>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Plus />}
            onClick={() => handleApply(type)}
            sx={{ 
              bgcolor: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.dark',
              }
            }}
          >
            Áp dụng
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <Paper 
      elevation={0}
      sx={{ 
        width: { xs: '100%', md: 320 }, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRight: { xs: 'none', md: '1px solid' },
        borderColor: 'divider',
        bgcolor: 'background.default'
      }}
    >
      <Box sx={{ p: { xs: 2, md: 3 }, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box 
            sx={{ 
              width: 10, 
              height: 10, 
              bgcolor: 'primary.main', 
              borderRadius: '50%',
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
            }} 
          />
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary', fontSize: { xs: '1rem', md: '1.25rem' } }}>
            Đồ Họa 3D LAB
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.65rem', fontWeight: 600, mt: 0.5, display: 'block' }}>
          Geometric Transformation
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        {/* Number of Points Selection */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: 'text.secondary' }}>
            <Settings sx={{ fontSize: 14 }} />
            <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Số lượng điểm ban đầu
            </Typography>
          </Box>
          <FormControl fullWidth size="small">
            <InputLabel id="num-points-label">Số điểm</InputLabel>
            <Select
              labelId="num-points-label"
              value={numPoints}
              label="Số điểm"
              onChange={(e) => onNumPointsChange(Number(e.target.value))}
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <MenuItem value={1}>1 điểm</MenuItem>
              <MenuItem value={2}>2 điểm</MenuItem>
              <MenuItem value={3}>3 điểm</MenuItem>
              <MenuItem value={4}>4 điểm</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Initial Points Setup */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: 'text.secondary' }}>
            <Settings sx={{ fontSize: 14 }} />
            <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tọa độ các điểm ban đầu
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Array.from({ length: numPoints }).map((_, pointIndex) => {
              const point = initialPoints[pointIndex] || [0, 0, 0];
              return (
                <Card key={pointIndex} sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
                      Điểm {pointIndex + 1}
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                      {[0, 1, 2].map((coordIndex) => {
                        const colors = ['#ef4444', '#22c55e', '#3b82f6'];
                        const labels = ['X', 'Y', 'Z'];
                        return (
                          <TextField
                            key={coordIndex}
                            label={labels[coordIndex]}
                            type="number"
                            size="small"
                            value={point[coordIndex]}
                            onChange={(e) => handleInitialPointChange(pointIndex, coordIndex, e.target.value)}
                            sx={{
                              '& .MuiInputLabel-root': {
                                color: colors[coordIndex],
                                fontWeight: 'bold',
                                fontSize: '0.7rem',
                                textTransform: 'uppercase'
                              },
                              '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                  borderColor: 'divider',
                                  borderWidth: '0 0 1px 0',
                                  borderRadius: 0
                                },
                                '&:hover fieldset': {
                                  borderColor: colors[coordIndex],
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: colors[coordIndex],
                                },
                              },
                              '& .MuiInputBase-input': {
                                color: colors[coordIndex],
                                fontFamily: 'monospace'
                              }
                            }}
                          />
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>

        {/* Transformation Tools */}
        <Box>
          <Paper 
            elevation={0}
            sx={{ 
              p: 0.5, 
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              gap: 0.5,
              mb: 2
            }}
          >
            {['translate', 'rotate', 'scale'].map(tab => (
              <Button
                key={tab}
                onClick={() => setActiveTab(tab)}
                variant={activeTab === tab ? 'contained' : 'text'}
                fullWidth
                sx={{
                  py: 1,
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                  minWidth: 0,
                  ...(activeTab === tab && {
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    }
                  }),
                  ...(activeTab !== tab && {
                    color: 'text.secondary',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      color: 'text.primary'
                    }
                  })
                }}
              >
                {tab === 'translate' ? 'Tịnh tiến' : tab === 'rotate' ? 'Quay' : 'Tỉ lệ'}
              </Button>
            ))}
          </Paper>

          {activeTab === 'translate' && (
            <InputGroup label="Dịch chuyển (Tx, Ty, Tz)" keys={['tx', 'ty', 'tz']} type={TransformationType.TRANSLATION} />
          )}
          {activeTab === 'rotate' && (
            <InputGroup label="Góc xoay (Rx, Ry, Rz)" keys={['rx', 'ry', 'rz']} type={TransformationType.ROTATION} />
          )}
          {activeTab === 'scale' && (
            <InputGroup label="Co giãn (Sx, Sy, Sz)" keys={['sx', 'sy', 'sz']} type={TransformationType.SCALING} />
          )}
        </Box>

        {/* Current State Display */}
        {currentObject && (
          <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1.5 }}>
                Tọa độ sau biến đổi
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                {[0, 1, 2].map((i) => {
                  const colors = ['#ef4444', '#22c55e', '#3b82f6'];
                  const labels = ['X', 'Y', 'Z'];
                  return (
                    <Paper 
                      key={i}
                      elevation={0}
                      sx={{ 
                        p: 1, 
                        bgcolor: 'background.default',
                        border: '1px solid',
                        borderColor: 'divider',
                        textAlign: 'center'
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: colors[i], fontWeight: 'bold', display: 'block' }}>
                        {labels[i]}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: colors[i], fontWeight: 'bold' }}>
                        {currentObject.position[i].toFixed(2)}
                      </Typography>
                    </Paper>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        )}

        <Button
          variant="outlined"
          fullWidth
          startIcon={<RefreshCcw />}
          onClick={onReset}
          sx={{ 
            mt: 1,
            borderColor: 'divider',
            color: 'text.secondary',
            '&:hover': {
              borderColor: 'divider',
              bgcolor: 'action.hover'
            }
          }}
        >
          Làm mới bài tập
        </Button>
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled', fontWeight: 500 }}>
          HỆ THỐNG TRỰC QUAN HÓA LAB 1
        </Typography>
      </Box>
    </Paper>
  );
};

export default ControlPanel;
