import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, Slider, Typography } from '@mui/material';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const toGray = (r, g, b) => Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);

const availableFilters = [
  { type: 'brightnessContrast', name: 'Brightness & Contrast', defaults: { brightness: 0, contrast: 0 } },
  { type: 'gamma', name: 'Gamma Correction', defaults: { gamma: 1.0 } },
  { type: 'saturationHue', name: 'Saturation & Hue', defaults: { saturation: 0, hue: 0 } },
  { type: 'threshold', name: 'Threshold', defaults: { thresh: 128 } },
  { type: 'mean', name: 'Mean Blur', defaults: { kernel: 3 } },
  { type: 'median', name: 'Median Blur', defaults: { kernel: 3 } },
  { type: 'gaussian', name: 'Gaussian Blur', defaults: { sigma: 1.0 } },
  { type: 'sharpen', name: 'Sharpen (Unsharp Mask)', defaults: { amount: 0.5, radius: 1.0 } },
  { type: 'sobel', name: 'Sobel/Prewitt', defaults: { operator: 'sobel' } },
  { type: 'canny', name: 'Canny (đơn giản hóa)', defaults: { low: 30, high: 90 } },
  { type: 'jpeg', name: 'Nén JPEG mô phỏng', defaults: { quality: 70 } },
];

export default function ImageProcessingGamePage() {
  const resultCanvasRef = useRef(null);
  const histogramCanvasRef = useRef(null);
  const originalCanvasRef = useRef(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [isApplying, setIsApplying] = useState(false);
  const dragItemIndexRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setOriginalImage(img);
      drawOriginalToCanvas(img);
    };
    img.src = url;
  };

  const drawOriginalToCanvas = (img) => {
    const canvas = originalCanvasRef.current;
    if (!canvas) return;
    const maxW = 720;
    const scale = img.width > maxW ? maxW / img.width : 1;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
  };

  const copyImageData = (srcCtx) => {
    const { width, height } = srcCtx.canvas;
    const src = srcCtx.getImageData(0, 0, width, height);
    const dst = new ImageData(new Uint8ClampedArray(src.data), width, height);
    return { data: dst, width, height };
  };

  useEffect(() => {
    applyPipeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline, originalImage]);

  const addFilter = (type) => {
    const def = availableFilters.find(a => a.type === type);
    if (!def) return;
    setPipeline(prev => [
      ...prev,
      { id: `${type}-${Date.now()}`, type, params: { ...def.defaults }, disabled: false },
    ]);
  };

  const removeFilter = (id) => {
    setPipeline(prev => prev.filter(f => f.id !== id));
  };
  const toggleFilter = (id) => {
    setPipeline(prev => prev.map(f => f.id === id ? { ...f, disabled: !f.disabled } : f));
  };
  const updateParam = (id, key, value) => {
    setPipeline(prev => prev.map(f => f.id === id ? { ...f, params: { ...f.params, [key]: value } } : f));
  };
  const onDragStart = (idx) => { dragItemIndexRef.current = idx; };
  const onDragOver = (e) => { e.preventDefault(); };
  const onDrop = (idx) => {
    const from = dragItemIndexRef.current;
    if (from === null || from === idx) return;
    setPipeline(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    dragItemIndexRef.current = null;
  };

  const applyPipeline = async () => {
    if (!originalCanvasRef.current || !resultCanvasRef.current) return;
    if (!originalImage) return;
    setIsApplying(true);
    try {
      const srcCanvas = originalCanvasRef.current;
      const w = srcCanvas.width;
      const h = srcCanvas.height;
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = w;
      tmpCanvas.height = h;
      const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });
      tmpCtx.drawImage(srcCanvas, 0, 0);
      let { data: imgData } = copyImageData(tmpCtx);
      for (const f of pipeline) {
        if (f.disabled) continue;
        imgData = await applyFilter(imgData, f);
      }
      const outCtx = resultCanvasRef.current.getContext('2d');
      resultCanvasRef.current.width = w;
      resultCanvasRef.current.height = h;
      outCtx.putImageData(imgData, 0, 0);
      drawHistogram(imgData);
    } finally {
      setIsApplying(false);
    }
  };

  const drawHistogram = (imageData) => {
    const canvas = histogramCanvasRef.current;
    if (!canvas) return;
    const w = 256;
    const h = 100;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const hist = new Array(256).fill(0);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      hist[toGray(d[i], d[i + 1], d[i + 2])]++;
    }
    const maxV = Math.max(...hist) || 1;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#90caf9';
    for (let x = 0; x < 256; x++) {
      const v = Math.round((hist[x] / maxV) * (h - 2));
      ctx.fillRect(x, h - v, 1, v);
    }
  };

  // Filters
  const applyFilter = async (imageData, filter) => {
    const { type, params } = filter;
    switch (type) {
      case 'brightnessContrast': return applyBrightnessContrast(imageData, params.brightness, params.contrast);
      case 'gamma': return applyGamma(imageData, params.gamma);
      case 'saturationHue': return applySaturationHue(imageData, params.saturation, params.hue);
      case 'threshold': return applyThreshold(imageData, params.thresh);
      case 'mean': return applyMeanBlur(imageData, params.kernel);
      case 'median': return applyMedianBlur(imageData, params.kernel);
      case 'gaussian': return applyGaussianBlur(imageData, params.sigma);
      case 'sharpen': return applyUnsharpMask(imageData, params.radius, params.amount);
      case 'sobel': return applySobelOrPrewitt(imageData, params.operator);
      case 'canny': return applyCannySimple(imageData, params.low, params.high);
      case 'jpeg': return applyJPEGLike(imageData, params.quality);
      default: return imageData;
    }
  };

  const applyBrightnessContrast = (imageData, brightness = 0, contrast = 0) => {
    const d = imageData.data;
    const b = (brightness / 100) * 255;
    const c = (contrast / 100) + 1;
    const intercept = 128 * (1 - c);
    for (let i = 0; i < d.length; i += 4) {
      d[i] = clamp(c * d[i] + intercept + b, 0, 255);
      d[i + 1] = clamp(c * d[i + 1] + intercept + b, 0, 255);
      d[i + 2] = clamp(c * d[i + 2] + intercept + b, 0, 255);
    }
    return imageData;
  };

  const applyGamma = (imageData, gamma = 1.0) => {
    const d = imageData.data;
    const g = clamp(gamma, 0.1, 5);
    const inv = 1 / g;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.pow(d[i] / 255, inv) * 255;
      d[i + 1] = Math.pow(d[i + 1] / 255, inv) * 255;
      d[i + 2] = Math.pow(d[i + 2] / 255, inv) * 255;
    }
    return imageData;
  };

  const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }
    return [h, s, l];
  };
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const hslToRgb = (h, s, l) => {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r * 255, g * 255, b * 255];
  };

  const applySaturationHue = (imageData, saturation = 0, hue = 0) => {
    const d = imageData.data;
    const sat = clamp(saturation, -100, 100) / 100;
    const hueDelta = (clamp(hue, -180, 180) / 360);
    for (let i = 0; i < d.length; i += 4) {
      const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      const nh = (h + hueDelta + 1) % 1;
      const ns = clamp(s + sat, 0, 1);
      const [r, g, b] = hslToRgb(nh, ns, l);
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    return imageData;
  };

  const applyThreshold = (imageData, thresh = 128) => {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = toGray(d[i], d[i + 1], d[i + 2]);
      const v = g >= thresh ? 255 : 0;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    return imageData;
  };

  const kernelRead = (x, y, w, h, kx, ky) => {
    const ix = clamp(x + kx, 0, w - 1);
    const iy = clamp(y + ky, 0, h - 1);
    return (iy * w + ix) * 4;
  };

  const applyMeanBlur = (imageData, kernel = 3) => {
    const k = Math.max(3, kernel | 0) | 1;
    const { width: w, height: h, data: d } = imageData;
    const out = new Uint8ClampedArray(d.length);
    const half = (k - 1) / 2;
    const area = k * k;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const idx = kernelRead(x, y, w, h, kx, ky);
            r += d[idx]; g += d[idx + 1]; b += d[idx + 2]; a += d[idx + 3];
          }
        }
        const o = (y * w + x) * 4;
        out[o] = r / area; out[o + 1] = g / area; out[o + 2] = b / area; out[o + 3] = a / area;
      }
    }
    imageData.data.set(out);
    return imageData;
  };

  const applyMedianBlur = (imageData, kernel = 3) => {
    const k = Math.max(3, kernel | 0) | 1;
    const { width: w, height: h, data: d } = imageData;
    const out = new Uint8ClampedArray(d.length);
    const half = (k - 1) / 2;
    const windowR = [], windowG = [], windowB = [], windowA = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        windowR.length = windowG.length = windowB.length = windowA.length = 0;
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const idx = kernelRead(x, y, w, h, kx, ky);
            windowR.push(d[idx]); windowG.push(d[idx + 1]); windowB.push(d[idx + 2]); windowA.push(d[idx + 3]);
          }
        }
        windowR.sort((a, b) => a - b);
        windowG.sort((a, b) => a - b);
        windowB.sort((a, b) => a - b);
        windowA.sort((a, b) => a - b);
        const mid = (windowR.length / 2) | 0;
        const o = (y * w + x) * 4;
        out[o] = windowR[mid]; out[o + 1] = windowG[mid]; out[o + 2] = windowB[mid]; out[o + 3] = windowA[mid];
      }
    }
    imageData.data.set(out);
    return imageData;
  };

  const applyGaussianBlur = (imageData, sigma = 1.0) => {
    const s = clamp(sigma, 0.1, 5);
    const radius = Math.max(1, Math.round(s * 2));
    const kernel = [];
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      const v = Math.exp(-(i * i) / (2 * s * s));
      kernel.push(v);
      sum += v;
    }
    for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
    const { width: w, height: h, data: d } = imageData;
    const tmp = new Uint8ClampedArray(d.length);
    // horizontal
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let k = -radius; k <= radius; k++) {
          const ix = clamp(x + k, 0, w - 1);
          const idx = (y * w + ix) * 4;
          const wv = kernel[k + radius];
          r += d[idx] * wv; g += d[idx + 1] * wv; b += d[idx + 2] * wv; a += d[idx + 3] * wv;
        }
        const o = (y * w + x) * 4;
        tmp[o] = r; tmp[o + 1] = g; tmp[o + 2] = b; tmp[o + 3] = a;
      }
    }
    // vertical
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let k = -radius; k <= radius; k++) {
          const iy = clamp(y + k, 0, h - 1);
          const idx = (iy * w + x) * 4;
          const wv = kernel[k + radius];
          r += tmp[idx] * wv; g += tmp[idx + 1] * wv; b += tmp[idx + 2] * wv; a += tmp[idx + 3] * wv;
        }
        const o = (y * w + x) * 4;
        imageData.data[o] = r; imageData.data[o + 1] = g; imageData.data[o + 2] = b; imageData.data[o + 3] = a;
      }
    }
    return imageData;
  };

  const applyUnsharpMask = (imageData, radius = 1.0, amount = 0.5) => {
    const blurred = applyGaussianBlur(new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height), radius);
    const d = imageData.data;
    const b = blurred.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = clamp(d[i] + (d[i] - b[i]) * amount, 0, 255);
      d[i + 1] = clamp(d[i + 1] + (d[i + 1] - b[i + 1]) * amount, 0, 255);
      d[i + 2] = clamp(d[i + 2] + (d[i + 2] - b[i + 2]) * amount, 0, 255);
    }
    return imageData;
  };

  const convolve3x3 = (imageData, kx, ky) => {
    const { width: w, height: h, data: d } = imageData;
    const out = new Uint8ClampedArray(d.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let rx = 0, gx = 0, bx = 0;
        let ry = 0, gy = 0, by = 0;
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const idx = kernelRead(x, y, w, h, i, j);
            const kxx = kx[(j + 1) * 3 + (i + 1)];
            const kyx = ky[(j + 1) * 3 + (i + 1)];
            rx += d[idx] * kxx; gx += d[idx + 1] * kxx; bx += d[idx + 2] * kxx;
            ry += d[idx] * kyx; gy += d[idx + 1] * kyx; by += d[idx + 2] * kyx;
          }
        }
        const magR = Math.hypot(rx, ry);
        const magG = Math.hypot(gx, gy);
        const magB = Math.hypot(bx, by);
        const o = (y * w + x) * 4;
        out[o] = clamp(magR, 0, 255);
        out[o + 1] = clamp(magG, 0, 255);
        out[o + 2] = clamp(magB, 0, 255);
        out[o + 3] = d[o + 3];
      }
    }
    imageData.data.set(out);
    return imageData;
  };

  const applySobelOrPrewitt = (imageData, operator = 'sobel') => {
    let kx, ky;
    if (operator === 'prewitt') {
      kx = [-1, 0, 1, -1, 0, 1, -1, 0, 1];
      ky = [-1, -1, -1, 0, 0, 0, 1, 1, 1];
    } else {
      kx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
      ky = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    }
    return convolve3x3(imageData, kx, ky);
  };

  const applyCannySimple = (imageData, low = 30, high = 90) => {
    const blurred = applyGaussianBlur(new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height), 1.2);
    const edged = applySobelOrPrewitt(blurred, 'sobel');
    const d = edged.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = toGray(d[i], d[i + 1], d[i + 2]);
      const v = g >= high ? 255 : (g >= low ? 128 : 0);
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    return edged;
  };

  const applyJPEGLike = (imageData, quality = 70) => {
    const { width: w, height: h, data: d } = imageData;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const tmp = new ImageData(new Uint8ClampedArray(d), w, h);
    ctx.putImageData(tmp, 0, 0);
    const scale = clamp(quality, 1, 100) / 100;
    const down = Math.max(0.2, scale);
    const dw = Math.max(8, Math.round(w * down));
    const dh = Math.max(8, Math.round(h * down));
    const canvas2 = document.createElement('canvas');
    canvas2.width = dw; canvas2.height = dh;
    const ctx2 = canvas2.getContext('2d');
    ctx2.imageSmoothingEnabled = true;
    ctx2.drawImage(canvas, 0, 0, dw, dh);
    const upCanvas = document.createElement('canvas');
    upCanvas.width = w; upCanvas.height = h;
    const upCtx = upCanvas.getContext('2d');
    upCtx.imageSmoothingEnabled = false;
    upCtx.drawImage(canvas2, 0, 0, w, h);
    const out = upCtx.getImageData(0, 0, w, h);
    return out;
  };

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
        {/* Left: Ảnh gốc */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Ảnh gốc</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
            <Button variant="outlined" component="label">
              Tải ảnh lên
              <input type="file" accept="image/*" hidden onChange={handleUpload} />
            </Button>
          </Box>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <canvas ref={originalCanvasRef} style={{ width: '100%', display: 'block' }} />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Ảnh gốc là điểm tham chiếu cố định.
          </Typography>
        </Paper>

        {/* Middle: Bảng điều khiển */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Bảng điều khiển</Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Thêm bộ lọc</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {availableFilters.map(f => (
              <Button key={f.type} size="small" variant="outlined" onClick={() => addFilter(f.type)}>
                {f.name}
              </Button>
            ))}
          </Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Chuỗi bộ lọc (kéo-thả để sắp xếp)</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {pipeline.length === 0 && (
              <Typography variant="body2" color="text.secondary">Chưa có bộ lọc nào. Hãy thêm từ danh sách trên.</Typography>
            )}
            {pipeline.map((f, idx) => (
              <Paper
                key={f.id}
                sx={{ p: 1.5, border: '1px dashed', borderColor: 'divider', bgcolor: f.disabled ? 'action.disabledBackground' : 'background.paper' }}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={onDragOver}
                onDrop={() => onDrop(idx)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">{availableFilters.find(a => a.type === f.type)?.name || f.type}</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" onClick={() => toggleFilter(f.id)}>{f.disabled ? 'Bật' : 'Tắt'}</Button>
                    <Button size="small" color="error" onClick={() => removeFilter(f.id)}>Xóa</Button>
                  </Box>
                </Box>
                {/* Params */}
                {f.type === 'brightnessContrast' && (
                  <Box sx={{ px: 1 }}>
                    <Typography variant="caption">Brightness: {f.params.brightness}</Typography>
                    <Slider value={f.params.brightness} min={-100} max={100} step={1} onChange={(_, v) => updateParam(f.id, 'brightness', v)} />
                    <Typography variant="caption">Contrast: {f.params.contrast}</Typography>
                    <Slider value={f.params.contrast} min={-100} max={100} step={1} onChange={(_, v) => updateParam(f.id, 'contrast', v)} />
                  </Box>
                )}
                {f.type === 'gamma' && (
                  <Box sx={{ px: 1 }}>
                    <Typography variant="caption">Gamma: {f.params.gamma.toFixed(2)}</Typography>
                    <Slider value={f.params.gamma} min={0.1} max={5} step={0.05} onChange={(_, v) => updateParam(f.id, 'gamma', v)} />
                  </Box>
                )}
                {f.type === 'saturationHue' && (
                  <Box sx={{ px: 1 }}>
                    <Typography variant="caption">Saturation: {f.params.saturation}</Typography>
                    <Slider value={f.params.saturation} min={-100} max={100} step={1} onChange={(_, v) => updateParam(f.id, 'saturation', v)} />
                    <Typography variant="caption">Hue: {f.params.hue}</Typography>
                    <Slider value={f.params.hue} min={-180} max={180} step={1} onChange={(_, v) => updateParam(f.id, 'hue', v)} />
                  </Box>
                )}
                {f.type === 'threshold' && (
                  <Box sx={{ px: 1 }}>
                    <Typography variant="caption">Ngưỡng: {f.params.thresh}</Typography>
                    <Slider value={f.params.thresh} min={0} max={255} step={1} onChange={(_, v) => updateParam(f.id, 'thresh', v)} />
                  </Box>
                )}
                {f.type === 'mean' && (
                  <Box sx={{ px: 1 }}>
                    <Typography variant="caption">Kernel: {f.params.kernel}x{f.params.kernel}</Typography>
                    <Slider value={f.params.kernel} min={3} max={9} step={2} onChange={(_, v) => updateParam(f.id, 'kernel', v)} />
                  </Box>
                )}
                {f.type === 'median' && (
                  <Box sx={{ px: 1 }}>
                    <Typography variant="caption">Kernel: {f.params.kernel}x{f.params.kernel}</Typography>
                    <Slider value={f.params.kernel} min={3} max={9} step={2} onChange={(_, v) => updateParam(f.id, 'kernel', v)} />
                  </Box>
                )}
                {f.type === 'gaussian' && (
                  <Box sx={{ px: 1 }}>
                    <Typography variant="caption">Sigma: {f.params.sigma.toFixed(2)}</Typography>
                    <Slider value={f.params.sigma} min={0.1} max={5} step={0.1} onChange={(_, v) => updateParam(f.id, 'sigma', v)} />
                  </Box>
                )}
                {f.type === 'sharpen' && (
                  <Box sx={{ px: 1 }}>
                    <Typography variant="caption">Amount: {f.params.amount.toFixed(2)}</Typography>
                    <Slider value={f.params.amount} min={0} max={2} step={0.05} onChange={(_, v) => updateParam(f.id, 'amount', v)} />
                    <Typography variant="caption">Radius: {f.params.radius.toFixed(2)}</Typography>
                    <Slider value={f.params.radius} min={0.2} max={5} step={0.1} onChange={(_, v) => updateParam(f.id, 'radius', v)} />
                  </Box>
                )}
                {f.type === 'sobel' && (
                  <Box sx={{ px: 1 }}>
                    <Typography variant="caption">Toán tử: {f.params.operator}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button size="small" variant={f.params.operator === 'sobel' ? 'contained' : 'outlined'} onClick={() => updateParam(f.id, 'operator', 'sobel')}>Sobel</Button>
                      <Button size="small" variant={f.params.operator === 'prewitt' ? 'contained' : 'outlined'} onClick={() => updateParam(f.id, 'operator', 'prewitt')}>Prewitt</Button>
                    </Box>
                  </Box>
                )}
                {f.type === 'canny' && (
                  <Box sx={{ px: 1 }}>
                    <Typography variant="caption">Low threshold: {f.params.low}</Typography>
                    <Slider value={f.params.low} min={0} max={255} step={1} onChange={(_, v) => updateParam(f.id, 'low', v)} />
                    <Typography variant="caption">High threshold: {f.params.high}</Typography>
                    <Slider value={f.params.high} min={0} max={255} step={1} onChange={(_, v) => updateParam(f.id, 'high', v)} />
                  </Box>
                )}
                {f.type === 'jpeg' && (
                  <Box sx={{ px: 1 }}>
                    <Typography variant="caption">Quality: {f.params.quality}</Typography>
                    <Slider value={f.params.quality} min={1} max={100} step={1} onChange={(_, v) => updateParam(f.id, 'quality', v)} />
                  </Box>
                )}
              </Paper>
            ))}
          </Box>
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button disabled={!originalImage || isApplying} variant="contained" onClick={applyPipeline}>
              Áp dụng lại
            </Button>
            <Button disabled={pipeline.length === 0} variant="text" color="error" onClick={() => setPipeline([])}>
              Xóa tất cả
            </Button>
          </Box>
        </Paper>

        {/* Right: Kết quả + Histogram */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Kết quả</Typography>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <canvas ref={resultCanvasRef} style={{ width: '100%', display: 'block' }} />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Cập nhật theo thời gian thực sau khi áp dụng toàn bộ chuỗi bộ lọc.
          </Typography>
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Histogram</Typography>
            <canvas ref={histogramCanvasRef} style={{ width: '100%', height: 120 }} />
          </Paper>
        </Paper>
      </Box>
    </Box>
  );
}


