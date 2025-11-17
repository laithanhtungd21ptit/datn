import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, Button, Slider, Grid } from '@mui/material';
import { CameraAlt, Download } from '@mui/icons-material';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer as ThreeEffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

export default function ExposureGamePage() {
  const [aperture, setAperture] = useState(5.6); // f-number
  const [shutter, setShutter] = useState(1 / 125); // seconds
  const [iso, setIso] = useState(400);
  const [captures, setCaptures] = useState([]);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const composerRef = useRef(null);
  const bokehPassRef = useRef(null);
  const [focusDistance, setFocusDistance] = useState(5);

  const apertureValues = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
  const apertureIndex = apertureValues.findIndex(v => v === aperture) !== -1 ? apertureValues.findIndex(v => v === aperture) : 4;

  const shutterValues = [
    { display: '1/4000', value: 1/4000 }, { display: '1/2000', value: 1/2000 }, { display: '1/1000', value: 1/1000 },
    { display: '1/500', value: 1/500 }, { display: '1/250', value: 1/250 }, { display: '1/125', value: 1/125 },
    { display: '1/60', value: 1/60 }, { display: '1/30', value: 1/30 }, { display: '1/15', value: 1/15 },
    { display: '1/8', value: 1/8 }, { display: '1/4', value: 1/4 }, { display: '1/2', value: 1/2 }, { display: '1s', value: 1 },
  ];
  const shutterIndex = (() => {
    const idx = shutterValues.findIndex(v => v.value === shutter);
    return idx !== -1 ? idx : 5;
  })();

  const isoValues = [100, 200, 400, 800, 1600, 3200, 6400];

  const calculateExposure = () => {
    const baseF = 5.6, baseShutter = 1 / 125, baseIso = 400;
    const apertureStops = Math.log2((baseF * baseF) / (aperture * aperture));
    const shutterStops = Math.log2(shutter / baseShutter);
    const isoStops = Math.log2(iso / baseIso);
    const exposure = Math.pow(2, apertureStops + shutterStops + isoStops);
    return Math.min(Math.max(exposure, 0.25), 4);
  };

  const handleShutterChange = (event, newValue) => {
    const selectedShutter = shutterValues[newValue];
    setShutter(selectedShutter.value);
  };
  const handleIsoChange = (event, newValue) => {
    setIso(isoValues[newValue]);
  };

  const downloadPhoto = (url) => {
    const link = document.createElement('a');
    link.download = `photo_${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  const capture = () => {
    const gl = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const composer = composerRef.current;
    if (!gl || !scene || !camera) return;
    try {
      gl.toneMappingExposure = calculateExposure();
      if (bokehPassRef.current) {
        bokehPassRef.current.materialBokeh.uniforms['focus'].value = focusDistance;
        bokehPassRef.current.materialBokeh.uniforms['aperture'].value = Math.min(0.06, Math.max(0.001, (1.8 / aperture) * 0.03));
      }
    } catch {}
    const renderOnce = () => {
      if (composer?.render) composer.render();
      else gl.render(scene, camera);
    };
    renderOnce();
    requestAnimationFrame(() => {
      renderOnce();
      try {
        gl.flush?.();
        if (composer && composer.readBuffer) {
          const size = gl.getSize(new THREE.Vector2());
          const width = size.x;
          const height = size.y;
          const pixels = new Uint8Array(width * height * 4);
          gl.readRenderTargetPixels(composer.readBuffer, 0, 0, width, height, pixels);
          const tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = width;
          tmpCanvas.height = height;
          const ctx2d = tmpCanvas.getContext('2d');
          const imgData = ctx2d.createImageData(width, height);
          for (let y = 0; y < height; y++) {
            const srcStart = (height - 1 - y) * width * 4;
            const dstStart = y * width * 4;
            imgData.data.set(pixels.subarray(srcStart, srcStart + width * 4), dstStart);
          }
          ctx2d.putImageData(imgData, 0, 0);
          const url = tmpCanvas.toDataURL('image/png');
          setCaptures(prev => [{ url, meta: { aperture, shutter, iso, focus: Number(focusDistance.toFixed(1)) } }, ...prev].slice(0, 5));
          return;
        }
      } catch {}
      const url = gl.domElement.toDataURL('image/png');
      setCaptures(prev => [{ url, meta: { aperture, shutter, iso, focus: Number(focusDistance.toFixed(1)) } }, ...prev].slice(0, 5));
    });
  };

  const Scene = () => {
    const { gl, scene, camera, size } = useThree();
    useEffect(() => {
      gl.outputColorSpace = THREE.SRGBColorSpace;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      const composer = new ThreeEffectComposer(gl);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);
      const apertureParam = Math.min(0.06, Math.max(0.001, (1.8 / aperture) * 0.03));
      const bokeh = new BokehPass(scene, camera, { focus: focusDistance, aperture: apertureParam, maxblur: 0.02 });
      composer.addPass(bokeh);
      composer.setSize(size.width, size.height);
      composerRef.current = composer;
      bokehPassRef.current = bokeh;
      return () => {
        composerRef.current = null;
        bokehPassRef.current = null;
        composer.dispose();
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
      if (composerRef.current) composerRef.current.setSize(size.width, size.height);
    }, [size]);
    useFrame(() => {
      gl.toneMappingExposure = THREE.MathUtils.lerp(gl.toneMappingExposure ?? 1, calculateExposure(), 0.15);
      if (bokehPassRef.current) {
        bokehPassRef.current.materialBokeh.uniforms['focus'].value = focusDistance;
        bokehPassRef.current.materialBokeh.uniforms['aperture'].value = Math.min(0.06, Math.max(0.001, (1.8 / aperture) * 0.03));
      }
      if (composerRef.current) composerRef.current.render();
      else gl.render(scene, camera);
    });
    const onPointerDown = (e) => {
      if (!e?.point) return;
      const worldPoint = e.point.clone();
      const viewPoint = worldPoint.clone().applyMatrix4(camera.matrixWorldInverse);
      const z = -viewPoint.z;
      const clamped = Math.min(Math.max(z, camera.near + 0.1), camera.far - 1);
      setFocusDistance(clamped);
    };
    return (
      <>
        <Sky distance={450000} turbidity={2} rayleigh={1} mieCoefficient={0.005} mieDirectionalG={0.8} azimuth={180} inclination={0.5} />
        <hemisphereLight args={['#ffffff', '#cccccc', 0.9]} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[5, 8, 5]} intensity={1.4} />
        <spotLight position={[-6, 7, 3]} intensity={0.9} angle={0.5} penumbra={0.5} />
        <mesh position={[0, 1, 0]} onPointerDown={onPointerDown}>
          <boxGeometry args={[1.6, 1.6, 1.6]} />
          <meshStandardMaterial metalness={0.2} roughness={0.2} color="#cfd8dc" />
        </mesh>
        <mesh position={[-1.3, 1.2, 2]} onPointerDown={onPointerDown}>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial color="#ffb703" metalness={0.1} roughness={0.4} />
        </mesh>
        <mesh position={[2.2, 1, -4]} onPointerDown={onPointerDown}>
          <dodecahedronGeometry args={[0.9, 0]} />
          <meshStandardMaterial color="#90caf9" metalness={0.2} roughness={0.35} />
        </mesh>
        <mesh position={[-2.4, 0.7, -6]} onPointerDown={onPointerDown}>
          <torusKnotGeometry args={[0.6, 0.2, 120, 16]} />
          <meshStandardMaterial color="#ce93d8" metalness={0.2} roughness={0.35} />
        </mesh>
        <OrbitControls enableDamping dampingFactor={0.1} />
      </>
    );
  };

  const currentShutterDisplay = (() => {
    const arr = shutterValues;
    return arr.find(v => v.value === shutter)?.display || '1/125';
  })();

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Điều khiển Camera
          </Typography>
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" gutterBottom>Khẩu độ (Aperture): f/{aperture}</Typography>
            <Slider value={apertureIndex} min={0} max={apertureValues.length - 1} step={1} marks valueLabelDisplay="auto" valueLabelFormat={(value) => `f/${apertureValues[value]}`} onChange={(e, idx) => setAperture(apertureValues[idx])} />
            <Typography variant="caption" color="text.secondary">Điều chỉnh độ sâu trường ảnh (DOF)</Typography>
          </Box>
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" gutterBottom>Tốc độ Màn trập (Shutter): {currentShutterDisplay}</Typography>
            <Slider value={shutterIndex} min={0} max={shutterValues.length - 1} step={1} marks valueLabelDisplay="auto" valueLabelFormat={(value) => shutterValues[value].display} onChange={handleShutterChange} />
            <Typography variant="caption" color="text.secondary">Điều chỉnh hiệu ứng chuyển động</Typography>
          </Box>
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" gutterBottom>ISO: {iso}</Typography>
            <Slider value={isoValues.indexOf(iso)} min={0} max={isoValues.length - 1} step={1} marks valueLabelDisplay="auto" valueLabelFormat={(value) => isoValues[value]} onChange={handleIsoChange} />
            <Typography variant="caption" color="text.secondary">Điều chỉnh độ nhạy sáng (cao ISO = nhiễu hạt nhiều hơn)</Typography>
          </Box>
          <Box sx={{ mt: 1 }}>
            <Button variant="contained" color="primary" startIcon={<CameraAlt />} onClick={capture} fullWidth size="large">
              Chụp ảnh
            </Button>
          </Box>
        </Paper>
        <Paper sx={{ p: 2, bgcolor: 'info.light' }}>
          <Typography variant="subtitle2" gutterBottom>Thông tin Phơi sáng</Typography>
          <Typography variant="body2" color="text.secondary">Độ sáng: {(calculateExposure() * 100).toFixed(0)}%</Typography>
          <Typography variant="body2" color="text.secondary">ISO Noise: {(Math.min(0.6, 0.1 + Math.max(0, Math.log2(iso / 400)) * 0.12) * 100).toFixed(0)}%</Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Xem trước</Typography>
          <Box sx={{ position: 'relative', width: '100%', bgcolor: '#000', borderRadius: 2, overflow: 'hidden', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <Canvas gl={{ preserveDrawingBuffer: true, antialias: true }} camera={{ position: [0, 1.5, 6], fov: 50, near: 0.1, far: 100 }} style={{ width: '100%', height: '100%' }} onCreated={({ gl, scene, camera }) => {
              rendererRef.current = gl; sceneRef.current = scene; cameraRef.current = camera; gl.setClearColor('#f2f2f2', 1);
            }}>
              <Scene />
            </Canvas>
          </Box>
          {captures.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Ảnh đã chụp ({captures.length}/5):</Typography>
              <Grid container spacing={2}>
                {captures.map((cap, idx) => (
                  <Grid item xs={6} md={4} key={idx}>
                    <Box sx={{ cursor: 'pointer' }}>
                      <Box component="img" src={cap.url} alt={`capture-${idx + 1}`} sx={{ width: '100%', borderRadius: 2, border: '2px solid', borderColor: 'divider', transition: 'transform 0.15s ease', '&:hover': { transform: 'scale(1.02)' } }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      f/{aperture} • {currentShutterDisplay} • ISO {iso} • Focus {focusDistance.toFixed(1)}
                    </Typography>
                    <Button size="small" variant="text" onClick={() => downloadPhoto(cap.url)} startIcon={<Download />}>Tải xuống</Button>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}


