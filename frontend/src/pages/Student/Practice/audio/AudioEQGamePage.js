import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Slider,
  Typography,
  Grid,
  Tabs,
  Tab,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Menu,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Upload,
  PlayArrow,
  Pause,
  Equalizer,
  MusicNote,
  GraphicEq,
  SettingsBackupRestore,
  Save,
  Info,
} from '@mui/icons-material';

const presets = [
  {
    name: 'Podcast Vocal',
    description: 'Lọc trầm, tăng độ rõ của giọng nói và thêm chút sáng.',
    settings: {
      highpass: 90,
      lowpass: 14000,
      gain: 1.1,
      bassGain: -2,
      presenceGain: 4,
      presenceFreq: 2500,
      trebleGain: 3,
      stereoPan: 0,
      reverbMix: 0.08,
    },
  },
  {
    name: 'EDM Drop',
    description: 'Tăng bass, mở treble và stereo rộng cho nhạc điện tử.',
    settings: {
      highpass: 40,
      lowpass: 19000,
      gain: 1.25,
      bassGain: 6,
      presenceGain: 2,
      presenceFreq: 1800,
      trebleGain: 4,
      stereoPan: 0.2,
      reverbMix: 0.25,
    },
  },
  {
    name: 'Live Concert',
    description: 'Thêm không gian sân khấu với reverb và treble sáng.',
    settings: {
      highpass: 60,
      lowpass: 17000,
      gain: 1.0,
      bassGain: 2,
      presenceGain: 1,
      presenceFreq: 1400,
      trebleGain: 3,
      stereoPan: 0,
      reverbMix: 0.35,
    },
  },
];

const learningMissions = [
  {
    title: 'Lesson 1 - Clean Vocal',
    steps: [
      'Tải một audio giọng nói.',
      'Tăng High-pass tới ~120 Hz để loại bỏ tiếng ồn trầm.',
      'Giảm Low-pass xuống ~12 kHz để giảm tiếng xì.',
      'Tăng Presence để giọng nói rõ hơn.',
    ],
  },
  {
    title: 'Lesson 2 - Punchy Beat',
    steps: [
      'Tăng Bass +5 dB để nhạc trống mạnh hơn.',
      'Thêm Treble +3 dB để hi-hat rõ và sáng.',
      'Pan stereo ±0.2 để mở rộng không gian.',
    ],
  },
  {
    title: 'Lesson 3 - Ambient Space',
    steps: [
      'Giữ High-pass thấp để giữ độ ấm.',
      'Set Reverb mix ~0.3 để tạo cảm giác phòng.',
      'Quan sát phổ khi bật/tắt reverb.',
    ],
  },
];

const sampleTones = [
  { label: 'Tone 440Hz', frequency: 440 },
  { label: 'Tone 808Hz', frequency: 808 },
  { label: 'Bass 110Hz', frequency: 110 },
];

const createImpulseResponse = (ctx, duration = 2.5, decay = 2.0) => {
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
};

const createTone = (frequency = 440, duration = 2, sampleRate = 44100) => {
  const length = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);

  for (let i = 0; i < length; i++) {
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    view.setInt16(44 + i * 2, sample * 0.6 * 0x7fff, true);
  }
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
};

export default function AudioEQGamePage() {
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const gainNodeRef = useRef(null);
  const lpRef = useRef(null);
  const hpRef = useRef(null);
  const bassRef = useRef(null);
  const presenceRef = useRef(null);
  const trebleRef = useRef(null);
  const pannerRef = useRef(null);
  const wetGainRef = useRef(null);
  const dryGainRef = useRef(null);
  const convolverRef = useRef(null);
  const rafRef = useRef(null);
  const analyzerCanvasRef = useRef(null);
  const generatedToneRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState(0);
  const [visualMode, setVisualMode] = useState('spectrum');
  const [presetAnchor, setPresetAnchor] = useState(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [settingsJson, setSettingsJson] = useState('');
  const [activePreset, setActivePreset] = useState('');

  const [lowpass, setLowpass] = useState(18000);
  const [highpass, setHighpass] = useState(20);
  const [gain, setGain] = useState(1.0);
  const [bassGain, setBassGain] = useState(0);
  const [presenceGain, setPresenceGain] = useState(0);
  const [presenceFreq, setPresenceFreq] = useState(1500);
  const [trebleGain, setTrebleGain] = useState(0);
  const [stereoPan, setStereoPan] = useState(0);
  const [reverbMix, setReverbMix] = useState(0.2);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current || 0);
      if (generatedToneRef.current) URL.revokeObjectURL(generatedToneRef.current);
      try {
        audioCtxRef.current?.close();
      } catch {}
    };
  }, []);

  const setupAudioGraph = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;

    const gainNode = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = lowpass;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = highpass;

    const bass = ctx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 200;
    bass.gain.value = bassGain;

    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = presenceFreq;
    presence.Q.value = 1.2;
    presence.gain.value = presenceGain;

    const treble = ctx.createBiquadFilter();
    treble.type = 'highshelf';
    treble.frequency.value = 4000;
    treble.gain.value = trebleGain;

    const panner = ctx.createStereoPanner();
    panner.pan.value = stereoPan;

    const convolver = ctx.createConvolver();
    convolver.buffer = createImpulseResponse(ctx);
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();
    wetGain.gain.value = reverbMix;
    dryGain.gain.value = 1 - reverbMix;

    source.connect(hp).connect(lp).connect(bass).connect(presence).connect(treble).connect(gainNode).connect(panner);

    panner.connect(dryGain).connect(analyser).connect(ctx.destination);
    panner.connect(convolver).connect(wetGain).connect(analyser);
    analyser.connect(ctx.destination);

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    gainNodeRef.current = gainNode;
    lpRef.current = lp;
    hpRef.current = hp;
    bassRef.current = bass;
    presenceRef.current = presence;
    trebleRef.current = treble;
    pannerRef.current = panner;
    wetGainRef.current = wetGain;
    dryGainRef.current = dryGain;
    convolverRef.current = convolver;
  };

  const loadAudioFromFile = (file) => {
    const url = URL.createObjectURL(file);
    const audio = audioRef.current;
    audio.src = url;
    audio.oncanplay = () => {
      if (!audioCtxRef.current) setupAudioGraph();
      setIsReady(true);
      drawAnalyzer();
    };
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadAudioFromFile(file);
  };

  const loadTone = (frequency) => {
    const dataUrl = createTone(frequency);
    if (generatedToneRef.current) URL.revokeObjectURL(generatedToneRef.current);
    generatedToneRef.current = dataUrl;
    const audio = audioRef.current;
    audio.src = dataUrl;
    audio.oncanplay = () => {
      if (!audioCtxRef.current) setupAudioGraph();
      setIsReady(true);
      drawAnalyzer();
    };
  };

  const drawAnalyzer = () => {
    const analyser = analyserRef.current;
    const canvas = analyzerCanvasRef.current;
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const freqArray = new Uint8Array(bufferLength);
    const timeArray = new Uint8Array(analyser.fftSize);

    const render = () => {
      const width = (canvas.width = canvas.clientWidth);
      const height = (canvas.height = 220);
      ctx.fillStyle = '#08090d';
      ctx.fillRect(0, 0, width, height);

      if (visualMode === 'spectrum') {
        analyser.getByteFrequencyData(freqArray);
        const barWidth = Math.max(1, width / bufferLength);
        for (let i = 0; i < bufferLength; i++) {
          const value = freqArray[i] / 255;
          const barHeight = value * (height - 4);
          ctx.fillStyle = `hsl(${(i / bufferLength) * 240}, 80%, 55%)`;
          ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
        }
      } else {
        analyser.getByteTimeDomainData(timeArray);
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const sliceWidth = width / timeArray.length;
        let x = 0;
        for (let i = 0; i < timeArray.length; i++) {
          const v = timeArray[i] / 128;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }
      rafRef.current = requestAnimationFrame(render);
    };
    cancelAnimationFrame(rafRef.current || 0);
    render();
  };

  const togglePlay = async () => {
    if (!isReady) return;
    const audio = audioRef.current;
    const ctx = audioCtxRef.current;
    if (ctx?.state === 'suspended') await ctx.resume();
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      await audio.play();
      setPlaying(true);
    }
  };

  const setIfNode = (ref, prop, value) => {
    if (!ref.current) return;
    if (prop === 'frequency') ref.current.frequency.value = value;
    else if (prop === 'gain') ref.current.gain.value = value;
    else if (prop === 'pan') ref.current.pan.value = value;
  };

  useEffect(() => {
    setIfNode(lpRef, 'frequency', lowpass);
  }, [lowpass]);

  useEffect(() => {
    setIfNode(hpRef, 'frequency', highpass);
  }, [highpass]);

  useEffect(() => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = gain;
  }, [gain]);

  useEffect(() => {
    setIfNode(bassRef, 'gain', bassGain);
  }, [bassGain]);

  useEffect(() => {
    if (presenceRef.current) {
      presenceRef.current.gain.value = presenceGain;
      presenceRef.current.frequency.value = presenceFreq;
    }
  }, [presenceGain, presenceFreq]);

  useEffect(() => {
    setIfNode(trebleRef, 'gain', trebleGain);
  }, [trebleGain]);

  useEffect(() => {
    setIfNode(pannerRef, 'pan', stereoPan);
  }, [stereoPan]);

  useEffect(() => {
    if (wetGainRef.current && dryGainRef.current) {
      wetGainRef.current.gain.value = reverbMix;
      dryGainRef.current.gain.value = 1 - reverbMix;
    }
  }, [reverbMix]);

  useEffect(() => {
    if (isReady) drawAnalyzer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualMode]);

  const applyPreset = (preset) => {
    setActivePreset(preset.name);
    const s = preset.settings;
    setHighpass(s.highpass);
    setLowpass(s.lowpass);
    setGain(s.gain);
    setBassGain(s.bassGain);
    setPresenceGain(s.presenceGain);
    setPresenceFreq(s.presenceFreq);
    setTrebleGain(s.trebleGain);
    setStereoPan(s.stereoPan);
    setReverbMix(s.reverbMix);
    setPresetAnchor(null);
  };

  const exportSettings = () => {
    const data = {
      highpass,
      lowpass,
      gain,
      bassGain,
      presenceGain,
      presenceFreq,
      trebleGain,
      stereoPan,
      reverbMix,
    };
    setSettingsJson(JSON.stringify(data, null, 2));
    setExportDialogOpen(true);
  };

  const importSettings = () => {
    try {
      const data = JSON.parse(settingsJson);
      if (typeof data.highpass === 'number') setHighpass(data.highpass);
      if (typeof data.lowpass === 'number') setLowpass(data.lowpass);
      if (typeof data.gain === 'number') setGain(data.gain);
      if (typeof data.bassGain === 'number') setBassGain(data.bassGain);
      if (typeof data.presenceGain === 'number') setPresenceGain(data.presenceGain);
      if (typeof data.presenceFreq === 'number') setPresenceFreq(data.presenceFreq);
      if (typeof data.trebleGain === 'number') setTrebleGain(data.trebleGain);
      if (typeof data.stereoPan === 'number') setStereoPan(data.stereoPan);
      if (typeof data.reverbMix === 'number') setReverbMix(data.reverbMix);
      setExportDialogOpen(false);
    } catch {
      alert('JSON không hợp lệ, vui lòng kiểm tra lại.');
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GraphicEq /> Audio EQ - Mixing Lab
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" startIcon={<Upload />} onClick={() => fileInputRef.current?.click()}>
            Tải file âm thanh
          </Button>
          <input ref={fileInputRef} type="file" accept="audio/*" hidden onChange={onFileChange} />
          <Button
            variant="outlined"
            startIcon={<Equalizer />}
            onClick={(e) => setPresetAnchor(e.currentTarget)}
          >
            Preset
          </Button>
          <Button variant="outlined" startIcon={<Save />} onClick={exportSettings}>
            Export
          </Button>
          <Button variant="outlined" startIcon={<SettingsBackupRestore />} onClick={() => setExportDialogOpen(true)}>
            Import
          </Button>
          <Button
            variant="contained"
            color={playing ? 'warning' : 'primary'}
            startIcon={playing ? <Pause /> : <PlayArrow />}
            disabled={!isReady}
            onClick={togglePlay}
          >
            {playing ? 'Tạm dừng' : 'Phát'}
          </Button>
        </Box>
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {sampleTones.map((tone) => (
            <Chip key={tone.label} icon={<MusicNote />} label={tone.label} onClick={() => loadTone(tone.frequency)} />
          ))}
        </Box>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 2 }}>
          <Tab icon={<Equalizer />} iconPosition="start" label="Điều khiển" />
          <Tab icon={<Info />} iconPosition="start" label="Visualizer" />
          <Tab icon={<GraphicEq />} iconPosition="start" label="Learning" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Bộ lọc cơ bản</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption">High-pass (cắt trầm): {highpass} Hz</Typography>
                  <Slider value={highpass} min={20} max={2000} step={5} onChange={(_, v) => setHighpass(v)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption">Low-pass (cắt cao): {lowpass} Hz</Typography>
                  <Slider value={lowpass} min={2000} max={20000} step={20} onChange={(_, v) => setLowpass(v)} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption">Master Gain: {gain.toFixed(2)}x</Typography>
                  <Slider value={gain} min={0} max={3} step={0.01} onChange={(_, v) => setGain(v)} />
                </Grid>
              </Grid>
            </Paper>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>FX & Stereo</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption">Stereo Pan: {stereoPan.toFixed(2)}</Typography>
                  <Slider value={stereoPan} min={-1} max={1} step={0.01} onChange={(_, v) => setStereoPan(v)} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption">Reverb Mix: {(reverbMix * 100).toFixed(0)}%</Typography>
                  <Slider value={reverbMix} min={0} max={0.8} step={0.01} onChange={(_, v) => setReverbMix(v)} />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>EQ nâng cao</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption">Bass (Low Shelf @200Hz): {bassGain} dB</Typography>
                  <Slider value={bassGain} min={-12} max={12} step={0.5} onChange={(_, v) => setBassGain(v)} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption">Presence Gain: {presenceGain} dB</Typography>
                  <Slider value={presenceGain} min={-12} max={12} step={0.5} onChange={(_, v) => setPresenceGain(v)} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption">Presence Frequency: {presenceFreq} Hz</Typography>
                  <Slider value={presenceFreq} min={400} max={4000} step={10} onChange={(_, v) => setPresenceFreq(v)} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption">Treble (High Shelf @4kHz): {trebleGain} dB</Typography>
                  <Slider value={trebleGain} min={-12} max={12} step={0.5} onChange={(_, v) => setTrebleGain(v)} />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1">Visualizer</Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={visualMode}
              onChange={(_, v) => v && setVisualMode(v)}
            >
              <ToggleButton value="spectrum">Spectrum</ToggleButton>
              <ToggleButton value="waveform">Waveform</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <canvas ref={analyzerCanvasRef} style={{ width: '100%', height: 240, display: 'block' }} />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Spectrum thể hiện năng lượng theo tần số, Waveform thể hiện biên độ theo thời gian.
          </Typography>
        </Paper>
      )}

      {tab === 2 && (
        <Grid container spacing={2}>
          {learningMissions.map((mission) => (
            <Grid item xs={12} md={4} key={mission.title}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom>{mission.title}</Typography>
                <ol>
                  {mission.steps.map((step) => (
                    <li key={step}>
                      <Typography variant="body2">{step}</Typography>
                    </li>
                  ))}
                </ol>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Menu anchorEl={presetAnchor} open={Boolean(presetAnchor)} onClose={() => setPresetAnchor(null)}>
        {presets.map((preset) => (
          <MenuItem key={preset.name} onClick={() => applyPreset(preset)} sx={{ gap: 1, alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle2">{preset.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {preset.description}
              </Typography>
            </Box>
            {activePreset === preset.name && <Chip size="small" color="success" label="Đang dùng" />}
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cấu hình EQ</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Sao chép JSON để lưu preset hoặc dán JSON để import.
          </Alert>
          <TextField
            fullWidth
            multiline
            minRows={8}
            value={settingsJson}
            onChange={(e) => setSettingsJson(e.target.value)}
            placeholder="{ ... }"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Đóng</Button>
          <Button variant="contained" onClick={importSettings}>Import</Button>
        </DialogActions>
      </Dialog>

      <audio ref={audioRef} controls style={{ display: 'none' }} />
    </Box>
  );
}
