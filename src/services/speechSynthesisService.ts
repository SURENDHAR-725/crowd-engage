/**
 * Speech Synthesis Service
 * 
 * Wraps the browser SpeechSynthesis API for natural text-to-speech
 * with streaming support, interrupt handling, and speaking state callbacks.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SpeechSynthesisCallbacks {
  onSpeakingStart?: () => void;
  onSpeakingEnd?: () => void;
  onSentenceStart?: (sentence: string) => void;
  onSentenceEnd?: (sentence: string) => void;
  onError?: (error: string) => void;
}

export interface SpeechSynthesisConfig {
  voice?: string;      // Voice name preference
  rate?: number;       // Speech rate (0.1 - 2.0, default 1.0)
  pitch?: number;      // Pitch (0 - 2.0, default 1.0)
  volume?: number;     // Volume (0 - 1.0, default 1.0)
  language?: string;   // Language (default 'en-US')
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Required<SpeechSynthesisConfig> = {
  voice: '',
  rate: 0.95,
  pitch: 1.0,
  volume: 0.9,
  language: 'en-US',
};

// Preferred voice names (in order of preference) for natural sound
const PREFERRED_VOICES = [
  'Google UK English Male',
  'Google US English',
  'Microsoft David',
  'Microsoft Mark',
  'Daniel',
  'Alex',
  'Samantha',
  'Google UK English Female',
  'Microsoft Zira',
];

// ─── Browser API Detection ──────────────────────────────────────────────────

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// ─── Service Class ──────────────────────────────────────────────────────────

export class SpeechSynthesisService {
  private synth: SpeechSynthesis | null = null;
  private config: Required<SpeechSynthesisConfig>;
  private callbacks: SpeechSynthesisCallbacks;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded = false;
  private sentenceQueue: string[] = [];
  private isSpeakingActive = false;
  private isInterrupted = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor(
    callbacks: SpeechSynthesisCallbacks = {},
    config: SpeechSynthesisConfig = {}
  ) {
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (isSpeechSynthesisSupported()) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
    }
  }

  /**
   * Speak a complete text. Splits into sentences for natural pacing.
   */
  async speak(text: string): Promise<void> {
    if (!this.synth) {
      this.callbacks.onError?.('Speech synthesis is not supported in this browser.');
      return;
    }

    this.stop(); // Clear any previous speech
    this.isInterrupted = false;

    const sentences = this.splitIntoSentences(text);
    this.sentenceQueue = sentences;
    this.isSpeakingActive = true;
    this.callbacks.onSpeakingStart?.();

    await this.processQueue();
  }

  /**
   * Add sentences to the streaming queue and start speaking immediately.
   * Called repeatedly as streaming tokens arrive.
   */
  addToStream(sentence: string): void {
    if (!this.synth) return;
    
    this.sentenceQueue.push(sentence);
    
    if (!this.isSpeakingActive) {
      this.isSpeakingActive = true;
      this.isInterrupted = false;
      this.callbacks.onSpeakingStart?.();
      this.processQueue();
    }
  }

  /**
   * Immediately stop all speech (used when user interrupts)
   */
  stop(): void {
    this.isInterrupted = true;
    this.isSpeakingActive = false;
    this.sentenceQueue = [];
    this.currentUtterance = null;

    if (this.synth) {
      this.synth.cancel();
    }
  }

  /**
   * Interrupt speech (stop and signal to the caller)
   */
  interrupt(): void {
    if (this.isSpeakingActive) {
      this.stop();
      this.callbacks.onSpeakingEnd?.();
    }
  }

  /**
   * Check if currently speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeakingActive;
  }

  /**
   * Check if voices have loaded
   */
  getVoicesLoaded(): boolean {
    return this.voicesLoaded;
  }

  /**
   * Get list of available voices
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synth?.getVoices() || [];
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.synth = null;
  }

  // ─── Private Methods ────────────────────────────────────────────────────

  private loadVoices(): void {
    if (!this.synth) return;

    const doLoad = () => {
      const voices = this.synth!.getVoices();
      if (voices.length > 0) {
        this.selectBestVoice(voices);
        this.voicesLoaded = true;
      }
    };

    // Voices may be loaded asynchronously
    doLoad();
    this.synth.onvoiceschanged = () => doLoad();
  }

  private selectBestVoice(voices: SpeechSynthesisVoice[]): void {
    // If user specified a voice name, try to find it
    if (this.config.voice) {
      const match = voices.find(v =>
        v.name.toLowerCase().includes(this.config.voice.toLowerCase())
      );
      if (match) {
        this.selectedVoice = match;
        return;
      }
    }

    // Try preferred voices in order
    for (const preferred of PREFERRED_VOICES) {
      const match = voices.find(v =>
        v.name.toLowerCase().includes(preferred.toLowerCase())
      );
      if (match) {
        this.selectedVoice = match;
        return;
      }
    }

    // Fallback: first English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      this.selectedVoice = englishVoice;
      return;
    }

    // Last resort: first available voice
    this.selectedVoice = voices[0] || null;
  }

  private async processQueue(): Promise<void> {
    while (this.sentenceQueue.length > 0 && !this.isInterrupted) {
      const sentence = this.sentenceQueue.shift()!;
      if (!sentence.trim()) continue;

      this.callbacks.onSentenceStart?.(sentence);
      await this.speakSentence(sentence);
      this.callbacks.onSentenceEnd?.(sentence);

      // Small natural pause between sentences
      if (!this.isInterrupted && this.sentenceQueue.length > 0) {
        await this.delay(150);
      }
    }

    if (!this.isInterrupted) {
      this.isSpeakingActive = false;
      this.callbacks.onSpeakingEnd?.();
    }
  }

  private speakSentence(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth || this.isInterrupted) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      utterance.rate = this.config.rate;
      utterance.pitch = this.config.pitch;
      utterance.volume = this.config.volume;
      utterance.lang = this.config.language;

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        // 'interrupted' and 'canceled' are expected during stop/interrupt
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.warn('Speech synthesis error:', event.error);
        }
        resolve();
      };

      this.synth.speak(utterance);
    });
  }

  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries, keeping the punctuation with the sentence
    const raw = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    return raw.map(s => s.trim()).filter(Boolean);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
