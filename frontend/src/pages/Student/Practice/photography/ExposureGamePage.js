import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CameraAlt,
  CameraOutlined,
  NavigateBefore,
  NavigateNext,
  RestartAlt,
} from '@mui/icons-material';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer as ThreeEffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const apertureStops = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16];
const shutterStops = [
  '1/4000',
  '1/2000',
  '1/1000',
  '1/500',
  '1/250',
  '1/125',
  '1/60',
  '1/30',
  '1/15',
  '1/8',
  '1/4',
  '1/2',
  '1',
];
const isoStops = [100, 200, 400, 800, 1600, 3200, 6400];

const parseShutterToSeconds = (value) => {
  if (value.includes('/')) {
    const [num, denom] = value.split('/').map(Number);
    return num / denom;
  }
  return Number(value);
};

const calcEv100 = (aperture, shutter) => {
  const t = parseShutterToSeconds(shutter);
  const ev = Math.log2((aperture * aperture) / t);
  return Number.isFinite(ev) ? ev : 0;
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const scenes = [
  {
    id: 'portrait-golden-hour',
    title: 'Chân dung lúc hoàng hôn',
    description:
      'Ánh sáng mềm phía sau chủ thể, cần xóa phông và giữ chủ thể nét, nền vàng cam.',
    hint: 'Giữ khẩu độ lớn để xóa phông, nhấn mạnh gương mặt, ISO vừa phải.',
    aperture: 2.0,
    shutter: '1/250',
    iso: 200,
    sceneType: 'portrait',
    lightColor: '#FFA500',
    lightIntensity: 0.8,
  },
  {
    id: 'street-night',
    title: 'Street photo ban đêm',
    description:
      'Đường phố nhiều ánh đèn neon, cần giữ được chi tiết vùng tối nhưng hạn chế rung tay.',
    hint: 'Chụp tay cần tốc độ tối thiểu 1/60, ISO phải cao hơn để bù sáng.',
    aperture: 4,
    shutter: '1/60',
    iso: 1600,
    sceneType: 'street',
    lightColor: '#FF00FF',
    lightIntensity: 0.3,
  },
  {
    id: 'landscape-day',
    title: 'Phong cảnh ban ngày',
    description:
      'Cảnh sắc nhiều chi tiết, cần độ sâu trường ảnh lớn, trời nắng nhẹ.',
    hint: 'Khẩu độ nhỏ (f/8 trở lên) để toàn cảnh nét, ISO thấp nhất để giảm nhiễu.',
    aperture: 11,
    shutter: '1/125',
    iso: 100,
    sceneType: 'landscape',
    lightColor: '#FFFFFF',
    lightIntensity: 1.2,
  },
  {
    id: 'concert-lowlight',
    title: 'Ca nhạc ánh sáng yếu',
    description:
      'Sân khấu tối với đèn màu mạnh, ảnh gốc bị tối và mờ do tốc độ thấp, ISO chưa đủ.',
    hint: 'Tăng ISO, mở khẩu lớn, giữ tốc độ tối thiểu 1/125 để đóng băng chuyển động.',
    aperture: 2.8,
    shutter: '1/60',
    iso: 800,
    sceneType: 'concert',
    lightColor: '#FF1493',
    lightIntensity: 0.4,
  },
  {
    id: 'beach-overexposed',
    title: 'Biển nắng gắt',
    description:
      'Ảnh gốc bị cháy sáng vì trời trưa, cần giảm sáng và khôi phục chi tiết vùng trời.',
    hint: 'Giảm ISO, đóng khẩu và tăng tốc độ để kéo histogram về trung tâm.',
    aperture: 16,
    shutter: '1/200',
    iso: 200,
    sceneType: 'beach',
    lightColor: '#FFFF00',
    lightIntensity: 1.5,
  },
];

const scoreColor = (score) => {
  if (score >= 90) return 'success';
  if (score >= 70) return 'warning';
  return 'error';
};

const formatShotLabel = (settings) =>
  `f/${settings.aperture} • ${settings.shutter}s • ISO ${settings.iso}`;

const calcShotScore = (target, current) => {
  const evTarget = calcEv100(target.aperture, target.shutter) - Math.log2(target.iso / 100);
  const evCurrent = calcEv100(current.aperture, current.shutter) - Math.log2(current.iso / 100);
  const evDiff = Math.abs(evTarget - evCurrent);

  const apertureStopsDiff = Math.abs(Math.log2(current.aperture / target.aperture));
  const shutterStopsDiff = Math.abs(
    Math.log2(parseShutterToSeconds(current.shutter) / parseShutterToSeconds(target.shutter))
  );
  const isoStopsDiff = Math.abs(Math.log2(current.iso / target.iso));

  const evScore = clamp(100 - evDiff * 35, 0, 100);
  const apertureScore = clamp(100 - apertureStopsDiff * 25, 0, 100);
  const shutterScore = clamp(100 - shutterStopsDiff * 25, 0, 100);
  const isoScore = clamp(100 - isoStopsDiff * 20, 0, 100);

  const score = Math.round((evScore * 0.4 + apertureScore * 0.2 + shutterScore * 0.2 + isoScore * 0.2));
  return { score, breakdown: { evScore, apertureScore, shutterScore, isoScore, evDiff } };
};

const ParameterSlider = ({ label, stops, valueIndex, onChange, formatValue, subtitle }) => (
  <Paper sx={{ p: 2 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Box>
        <Typography variant="subtitle2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6">{formatValue(stops[valueIndex])}</Typography>
      </Box>
      {subtitle && (
        <Chip size="small" color="primary" label={subtitle} variant="outlined" />
      )}
    </Stack>
    <Slider
      value={valueIndex}
      min={0}
      max={stops.length - 1}
      step={1}
      onChange={(_, newValue) => onChange(newValue)}
      marks={stops.map((stop, idx) => ({ value: idx, label: formatValue(stop) }))}
      sx={{ mt: 4 }}
    />
  </Paper>
);

// 3D Scene Component
const Scene3D = ({ scene, currentSettings, aperture, shutter, iso }) => {
  const { gl, scene: threeScene, camera, size } = useThree();
  const composerRef = useRef(null);
  const bokehPassRef = useRef(null);
  const colorPassRef = useRef(null);
  const noisePassRef = useRef(null);
  const motionBlurRef = useRef(0);
  const previousFrameRef = useRef(null);

  // Calculate exposure values
  const evTarget = calcEv100(scene.aperture, scene.shutter) - Math.log2(scene.iso / 100);
  const evCurrent = calcEv100(currentSettings.aperture, currentSettings.shutter) - Math.log2(currentSettings.iso / 100);
  const evDiff = evTarget - evCurrent;
  const brightness = clamp(1 + evDiff / 4, 0.4, 1.6);
  const shutterSeconds = parseShutterToSeconds(currentSettings.shutter);
  const motionBlur = clamp((shutterSeconds - parseShutterToSeconds('1/125')) * 180, 0, 25);
  const dofBlur = clamp(10 * (1.4 / currentSettings.aperture), 0, 8);
  const noise = clamp(Math.log2(currentSettings.iso / 100) * 5, 0, 20);

  // Setup post-processing
  useEffect(() => {
    if (!gl || !threeScene || !camera) return;

    const composer = new ThreeEffectComposer(gl);
    const renderPass = new RenderPass(threeScene, camera);
    composer.addPass(renderPass);

    // Bokeh/DOF Pass
    const bokeh = new BokehPass(threeScene, camera, {
      focus: 5,
      aperture: Math.min(0.06, Math.max(0.001, (1.8 / aperture) * 0.03)),
      maxblur: 0.02,
    });
    composer.addPass(bokeh);
    bokehPassRef.current = bokeh;

    // Color correction shader
    const colorCorrectionShader = {
      uniforms: {
        tDiffuse: { value: null },
        brightness: { value: 0.0 },
        contrast: { value: 1.0 },
        saturation: { value: 1.0 },
        temperature: { value: 5500.0 },
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
        uniform float brightness;
        uniform float contrast;
        uniform float saturation;
        uniform float temperature;
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
          
          // Adjust temperature
          color = adjustTemperature(color, temperature);
          
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

    // Noise shader
    const noiseShader = {
      uniforms: {
        tDiffuse: { value: null },
        amount: { value: 0.0 },
        time: { value: 0.0 },
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
        uniform float amount;
        uniform float time;
        varying vec2 vUv;
        
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          float noise = random(vUv + time) * amount;
          color.rgb += (noise - 0.5) * 0.1;
          gl_FragColor = color;
        }
      `,
    };
    const noisePass = new ShaderPass(noiseShader);
    composer.addPass(noisePass);
    noisePassRef.current = noisePass;

    composer.setSize(size.width, size.height);
    composerRef.current = composer;

    return () => {
      composer.dispose();
    };
  }, [gl, threeScene, camera, size]);

  // Update post-processing parameters
  useFrame((state, delta) => {
    if (bokehPassRef.current) {
      bokehPassRef.current.materialBokeh.uniforms['focus'].value = 5;
      bokehPassRef.current.materialBokeh.uniforms['aperture'].value = Math.min(
        0.06,
        Math.max(0.001, (1.8 / aperture) * 0.03)
      );
    }

    if (colorPassRef.current) {
      colorPassRef.current.uniforms['brightness'].value = (brightness - 1.0) * 0.5;
      colorPassRef.current.uniforms['contrast'].value = clamp(1 - evDiff / 10, 0.7, 1.3);
      colorPassRef.current.uniforms['saturation'].value = 1.0;
      colorPassRef.current.uniforms['temperature'].value = 5500;
    }

    if (noisePassRef.current) {
      noisePassRef.current.uniforms['amount'].value = noise / 100;
      noisePassRef.current.uniforms['time'].value = state.clock.elapsedTime;
    }

    // Motion blur simulation
    motionBlurRef.current = motionBlur;

    // Exposure adjustment
    const baseF = 5.6;
    const baseShutter = 1 / 60;
    const baseIso = 400;
    const apertureStops = Math.log2((baseF * baseF) / (aperture * aperture));
    const shutterStops = Math.log2(parseShutterToSeconds(shutter) / baseShutter);
    const isoStops = Math.log2(iso / baseIso);
    const exposure = Math.pow(2, apertureStops + shutterStops + isoStops);
    gl.toneMappingExposure = THREE.MathUtils.lerp(
      gl.toneMappingExposure || 1,
      Math.min(Math.max(exposure, 0.25), 4),
      0.15
    );

    // Render with composer
    if (composerRef.current) {
      composerRef.current.render();
    }
  });

  // Render scene based on scene type
  const renderScene = () => {
    switch (scene.sceneType) {
      case 'portrait':
        return (
          <>
            <ambientLight intensity={0.4} color={scene.lightColor} />
            <directionalLight
              position={[5, 8, -5]}
              intensity={scene.lightIntensity}
              color={scene.lightColor}
              castShadow
            />
            <pointLight position={[-3, 3, 2]} intensity={0.3} color="#FFD700" />
            {/* Person/Subject */}
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[0.8, 1.8, 0.4]} />
              <meshStandardMaterial color="#D4A574" />
            </mesh>
            {/* Head */}
            <mesh position={[0, 1.1, 0]} castShadow>
              <sphereGeometry args={[0.3, 32, 32]} />
              <meshStandardMaterial color="#F4C2A1" />
            </mesh>
            {/* Background elements */}
            <mesh position={[-4, 0, -3]} castShadow>
              <boxGeometry args={[1, 2, 0.5]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            <mesh position={[4, 0, -3]} castShadow>
              <boxGeometry args={[1, 2, 0.5]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
              <planeGeometry args={[20, 20]} />
              <meshStandardMaterial color="#DEB887" />
            </mesh>
          </>
        );

      case 'street':
        return (
          <>
            <ambientLight intensity={0.2} />
            <pointLight position={[3, 4, 2]} intensity={0.8} color="#FF00FF" />
            <pointLight position={[-3, 4, -2]} intensity={0.6} color="#00FFFF" />
            <pointLight position={[0, 5, 0]} intensity={0.4} color="#FFFF00" />
            {/* Buildings */}
            <mesh position={[-3, 1.5, -2]} castShadow>
              <boxGeometry args={[2, 3, 1]} />
              <meshStandardMaterial color="#2C2C2C" />
            </mesh>
            <mesh position={[3, 2, -2]} castShadow>
              <boxGeometry args={[2, 4, 1]} />
              <meshStandardMaterial color="#1A1A1A" />
            </mesh>
            {/* Street light */}
            <mesh position={[0, 2, -1]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 2]} />
              <meshStandardMaterial color="#444444" />
            </mesh>
            <mesh position={[0, 3, -1]} castShadow>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color="#FF00FF" emissive="#FF00FF" emissiveIntensity={0.5} />
            </mesh>
            {/* Person */}
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[0.5, 1, 0.3]} />
              <meshStandardMaterial color="#333333" />
            </mesh>
            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
              <planeGeometry args={[20, 20]} />
              <meshStandardMaterial color="#1A1A1A" />
            </mesh>
          </>
        );

      case 'landscape':
        return (
          <>
            <ambientLight intensity={0.6} color={scene.lightColor} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={scene.lightIntensity}
              color={scene.lightColor}
              castShadow
            />
            {/* Mountains */}
            <mesh position={[-4, 0, -5]} castShadow>
              <coneGeometry args={[2, 3, 8]} />
              <meshStandardMaterial color="#8B7355" />
            </mesh>
            <mesh position={[4, 0, -5]} castShadow>
              <coneGeometry args={[2, 3, 8]} />
              <meshStandardMaterial color="#6B5B4D" />
            </mesh>
            {/* Trees */}
            <mesh position={[-2, 0, -3]} castShadow>
              <coneGeometry args={[0.5, 1.5, 8]} />
              <meshStandardMaterial color="#228B22" />
            </mesh>
            <mesh position={[2, 0, -3]} castShadow>
              <coneGeometry args={[0.5, 1.5, 8]} />
              <meshStandardMaterial color="#228B22" />
            </mesh>
            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
              <planeGeometry args={[20, 20]} />
              <meshStandardMaterial color="#90EE90" />
            </mesh>
            <Sky sunPosition={[100, 20, 100]} />
          </>
        );

      case 'concert':
        return (
          <>
            <ambientLight intensity={0.1} />
            <pointLight position={[0, 5, 0]} intensity={1.5} color={scene.lightColor} />
            <pointLight position={[-3, 4, 2]} intensity={0.8} color="#FF1493" />
            <pointLight position={[3, 4, -2]} intensity={0.8} color="#00BFFF" />
            {/* Stage */}
            <mesh position={[0, -0.5, -2]} castShadow>
              <boxGeometry args={[6, 0.5, 3]} />
              <meshStandardMaterial color="#1A1A1A" />
            </mesh>
            {/* Performer */}
            <mesh position={[0, 0.5, -2]} castShadow>
              <boxGeometry args={[0.6, 1, 0.3]} />
              <meshStandardMaterial color="#FF1493" emissive="#FF1493" emissiveIntensity={0.3} />
            </mesh>
            {/* Instruments */}
            <mesh position={[-1, 0.3, -2]} castShadow>
              <boxGeometry args={[0.3, 0.6, 0.2]} />
              <meshStandardMaterial color="#333333" />
            </mesh>
            <mesh position={[1, 0.3, -2]} castShadow>
              <boxGeometry args={[0.3, 0.6, 0.2]} />
              <meshStandardMaterial color="#333333" />
            </mesh>
            {/* Background */}
            <mesh position={[0, 2, -5]} castShadow>
              <boxGeometry args={[8, 4, 0.5]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
              <planeGeometry args={[20, 20]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
          </>
        );

      case 'beach':
        return (
          <>
            <ambientLight intensity={0.8} color={scene.lightColor} />
            <directionalLight
              position={[0, 10, 5]}
              intensity={scene.lightIntensity}
              color={scene.lightColor}
              castShadow
            />
            {/* Sun */}
            <mesh position={[5, 8, -5]}>
              <sphereGeometry args={[1, 32, 32]} />
              <meshStandardMaterial color="#FFFF00" emissive="#FFFF00" emissiveIntensity={1} />
            </mesh>
            {/* Palm trees */}
            <mesh position={[-3, 0, -4]} castShadow>
              <cylinderGeometry args={[0.2, 0.2, 2]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            <mesh position={[-3, 2, -4]} castShadow>
              <coneGeometry args={[1, 2, 8]} />
              <meshStandardMaterial color="#228B22" />
            </mesh>
            <mesh position={[3, 0, -4]} castShadow>
              <cylinderGeometry args={[0.2, 0.2, 2]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            <mesh position={[3, 2, -4]} castShadow>
              <coneGeometry args={[1, 2, 8]} />
              <meshStandardMaterial color="#228B22" />
            </mesh>
            {/* Water */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -3]} receiveShadow>
              <planeGeometry args={[20, 10]} />
              <meshStandardMaterial color="#00BFFF" />
            </mesh>
            {/* Sand */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 2]} receiveShadow>
              <planeGeometry args={[20, 10]} />
              <meshStandardMaterial color="#F4A460" />
            </mesh>
            <Sky sunPosition={[100, 20, 100]} />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {renderScene()}
      <PerspectiveCamera makeDefault position={[0, 2, 6]} fov={50} />
      <OrbitControls enableZoom={false} enablePan={false} />
    </>
  );
};

const LivePreview = ({ scene, current }) => {
  const evTarget = calcEv100(scene.aperture, scene.shutter) - Math.log2(scene.iso / 100);
  const evCurrent = calcEv100(current.aperture, current.shutter) - Math.log2(current.iso / 100);
  const evDiff = evTarget - evCurrent;

  return (
    <Box sx={{ position: 'relative' }}>
      <Paper
        sx={{
          p: 0,
          height: 360,
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#000',
        }}
      >
        <Canvas
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
          style={{ width: '100%', height: '100%' }}
        >
          <Scene3D
            scene={scene}
            currentSettings={current}
            aperture={current.aperture}
            shutter={current.shutter}
            iso={current.iso}
          />
        </Canvas>
      </Paper>
      <Paper
        elevation={4}
        sx={{
          p: 2,
          mt: -5,
          mx: 3,
          borderRadius: 3,
          position: 'relative',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack>
            <Typography variant="subtitle2" color="text.secondary">
              Thiết lập hiện tại
            </Typography>
            <Typography variant="h6">
              {formatShotLabel(current)}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Chip label={`EV mục tiêu: ${evTarget.toFixed(1)}`} color="primary" variant="outlined" />
            <Chip
              label={
                evDiff < -0.3
                  ? 'Đang dư sáng'
                  : evDiff > 0.3
                  ? 'Đang thiếu sáng'
                  : 'Phơi sáng gần chuẩn'
              }
              color={evDiff > 0.3 || evDiff < -0.3 ? 'warning' : 'success'}
            />
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};

export default function ExposureGamePage() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [apertureIndex, setApertureIndex] = useState(3);
  const [shutterIndex, setShutterIndex] = useState(6);
  const [isoIndex, setIsoIndex] = useState(1);
  const [shots, setShots] = useState([]);

  const scene = scenes[sceneIndex];

  const currentSettings = useMemo(
    () => ({
      aperture: apertureStops[apertureIndex],
      shutter: shutterStops[shutterIndex],
      iso: isoStops[isoIndex],
    }),
    [apertureIndex, shutterIndex, isoIndex]
  );

  const handleShot = () => {
    const result = calcShotScore(scene, currentSettings);
    setShots((prev) => [
      {
        id: Date.now(),
        sceneId: scene.id,
        label: formatShotLabel(currentSettings),
        score: result.score,
        breakdown: result.breakdown,
      },
      ...prev.slice(0, 3),
    ]);
  };

  const resetControls = () => {
    setApertureIndex(apertureStops.indexOf(scene.aperture) ?? 3);
    setShutterIndex(shutterStops.indexOf(scene.shutter) ?? 6);
    setIsoIndex(isoStops.indexOf(scene.iso) ?? 0);
  };

  React.useEffect(() => {
    resetControls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIndex]);

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <LivePreview scene={scene} current={currentSettings} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">{scene.title}</Typography>
              <Stack direction="row" spacing={1}>
                <Tooltip title="Bối cảnh trước">
                  <span>
                    <IconButton
                      disabled={sceneIndex === 0}
                      onClick={() => setSceneIndex((idx) => Math.max(0, idx - 1))}
                    >
                      <NavigateBefore />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Bối cảnh tiếp theo">
                  <span>
                    <IconButton
                      disabled={sceneIndex === scenes.length - 1}
                      onClick={() => setSceneIndex((idx) => Math.min(scenes.length - 1, idx + 1))}
                    >
                      <NavigateNext />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
            <Typography color="text.secondary">{scene.description}</Typography>
            <Alert severity="info">{scene.hint}</Alert>
            <Divider />
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Thiết lập gợi ý của giảng viên
              </Typography>
              <Typography>
                Khẩu độ: f/{scene.aperture} • Tốc độ: {scene.shutter}s • ISO: {scene.iso}
              </Typography>
            </Stack>
            <Box sx={{ flexGrow: 1 }} />
            <Stack direction="row" spacing={1}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RestartAlt />}
                onClick={resetControls}
              >
                Reset theo gợi ý
              </Button>
              <Button
                fullWidth
                variant="contained"
                startIcon={<CameraAlt />}
                onClick={handleShot}
              >
                Chụp ảnh
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={4}>
          <ParameterSlider
            label="Khẩu độ (Aperture)"
            stops={apertureStops}
            valueIndex={apertureIndex}
            onChange={setApertureIndex}
            formatValue={(value) => `f/${value}`}
            subtitle={apertureStops[apertureIndex] <= 2.8 ? 'Độ sâu trường ảnh mỏng' : 'Độ sâu rộng'}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <ParameterSlider
            label="Tốc độ màn trập (Shutter)"
            stops={shutterStops}
            valueIndex={shutterIndex}
            onChange={setShutterIndex}
            formatValue={(value) => `${value}s`}
            subtitle={
              parseShutterToSeconds(shutterStops[shutterIndex]) >= parseShutterToSeconds('1/60')
                ? 'Dễ rung tay'
                : 'Đóng băng chuyển động'
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <ParameterSlider
            label="Độ nhạy ISO"
            stops={isoStops}
            valueIndex={isoIndex}
            onChange={setIsoIndex}
            formatValue={(value) => value}
            subtitle={isoStops[isoIndex] >= 1600 ? 'Nhiễu cao' : 'Nhiễu thấp'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CameraOutlined color="primary" />
              <Typography variant="h6">Lịch sử ảnh đã chụp</Typography>
            </Stack>
            {shots.length === 0 ? (
              <Alert sx={{ mt: 2 }} severity="info">
                Chưa có lần chụp nào. Điều chỉnh 3 thông số rồi bấm "Chụp ảnh" để xem đánh giá.
              </Alert>
            ) : (
              <Stack spacing={2} sx={{ mt: 2 }}>
                {shots.map((shot) => (
                  <Paper
                    key={shot.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderColor: `${scoreColor(shot.score)}.main`,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1">{shot.label}</Typography>
                      <Chip
                        label={`Điểm: ${shot.score}`}
                        color={scoreColor(shot.score)}
                        variant="filled"
                      />
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={shot.score}
                      color={scoreColor(shot.score)}
                      sx={{ mt: 1.5, height: 8, borderRadius: 4 }}
                    />
                    <Grid container spacing={1} sx={{ mt: 1 }}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">
                          EV chênh lệch
                        </Typography>
                        <Typography
                          variant="body2"
                          color={
                            Math.abs(shot.breakdown.evDiff) < 0.3
                              ? 'success.main'
                              : Math.abs(shot.breakdown.evDiff) < 0.8
                              ? 'warning.main'
                              : 'error.main'
                          }
                        >
                          {shot.breakdown.evDiff.toFixed(2)} stops
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">
                          Điểm EV
                        </Typography>
                        <Typography variant="body2">{shot.breakdown.evScore.toFixed(0)} / 100</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">
                          Điểm khẩu độ
                        </Typography>
                        <Typography variant="body2">
                          {shot.breakdown.apertureScore.toFixed(0)} / 100
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">
                          Điểm tốc độ
                        </Typography>
                        <Typography variant="body2">
                          {shot.breakdown.shutterScore.toFixed(0)} / 100
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Mục tiêu của bài tập
            </Typography>
            <Stack spacing={1}>
              <Typography>- Điều chỉnh đồng thời 3 thông số cân bằng sáng.</Typography>
              <Typography>- Theo dõi phản hồi trực quan trên preview 3D.</Typography>
              <Typography>- Chụp thử, xem điểm và điều chỉnh rồi chụp lại.</Typography>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary">
              Mẹo nhanh
            </Typography>
            <Typography variant="body2">
              1 stop khẩu độ = 1 stop tốc độ = 1 stop ISO. Hãy giữ tam giác phơi sáng cân bằng và chỉ phá vỡ khi cần hiệu ứng sáng tác.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
