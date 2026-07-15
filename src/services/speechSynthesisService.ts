/**
 * Speech Synthesis Service
 * 
 * Wraps ElevenLabs API for natural text-to-speech
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

const ELEVENLABS_API_KEY = "sk_0ea8759555ef39e573ea49d7b292ad2eb75cd4016970afc3";
const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

const DEFAULT_CONFIG: Required<SpeechSynthesisConfig> = {
  voice: '',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  language: 'en-US',
};

// ─── Browser API Detection ──────────────────────────────────────────────────

export function isSpeechSynthesisSupported(): boolean {
  return true; // We use an API now
}

// ─── Service Class ──────────────────────────────────────────────────────────

export class SpeechSynthesisService {
  private config: Required<SpeechSynthesisConfig>;
  private callbacks: SpeechSynthesisCallbacks;
  private voicesLoaded = true;
  private sentenceQueue: string[] = [];
  private isSpeakingActive = false;
  private isInterrupted = false;
  private currentAudio: HTMLAudioElement | null = null;
  private queueProcessing = false;

  constructor(
    callbacks: SpeechSynthesisCallbacks = {},
    config: SpeechSynthesisConfig = {}
  ) {
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Speak a complete text. Splits into sentences for natural pacing.
   */
  async speak(text: string): Promise<void> {
    this.stop(); // Clear any previous speech
    this.isInterrupted = false;

    const sentences = this.splitIntoSentences(text);
    this.sentenceQueue = sentences;
    this.isSpeakingActive = true;
    this.callbacks.onSpeakingStart?.();

    if (!this.queueProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Add sentences to the streaming queue and start speaking immediately.
   * Called repeatedly as streaming tokens arrive.
   */
  addToStream(sentence: string): void {
    this.sentenceQueue.push(sentence);
    
    if (!this.isSpeakingActive) {
      this.isSpeakingActive = true;
      this.isInterrupted = false;
      this.callbacks.onSpeakingStart?.();
    }
    
    if (!this.queueProcessing) {
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

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
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
    return []; // Return empty as we don't use browser voices anymore
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
  }

  // ─── Private Methods ────────────────────────────────────────────────────

  private async processQueue(): Promise<void> {
    if (this.queueProcessing) return;
    this.queueProcessing = true;
    
    while (this.sentenceQueue.length > 0 && !this.isInterrupted) {
      const sentence = this.sentenceQueue.shift()!;
      if (!sentence.trim()) continue;

      try {
        await this.speakSentence(sentence);
      } catch (err) {
        console.error("ElevenLabs TTS Error:", err);
        this.callbacks.onError?.(err instanceof Error ? err.message : String(err));
      }
      this.callbacks.onSentenceEnd?.(sentence);

      // Small natural pause between sentences
      if (!this.isInterrupted && this.sentenceQueue.length > 0) {
        await this.delay(150);
      }
    }

    this.queueProcessing = false;
    if (!this.isInterrupted) {
      this.isSpeakingActive = false;
      this.callbacks.onSpeakingEnd?.();
    }
  }

  private speakSentence(text: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.isInterrupted) {
        resolve();
        return;
      }

      try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_turbo_v2_5"
          })
        });

        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        this.currentAudio = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          resolve();
        };

        audio.onerror = (e) => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          reject(new Error("Audio playback failed"));
        };

        if (this.isInterrupted) {
          URL.revokeObjectURL(audioUrl);
          resolve();
          return;
        }

        this.callbacks.onSentenceStart?.(text);
        await audio.play();
      } catch (err) {
        reject(err);
      }
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
