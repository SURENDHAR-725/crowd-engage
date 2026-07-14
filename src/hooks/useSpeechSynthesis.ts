/**
 * useSpeechSynthesis Hook
 * 
 * React hook wrapping SpeechSynthesisService for text-to-speech.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  SpeechSynthesisService,
  isSpeechSynthesisSupported,
  type SpeechSynthesisConfig,
} from '@/services/speechSynthesisService';

export interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  currentSentence: string;
  voicesLoaded: boolean;
  speak: (text: string) => Promise<void>;
  addToStream: (sentence: string) => void;
  stop: () => void;
  interrupt: () => void;
}

export function useSpeechSynthesis(
  config?: SpeechSynthesisConfig,
  onSpeakingEnd?: () => void
): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSentence, setCurrentSentence] = useState('');
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  const serviceRef = useRef<SpeechSynthesisService | null>(null);
  const isSupported = isSpeechSynthesisSupported();

  useEffect(() => {
    if (!isSupported) return;

    serviceRef.current = new SpeechSynthesisService(
      {
        onSpeakingStart: () => setIsSpeaking(true),
        onSpeakingEnd: () => {
          setIsSpeaking(false);
          setCurrentSentence('');
          onSpeakingEnd?.();
        },
        onSentenceStart: (sentence) => setCurrentSentence(sentence),
        onSentenceEnd: () => {},
        onError: (err) => console.warn('Speech synthesis error:', err),
      },
      config
    );

    // Check if voices loaded
    const checkVoices = setInterval(() => {
      if (serviceRef.current?.getVoicesLoaded()) {
        setVoicesLoaded(true);
        clearInterval(checkVoices);
      }
    }, 100);

    return () => {
      clearInterval(checkVoices);
      serviceRef.current?.destroy();
      serviceRef.current = null;
    };
  }, [isSupported]);

  const speak = useCallback(async (text: string) => {
    if (serviceRef.current) {
      await serviceRef.current.speak(text);
    }
  }, []);

  const addToStream = useCallback((sentence: string) => {
    serviceRef.current?.addToStream(sentence);
  }, []);

  const stop = useCallback(() => {
    serviceRef.current?.stop();
    setIsSpeaking(false);
    setCurrentSentence('');
  }, []);

  const interrupt = useCallback(() => {
    serviceRef.current?.interrupt();
    setIsSpeaking(false);
    setCurrentSentence('');
  }, []);

  return {
    isSupported,
    isSpeaking,
    currentSentence,
    voicesLoaded,
    speak,
    addToStream,
    stop,
    interrupt,
  };
}
