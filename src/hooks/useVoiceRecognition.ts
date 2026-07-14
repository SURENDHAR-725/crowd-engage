/**
 * useVoiceRecognition Hook
 * 
 * React hook wrapping VoiceRecognitionService for speech-to-text.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  VoiceRecognitionService,
  isSpeechRecognitionSupported,
  type VoiceRecognitionConfig,
  type SpeechMetrics,
} from '@/services/voiceRecognitionService';

export interface UseVoiceRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  metrics: SpeechMetrics;
  startListening: () => void;
  stopListening: () => void;
  pauseListening: () => void;
  resumeListening: () => void;
  resetTranscript: () => void;
  markAIFinishedSpeaking: () => void;
}

export function useVoiceRecognition(
  config?: VoiceRecognitionConfig,
  onSilenceDetected?: () => void
): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SpeechMetrics>({
    wordsPerMinute: 0,
    totalWords: 0,
    fillerWordCount: 0,
    fillerWords: {},
    speakingDurationMs: 0,
    responseLatencyMs: 0,
  });

  const serviceRef = useRef<VoiceRecognitionService | null>(null);
  const isSupported = isSpeechRecognitionSupported();

  // Initialize service on mount
  useEffect(() => {
    if (!isSupported) return;

    serviceRef.current = new VoiceRecognitionService(
      {
        onInterimTranscript: (text) => {
          setInterimTranscript(text);
        },
        onFinalTranscript: (text) => {
          setTranscript(prev => (prev ? prev + ' ' + text : text).trim());
          setInterimTranscript('');
        },
        onSilenceDetected: () => {
          if (serviceRef.current) {
            setMetrics(serviceRef.current.getMetrics());
          }
          onSilenceDetected?.();
        },
        onStart: () => setIsListening(true),
        onEnd: () => {},
        onError: (err) => setError(err),
        onSpeakingStart: () => {},
        onSpeakingStop: () => {
          if (serviceRef.current) {
            setMetrics(serviceRef.current.getMetrics());
          }
        },
      },
      config
    );

    return () => {
      serviceRef.current?.stop();
      serviceRef.current = null;
    };
  }, [isSupported]);

  const startListening = useCallback(() => {
    setError(null);
    serviceRef.current?.resetMetrics();
    serviceRef.current?.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    serviceRef.current?.stop();
    setIsListening(false);
    if (serviceRef.current) {
      setMetrics(serviceRef.current.getMetrics());
    }
  }, []);

  const pauseListening = useCallback(() => {
    serviceRef.current?.pause();
    setIsListening(false);
  }, []);

  const resumeListening = useCallback(() => {
    serviceRef.current?.resume();
    setIsListening(true);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    serviceRef.current?.resetMetrics();
    setMetrics({
      wordsPerMinute: 0,
      totalWords: 0,
      fillerWordCount: 0,
      fillerWords: {},
      speakingDurationMs: 0,
      responseLatencyMs: 0,
    });
  }, []);

  const markAIFinishedSpeaking = useCallback(() => {
    serviceRef.current?.markAIFinishedSpeaking();
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    metrics,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    resetTranscript,
    markAIFinishedSpeaking,
  };
}
