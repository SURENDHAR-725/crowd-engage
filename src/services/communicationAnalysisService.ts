/**
 * Communication Analysis Service
 * 
 * Tracks real-time communication metrics during the voice interview:
 * speaking speed, response time, filler words, confidence estimation.
 */

import type { SpeechMetrics } from './voiceRecognitionService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QuestionMetrics {
  questionIndex: number;
  question: string;
  answer: string;
  speechMetrics: SpeechMetrics;
  confidenceScore: number;      // 1-10 estimated
  clarityScore: number;         // 1-10 estimated
}

export interface AggregateMetrics {
  totalQuestions: number;
  averageWPM: number;
  averageResponseLatencyMs: number;
  totalFillerWords: number;
  fillerWordDensity: number;     // fillers per 100 words
  averageConfidence: number;     // 1-10
  averageClarity: number;        // 1-10
  overallCommunicationScore: number; // 1-10
  questionMetrics: QuestionMetrics[];
}

// ─── Service Class ──────────────────────────────────────────────────────────

export class CommunicationAnalysisService {
  private questionMetrics: QuestionMetrics[] = [];

  /**
   * Record metrics for a completed question-answer pair.
   */
  recordAnswer(
    questionIndex: number,
    question: string,
    answer: string,
    speechMetrics: SpeechMetrics
  ): QuestionMetrics {
    const confidence = this.estimateConfidence(speechMetrics);
    const clarity = this.estimateClarity(speechMetrics);

    const metrics: QuestionMetrics = {
      questionIndex,
      question,
      answer,
      speechMetrics,
      confidenceScore: confidence,
      clarityScore: clarity,
    };

    this.questionMetrics.push(metrics);
    return metrics;
  }

  /**
   * Get aggregate metrics across all recorded answers.
   */
  getAggregate(): AggregateMetrics {
    const n = this.questionMetrics.length;

    if (n === 0) {
      return {
        totalQuestions: 0,
        averageWPM: 0,
        averageResponseLatencyMs: 0,
        totalFillerWords: 0,
        fillerWordDensity: 0,
        averageConfidence: 5,
        averageClarity: 5,
        overallCommunicationScore: 5,
        questionMetrics: [],
      };
    }

    const totalWPM = this.questionMetrics.reduce((s, m) => s + m.speechMetrics.wordsPerMinute, 0);
    const totalLatency = this.questionMetrics.reduce((s, m) => s + m.speechMetrics.responseLatencyMs, 0);
    const totalFillers = this.questionMetrics.reduce((s, m) => s + m.speechMetrics.fillerWordCount, 0);
    const totalWords = this.questionMetrics.reduce((s, m) => s + m.speechMetrics.totalWords, 0);
    const totalConfidence = this.questionMetrics.reduce((s, m) => s + m.confidenceScore, 0);
    const totalClarity = this.questionMetrics.reduce((s, m) => s + m.clarityScore, 0);

    const avgWPM = Math.round(totalWPM / n);
    const avgLatency = Math.round(totalLatency / n);
    const fillerDensity = totalWords > 0 ? Math.round((totalFillers / totalWords) * 100 * 10) / 10 : 0;
    const avgConfidence = Math.round((totalConfidence / n) * 10) / 10;
    const avgClarity = Math.round((totalClarity / n) * 10) / 10;

    // Overall communication score: weighted average
    const overallComm = Math.round(
      (avgConfidence * 0.3 + avgClarity * 0.3 + this.scoreWPM(avgWPM) * 0.2 + this.scoreFillerDensity(fillerDensity) * 0.2) * 10
    ) / 10;

    return {
      totalQuestions: n,
      averageWPM: avgWPM,
      averageResponseLatencyMs: avgLatency,
      totalFillerWords: totalFillers,
      fillerWordDensity: fillerDensity,
      averageConfidence: avgConfidence,
      averageClarity: avgClarity,
      overallCommunicationScore: Math.min(10, Math.max(1, overallComm)),
      questionMetrics: [...this.questionMetrics],
    };
  }

  /**
   * Reset all recorded metrics (for a new interview).
   */
  reset(): void {
    this.questionMetrics = [];
  }

  /**
   * Get the last recorded question metrics.
   */
  getLastMetrics(): QuestionMetrics | null {
    return this.questionMetrics.length > 0
      ? this.questionMetrics[this.questionMetrics.length - 1]
      : null;
  }

  // ─── Private Estimation Methods ─────────────────────────────────────────

  /**
   * Estimate confidence based on speech patterns.
   * Factors: speaking speed (not too fast/slow), few fillers, quick response.
   */
  private estimateConfidence(metrics: SpeechMetrics): number {
    let score = 5; // baseline

    // Speaking speed: ideal range is 120-160 WPM
    const wpm = metrics.wordsPerMinute;
    if (wpm >= 120 && wpm <= 160) {
      score += 2;
    } else if (wpm >= 100 && wpm <= 180) {
      score += 1;
    } else if (wpm < 60 || wpm > 220) {
      score -= 2;
    }

    // Filler words: fewer is better
    const fillerRate = metrics.totalWords > 0
      ? metrics.fillerWordCount / metrics.totalWords
      : 0;
    if (fillerRate < 0.02) {
      score += 2;
    } else if (fillerRate < 0.05) {
      score += 1;
    } else if (fillerRate > 0.1) {
      score -= 2;
    } else if (fillerRate > 0.07) {
      score -= 1;
    }

    // Response latency: quick response shows confidence
    if (metrics.responseLatencyMs < 2000) {
      score += 1;
    } else if (metrics.responseLatencyMs > 5000) {
      score -= 1;
    }

    return Math.min(10, Math.max(1, score));
  }

  /**
   * Estimate clarity based on word count and speaking duration.
   * A clear answer has enough words spoken at a reasonable pace.
   */
  private estimateClarity(metrics: SpeechMetrics): number {
    let score = 5;

    // Word count: too few words suggests unclear/incomplete answer
    if (metrics.totalWords >= 30) {
      score += 2;
    } else if (metrics.totalWords >= 15) {
      score += 1;
    } else if (metrics.totalWords < 5) {
      score -= 2;
    }

    // Speaking speed in ideal range suggests clear articulation
    const wpm = metrics.wordsPerMinute;
    if (wpm >= 110 && wpm <= 170) {
      score += 2;
    } else if (wpm >= 80 && wpm <= 200) {
      score += 1;
    } else {
      score -= 1;
    }

    // Low filler density means clearer speech
    const fillerRate = metrics.totalWords > 0
      ? metrics.fillerWordCount / metrics.totalWords
      : 0;
    if (fillerRate < 0.03) {
      score += 1;
    } else if (fillerRate > 0.08) {
      score -= 1;
    }

    return Math.min(10, Math.max(1, score));
  }

  /**
   * Score WPM on a 1-10 scale (ideal: 120-160)
   */
  private scoreWPM(wpm: number): number {
    if (wpm >= 120 && wpm <= 160) return 9;
    if (wpm >= 100 && wpm <= 180) return 7;
    if (wpm >= 80 && wpm <= 200) return 5;
    return 3;
  }

  /**
   * Score filler word density on a 1-10 scale
   */
  private scoreFillerDensity(density: number): number {
    if (density < 1) return 10;
    if (density < 3) return 8;
    if (density < 5) return 6;
    if (density < 8) return 4;
    return 2;
  }
}
