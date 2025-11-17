import React, { useMemo, useState } from 'react';
import { Box, Paper, Typography, ToggleButton, ToggleButtonGroup, Slider } from '@mui/material';

export default function FramingGamePage() {
  const [grid, setGrid] = useState('ruleOfThirds'); // ruleOfThirds | goldenRatio | center
  const [safeArea, setSafeArea] = useState(10); // percent padding
  const [aspect, setAspect] = useState('16:9'); // 16:9 | 4:3 | 1:1 | 9:16

  const [w, h] = useMemo(() => {
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
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Thiết lập khung hình</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>Lưới hỗ trợ</Typography>
            <ToggleButtonGroup size="small" value={grid} exclusive onChange={(e, v) => v && setGrid(v)}>
              <ToggleButton value="ruleOfThirds">Rule of Thirds</ToggleButton>
              <ToggleButton value="goldenRatio">Golden Ratio</ToggleButton>
              <ToggleButton value="center">Center Cross</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>Tỷ lệ khung</Typography>
            <ToggleButtonGroup size="small" value={aspect} exclusive onChange={(e, v) => v && setAspect(v)}>
              <ToggleButton value="16:9">16:9</ToggleButton>
              <ToggleButton value="4:3">4:3</ToggleButton>
              <ToggleButton value="1:1">1:1</ToggleButton>
              <ToggleButton value="9:16">9:16</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ minWidth: 220 }}>
            <Typography variant="caption" sx={{ display: 'block' }}>Vùng an toàn (Safe Area): {safeArea}%</Typography>
            <Slider value={safeArea} min={0} max={20} step={1} onChange={(_, v) => setSafeArea(v)} />
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Xem trước khung hình</Typography>
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: '#111',
            borderRadius: 2,
            overflow: 'hidden',
            p: 2,
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: Math.min(w, 960),
              aspectRatio: `${w}/${h}`,
              backgroundImage: 'url(https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2000&auto=format&fit=crop)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: 1,
              boxShadow: '0 0 0 2px rgba(255,255,255,0.06) inset',
            }}
          >
            {/* Safe area overlay */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                p: `${safeArea}%`,
                pointerEvents: 'none',
              }}
            >
              <Box sx={{ position: 'absolute', inset: 0, boxShadow: '0 0 0 2px rgba(255,255,0,0.6) inset', borderRadius: 1 }} />
            </Box>

            {/* Grid overlays */}
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
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Gợi ý: Đặt chủ thể tại các giao điểm lưới hoặc theo tỉ lệ vàng để khung hình cân đối hơn.
        </Typography>
      </Paper>
    </Box>
  );
}


