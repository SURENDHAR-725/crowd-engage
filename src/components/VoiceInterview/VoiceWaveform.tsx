/**
 * VoiceWaveform Component
 * 
 * Canvas-based audio waveform visualization that shows real-time
 * microphone input when the user is speaking.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface VoiceWaveformProps {
  isActive: boolean;
  variant: 'user' | 'ai';
}

export function VoiceWaveform({ isActive, variant }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [hasAudioAccess, setHasAudioAccess] = useState(false);

  // Setup audio analyser for user microphone
  useEffect(() => {
    if (variant !== 'user' || !isActive) return;

    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;

    const setup = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;
        setHasAudioAccess(true);
      } catch {
        setHasAudioAccess(false);
      }
    };

    setup();

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (audioContext) {
        audioContext.close();
      }
      analyserRef.current = null;
      setHasAudioAccess(false);
    };
  }, [variant, isActive]);

  // Animation loop
  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const barCount = 32;
    const barWidth = (width / barCount) * 0.6;
    const gap = (width / barCount) * 0.4;

    const primaryColor = variant === 'user' ? 'rgba(52, 211, 153, ' : 'rgba(139, 92, 246, ';

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (variant === 'user' && analyserRef.current && hasAudioAccess) {
        // Real audio data
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * dataArray.length);
          const value = dataArray[dataIndex] / 255;
          const barHeight = Math.max(2, value * height * 0.8);

          const x = i * (barWidth + gap) + gap / 2;
          const y = (height - barHeight) / 2;

          ctx.fillStyle = primaryColor + (0.4 + value * 0.6) + ')';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else {
        // Simulated waveform for AI speaking
        const time = Date.now() / 1000;
        for (let i = 0; i < barCount; i++) {
          const phase = (i / barCount) * Math.PI * 2;
          const wave1 = Math.sin(time * 3 + phase) * 0.3;
          const wave2 = Math.sin(time * 5 + phase * 1.5) * 0.2;
          const wave3 = Math.sin(time * 2 + phase * 0.7) * 0.15;
          const value = isActive ? 0.2 + Math.abs(wave1 + wave2 + wave3) : 0.05;
          const barHeight = Math.max(2, value * height * 0.9);

          const x = i * (barWidth + gap) + gap / 2;
          const y = (height - barHeight) / 2;

          ctx.fillStyle = primaryColor + (0.3 + value * 0.7) + ')';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, variant, hasAudioAccess]);

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0.3 }}
      transition={{ duration: 0.3 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-12 sm:h-16"
        style={{ display: 'block' }}
      />
    </motion.div>
  );
}
