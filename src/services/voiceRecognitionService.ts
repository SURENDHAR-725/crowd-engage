/**
 * Voice Recognition Service
 * 
 * Wraps the browser Web Speech API (SpeechRecognition) for continuous
 * voice input with silence detection, filler word tracking, and WPM calculation.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VoiceRecognitionCallbacks {
  onInterimTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onSilenceDetected?: () => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onSpeakingStart?: () => void;
  onSpeakingStop?: () => void;
}

export interface VoiceRecognitionConfig {
  language?: string;
  silenceTimeout?: number;       // ms before silence triggers submit (default 2000)
  minConfidence?: number;        // minimum confidence threshold (0-1, default 0.4)
  continuous?: boolean;          // keep listening after result (default true)
  interimResults?: boolean;      // show partial results (default true)
}

export interface SpeechMetrics {
  wordsPerMinute: number;
  totalWords: number;
  fillerWordCount: number;
  fillerWords: Record<string, number>;
  speakingDurationMs: number;
  responseLatencyMs: number;     // time from AI finish speaking to user start
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FILLER_WORDS = [
  'um', 'uh', 'uhh', 'umm', 'er', 'err', 'ah', 'ahh',
  'like', 'you know', 'i mean', 'so', 'basically', 'actually',
  'literally', 'right', 'well', 'kind of', 'sort of'
];

const DEFAULT_CONFIG: Required<VoiceRecognitionConfig> = {
  language: 'en-US',
  silenceTimeout: 2000,
  minConfidence: 0.4,
  continuous: true,
  interimResults: true,
};

// ─── Browser API Detection ──────────────────────────────────────────────────

type SpeechRecognitionType = typeof window.webkitSpeechRecognition;

function getSpeechRecognitionConstructor(): SpeechRecognitionType | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

// ─── Service Class ──────────────────────────────────────────────────────────

export class VoiceRecognitionService {
  private recognition: any = null;
  private config: Required<VoiceRecognitionConfig>;
  private callbacks: VoiceRecognitionCallbacks;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;
  private restartRequested = false;

  // Metrics tracking
  private speakingStartTime: number | null = null;
  private answerStartTime: number | null = null;
  private totalSpeakingDuration = 0;
  private wordBuffer: string[] = [];
  private fillerCounts: Record<string, number> = {};
  private aiFinishSpeakingTime: number | null = null;
  private responseLatency = 0;
  private userHasSpoken = false;

  constructor(
    callbacks: VoiceRecognitionCallbacks = {},
    config: VoiceRecognitionConfig = {}
  ) {
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize and start the speech recognition engine
   */
  start(): boolean {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      this.callbacks.onError?.('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return false;
    }

    if (this.isRunning) return true;

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = this.config.language;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.maxAlternatives = 1;

      this.setupEventHandlers();
      this.recognition.start();
      this.isRunning = true;
      this.restartRequested = true;
      return true;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      this.callbacks.onError?.('Failed to start microphone. Please check permissions.');
      return false;
    }
  }

  /**
   * Stop the recognition engine completely
   */
  stop(): void {
    this.restartRequested = false;
    this.isRunning = false;
    this.clearSilenceTimer();

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Already stopped
      }
      this.recognition = null;
    }
  }

  /**
   * Temporarily pause listening (e.g., while AI is speaking)
   */
  pause(): void {
    this.restartRequested = false;
    this.clearSilenceTimer();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Already stopped
      }
    }
    this.isRunning = false;
  }

  /**
   * Resume listening after a pause
   */
  resume(): void {
    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * Mark the time when AI finishes speaking (for response latency calc)
   */
  markAIFinishedSpeaking(): void {
    this.aiFinishSpeakingTime = Date.now();
    this.userHasSpoken = false;
  }

  /**
   * Reset metrics for a new answer
   */
  resetMetrics(): void {
    this.speakingStartTime = null;
    this.answerStartTime = null;
    this.totalSpeakingDuration = 0;
    this.wordBuffer = [];
    this.fillerCounts = {};
    this.responseLatency = 0;
    this.userHasSpoken = false;
  }

  /**
   * Get current speech metrics
   */
  getMetrics(): SpeechMetrics {
    const totalWords = this.wordBuffer.length;
    const durationMin = this.totalSpeakingDuration / 60000;
    const wpm = durationMin > 0 ? Math.round(totalWords / durationMin) : 0;
    const fillerTotal = Object.values(this.fillerCounts).reduce((s, c) => s + c, 0);

    return {
      wordsPerMinute: wpm,
      totalWords,
      fillerWordCount: fillerTotal,
      fillerWords: { ...this.fillerCounts },
      speakingDurationMs: this.totalSpeakingDuration,
      responseLatencyMs: this.responseLatency,
    };
  }

  // ─── Private Methods ────────────────────────────────────────────────────

  private setupEventHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.callbacks.onStart?.();
    };

    this.recognition.onend = () => {
      this.callbacks.onEnd?.();
      // Auto-restart if we still want to be listening
      if (this.restartRequested && this.isRunning) {
        try {
          setTimeout(() => {
            if (this.restartRequested && this.recognition) {
              this.recognition.start();
            }
          }, 100);
        } catch {
          // Ignore restart errors
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      const error = event.error;
      
      // 'no-speech' is not a real error, just means silence
      if (error === 'no-speech') return;
      
      // 'aborted' happens when we intentionally stop
      if (error === 'aborted') return;

      if (error === 'not-allowed') {
        this.callbacks.onError?.('Microphone access was denied. Please allow microphone permissions and try again.');
        this.stop();
        return;
      }

      if (error === 'network') {
        this.callbacks.onError?.('Network error during speech recognition. Please check your connection.');
        return;
      }

      console.warn('Speech recognition error:', error);
    };

    this.recognition.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          // Filter by confidence
          if (confidence >= this.config.minConfidence) {
            finalText += transcript;
          }
        } else {
          interimText += transcript;
        }
      }

      // Track when user starts speaking
      if ((interimText || finalText) && !this.userHasSpoken) {
        this.userHasSpoken = true;
        this.answerStartTime = Date.now();
        this.speakingStartTime = Date.now();
        
        // Calculate response latency
        if (this.aiFinishSpeakingTime) {
          this.responseLatency = Date.now() - this.aiFinishSpeakingTime;
        }
        
        this.callbacks.onSpeakingStart?.();
      }

      if (interimText) {
        this.callbacks.onInterimTranscript?.(interimText);
        this.resetSilenceTimer();
      }

      if (finalText) {
        // Track words and fillers
        this.trackWords(finalText);

        // Update speaking duration
        if (this.speakingStartTime) {
          this.totalSpeakingDuration += Date.now() - this.speakingStartTime;
          this.speakingStartTime = Date.now();
        }

        this.callbacks.onFinalTranscript?.(finalText);
        this.resetSilenceTimer();
      }
    };
  }

  private trackWords(text: string): void {
    const words = text.toLowerCase().trim().split(/\s+/).filter(Boolean);
    this.wordBuffer.push(...words);

    // Count filler words
    const lowerText = text.toLowerCase();
    for (const filler of FILLER_WORDS) {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        this.fillerCounts[filler] = (this.fillerCounts[filler] || 0) + matches.length;
      }
    }
  }

  private resetSilenceTimer(): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      // User stopped speaking
      if (this.speakingStartTime) {
        this.totalSpeakingDuration += Date.now() - this.speakingStartTime;
        this.speakingStartTime = null;
      }
      this.callbacks.onSpeakingStop?.();
      this.callbacks.onSilenceDetected?.();
    }, this.config.silenceTimeout);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }
}
