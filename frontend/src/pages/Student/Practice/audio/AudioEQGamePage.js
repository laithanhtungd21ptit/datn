import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, Slider, Typography } from '@mui/material';

export default function AudioEQGamePage() {
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const gainNodeRef = useRef(null);
  const lpRef = useRef(null);
  const hpRef = useRef(null);
  const rafRef = useRef(null);
  const canvasRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [lowpass, setLowpass] = useState(16000); // Hz
  const [highpass, setHighpass] = useState(20); // Hz
  const [gain, setGain] = useState(1.0); // linear

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current || 0);
      try { audioCtxRef.current?.close(); } catch {}
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

    source.connect(hp).connect(lp).connect(gainNode).connect(analyser).connect(ctx.destination);

    audioCtxRef.current = ctx;
    sourceRef.current = source;
    analyserRef.current = analyser;
    gainNodeRef.current = gainNode;
    lpRef.current = lp;
    hpRef.current = hp;
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const audio = audioRef.current;
    audio.src = url;
    audio.oncanplay = () => {
      if (!audioCtxRef.current) setupAudioGraph();
      setIsReady(true);
      drawSpectrum();
    };
  };

  const drawSpectrum = () => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const render = () => {
      analyser.getByteFrequencyData(dataArray);
      const w = canvas.width = canvas.clientWidth;
      const h = canvas.height = 160;
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, w, h);
      const barWidth = Math.max(1, w / bufferLength);
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 255;
        const barHeight = v * (h - 2);
        ctx.fillStyle = '#90caf9';
        ctx.fillRect(i * barWidth, h - barHeight, barWidth, barHeight);
      }
      rafRef.current = requestAnimationFrame(render);
    };
    render();
  };

  const togglePlay = async () => {
    if (!isReady) return;
    const audio = audioRef.current;
    if (audioCtxRef.current?.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      await audio.play();
      setPlaying(true);
    }
  };

  // live update
  useEffect(() => {
    if (lpRef.current) lpRef.current.frequency.value = lowpass;
  }, [lowpass]);
  useEffect(() => {
    if (hpRef.current) hpRef.current.frequency.value = highpass;
  }, [highpass]);
  useEffect(() => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = gain;
  }, [gain]);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Audio EQ - Lọc & Khuếch đại</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="outlined" onClick={() => fileInputRef.current?.click()}>Tải file âm thanh</Button>
          <input ref={fileInputRef} type="file" accept="audio/*" hidden onChange={onFileChange} />
          <Button variant="contained" disabled={!isReady} onClick={togglePlay}>{playing ? 'Tạm dừng' : 'Phát'}</Button>
          <audio ref={audioRef} controls style={{ display: 'none' }} />
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Bộ lọc</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          <Box>
            <Typography variant="caption">High-pass (cắt trầm): {highpass} Hz</Typography>
            <Slider value={highpass} min={20} max={2000} step={1} onChange={(_, v) => setHighpass(v)} />
          </Box>
          <Box>
            <Typography variant="caption">Low-pass (cắt cao): {lowpass} Hz</Typography>
            <Slider value={lowpass} min={2000} max={20000} step={10} onChange={(_, v) => setLowpass(v)} />
          </Box>
          <Box>
            <Typography variant="caption">Gain: {gain.toFixed(2)}x</Typography>
            <Slider value={gain} min={0} max={3} step={0.01} onChange={(_, v) => setGain(v)} />
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Phổ tần số (Spectrum)</Typography>
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: 160, display: 'block' }} />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Quan sát phổ tần số khi thay đổi high-pass, low-pass và gain.
        </Typography>
      </Paper>
    </Box>
  );
}


