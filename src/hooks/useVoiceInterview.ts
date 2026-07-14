/**
 * useVoiceInterview Hook
 * 
 * Master orchestration hook that coordinates voice recognition, speech synthesis,
 * streaming AI responses, communication analysis, and Supabase persistence
 * into a seamless voice interview experience.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useVoiceRecognition } from './useVoiceRecognition';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { streamAIResponse, buildInterviewMessages } from '@/services/streamingAIService';
import { evaluateCurrentAnswer, generateFinalReport } from '@/services/aiInterviewService';
import { CommunicationAnalysisService, type AggregateMetrics } from '@/services/communicationAnalysisService';
import type { InterviewSession, InterviewQuestion, ChatMessage, ResumeAnalysis } from '@/services/aiInterviewService';

// ─── Types ───────────────────────────────────────────────────────────────────

export type VoiceInterviewPhase =
  | 'initializing'    // Setting up permissions, loading session
  | 'ai_speaking'     // AI is asking a question via voice
  | 'listening'       // Listening to user's response
  | 'processing'      // Processing user's answer, evaluating, generating next Q
  | 'completed'       // Interview finished
  | 'error';          // Something went wrong

export interface TranscriptEntry {
  id: string;
  role: 'ai' | 'user';
  text: string;
  timestamp: number;
}

export interface UseVoiceInterviewReturn {
  // State
  phase: VoiceInterviewPhase;
  session: InterviewSession | null;
  transcript: TranscriptEntry[];
  currentAIText: string;
  currentUserText: string;
  interimText: string;
  questionCount: number;
  elapsedSeconds: number;
  isMuted: boolean;
  error: string | null;
  communicationMetrics: AggregateMetrics | null;

  // Actions
  initialize: (interviewId: string, experienceLevel?: string) => Promise<void>;
  endInterview: () => Promise<void>;
  toggleMute: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useVoiceInterview(): UseVoiceInterviewReturn {
  const { user } = useAuth();

  // Core state
  const [phase, setPhase] = useState<VoiceInterviewPhase>('initializing');
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentAIText, setCurrentAIText] = useState('');
  const [currentUserText, setCurrentUserText] = useState('');
  const [questionCount, setQuestionCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [communicationMetrics, setCommunicationMetrics] = useState<AggregateMetrics | null>(null);

  // Refs
  const conversationHistory = useRef<ChatMessage[]>([]);
  const questionsRef = useRef<InterviewQuestion[]>([]);
  const currentQuestionRef = useRef<string>('');
  const analysisService = useRef(new CommunicationAnalysisService());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<InterviewSession | null>(null);
  const resumeAnalysisRef = useRef<ResumeAnalysis | null>(null);
  const totalQuestionsLimit = 5;
  const phaseRef = useRef<VoiceInterviewPhase>('initializing');
  const experienceLevelRef = useRef<string>('1-3 Years');

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Voice Recognition
  const handleSilenceDetected = useCallback(() => {
    // User stopped speaking — process their answer
    if (phaseRef.current === 'listening') {
      processUserAnswer();
    }
  }, []);

  const voiceRecognition = useVoiceRecognition(
    { silenceTimeout: 2500 },
    handleSilenceDetected
  );

  // Speech Synthesis
  const handleAISpeakingEnd = useCallback(() => {
    // AI finished speaking — start listening
    if (phaseRef.current === 'ai_speaking') {
      voiceRecognition.markAIFinishedSpeaking();
      voiceRecognition.resetTranscript();
      setCurrentUserText('');
      setPhase('listening');
      if (!isMuted) {
        voiceRecognition.startListening();
      }
    }
  }, [isMuted]);

  const speechSynthesis = useSpeechSynthesis({}, handleAISpeakingEnd);

  // Timer
  useEffect(() => {
    if (phase === 'ai_speaking' || phase === 'listening' || phase === 'processing') {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setElapsedSeconds(prev => prev + 1);
        }, 1000);
      }
    }

    return () => {};
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      abortControllerRef.current?.abort();
      voiceRecognition.stopListening();
      speechSynthesis.stop();
    };
  }, []);

  // Sync user transcript
  useEffect(() => {
    if (phase === 'listening') {
      const combined = voiceRecognition.transcript +
        (voiceRecognition.interimTranscript ? ' ' + voiceRecognition.interimTranscript : '');
      setCurrentUserText(combined.trim());
    }
  }, [voiceRecognition.transcript, voiceRecognition.interimTranscript, phase]);

  // ─── Initialize ─────────────────────────────────────────────────────────

  const initialize = useCallback(async (interviewId: string, experienceLevel?: string) => {
    setPhase('initializing');
    setError(null);
    analysisService.current.reset();
    if (experienceLevel) experienceLevelRef.current = experienceLevel;

    try {
      // 1. Load session from Supabase
      const { data: dbSession, error: sError } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

      if (sError) throw sError;

      setSession(dbSession);
      sessionRef.current = dbSession;

      // 2. Load resume analysis if available
      const { data: resumeData } = await supabase
        .from('resume_analysis')
        .select('*')
        .eq('user_id', dbSession.user_id)
        .maybeSingle();

      resumeAnalysisRef.current = resumeData as ResumeAnalysis | null;

      // 3. Check browser support
      if (!voiceRecognition.isSupported) {
        setError('Speech recognition is not supported. Please use Chrome or Edge.');
        setPhase('error');
        return;
      }

      // 4. Calculate elapsed time
      const startTime = new Date(dbSession.started_at).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);

      // 5. Start the AI greeting
      await generateAndSpeakAIResponse(dbSession);
    } catch (err) {
      console.error('Failed to initialize voice interview:', err);
      setError('Failed to initialize the interview. Please try again.');
      setPhase('error');
    }
  }, [voiceRecognition.isSupported]);

  // ─── Generate AI Response (Streaming) ───────────────────────────────────

  const generateAndSpeakAIResponse = async (currentSession?: InterviewSession) => {
    const sess = currentSession || sessionRef.current;
    if (!sess) return;

    setPhase('ai_speaking');
    setCurrentAIText('');

    // Abort any previous streaming
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // Build messages
    const messages = buildInterviewMessages(
      sess.role,
      experienceLevelRef.current,
      sess.difficulty,
      sess.interview_type,
      conversationHistory.current,
      resumeAnalysisRef.current
    );

    let fullResponse = '';

    try {
      fullResponse = await streamAIResponse(
        messages,
        {
          onToken: (token) => {
            setCurrentAIText(prev => prev + token);
          },
          onSentence: (sentence) => {
            // Start speaking each sentence as it arrives
            speechSynthesis.addToStream(sentence);
          },
          onComplete: (text) => {
            fullResponse = text;
          },
          onError: (err) => {
            console.error('Streaming error:', err);
            toast.error('AI response failed. Please try again.');
          },
        },
        abortControllerRef.current.signal
      );
    } catch (err) {
      console.error('AI response generation failed:', err);
    }

    if (fullResponse) {
      // Add to conversation history
      conversationHistory.current.push({
        role: 'assistant',
        content: fullResponse,
      });

      // Add to visual transcript
      const entry: TranscriptEntry = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: fullResponse,
        timestamp: Date.now(),
      };
      setTranscript(prev => [...prev, entry]);

      // Save question to Supabase
      currentQuestionRef.current = fullResponse;
      setQuestionCount(prev => prev + 1);

      const { data: savedQ } = await supabase
        .from('interview_questions')
        .insert({
          interview_id: sess.id,
          question: fullResponse,
        })
        .select()
        .single();

      if (savedQ) {
        questionsRef.current.push(savedQ);
      }
    }
  };

  // ─── Process User Answer ────────────────────────────────────────────────

  const processUserAnswer = async () => {
    const answerText = voiceRecognition.transcript.trim();
    if (!answerText || phaseRef.current !== 'listening') return;

    // Stop listening
    voiceRecognition.pauseListening();
    setPhase('processing');

    const sess = sessionRef.current;
    if (!sess) return;

    // Add to transcript
    const entry: TranscriptEntry = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: answerText,
      timestamp: Date.now(),
    };
    setTranscript(prev => [...prev, entry]);

    // Add to conversation history
    conversationHistory.current.push({
      role: 'user',
      content: answerText,
    });

    // Record communication metrics
    const speechMetrics = voiceRecognition.metrics;
    const qIndex = questionsRef.current.length - 1;
    analysisService.current.recordAnswer(
      qIndex,
      currentQuestionRef.current,
      answerText,
      speechMetrics
    );
    setCommunicationMetrics(analysisService.current.getAggregate());

    try {
      // Evaluate answer
      const evalResult = await evaluateCurrentAnswer(
        currentQuestionRef.current,
        answerText,
        sess.role,
        experienceLevelRef.current
      );

      // Update question in Supabase
      const currentQ = questionsRef.current[questionsRef.current.length - 1];
      if (currentQ?.id) {
        await supabase
          .from('interview_questions')
          .update({
            answer: answerText,
            ai_feedback: evalResult.ai_feedback,
            score: evalResult.score,
            technical_accuracy_score: evalResult.technical_accuracy_score,
            communication_score: evalResult.communication_score,
            confidence_score: evalResult.confidence_score,
            completeness_score: evalResult.completeness_score,
            problem_solving_score: evalResult.problem_solving_score,
          })
          .eq('id', currentQ.id);

        // Update local ref
        currentQ.answer = answerText;
        currentQ.score = evalResult.score;
        currentQ.ai_feedback = evalResult.ai_feedback;
      }

      // Check if we've hit the question limit
      if (questionsRef.current.length >= totalQuestionsLimit) {
        await finishInterview();
        return;
      }

      // Reset and generate next question
      voiceRecognition.resetTranscript();
      setCurrentUserText('');
      await generateAndSpeakAIResponse();
    } catch (err) {
      console.error('Error processing answer:', err);
      toast.error('Failed to process your answer. Continuing...');
      voiceRecognition.resetTranscript();
      setCurrentUserText('');
      await generateAndSpeakAIResponse();
    }
  };

  // ─── Finish Interview ───────────────────────────────────────────────────

  const finishInterview = async () => {
    const sess = sessionRef.current;
    if (!sess) return;

    // Stop everything
    voiceRecognition.stopListening();
    speechSynthesis.stop();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setPhase('processing');

    // Speak closing message
    const closingMessage = "That concludes today's interview. Thank you for your time. I'll now prepare your detailed evaluation report.";
    setTranscript(prev => [
      ...prev,
      { id: `ai-close-${Date.now()}`, role: 'ai', text: closingMessage, timestamp: Date.now() },
    ]);
    await speechSynthesis.speak(closingMessage);

    try {
      // Gather scored questions
      const scoredQAs = questionsRef.current
        .filter(q => q.answer && q.score !== undefined)
        .map(q => ({
          question: q.question,
          answer: q.answer || '',
          score: q.score || 0,
          ai_feedback: q.ai_feedback || '',
        }));

      // Generate final report
      const report = await generateFinalReport(
        sess.role,
        'Mixed',
        sess.difficulty,
        sess.interview_type,
        scoredQAs
      );

      // Update session in Supabase
      await supabase
        .from('interviews')
        .update({
          score: report.score,
          technical_score: report.technical_score,
          communication_score: report.communication_score,
          confidence_score: report.confidence_score,
          problem_solving_score: report.problem_solving_score,
          strengths: report.strengths,
          weaknesses: report.weaknesses,
          suggested_topics: report.suggested_topics,
          next_difficulty: report.next_difficulty,
          performance_summary: report.performance_summary,
          ended_at: new Date().toISOString(),
        })
        .eq('id', sess.id);

      setCommunicationMetrics(analysisService.current.getAggregate());
      setPhase('completed');
      toast.success('Interview completed! Your report is ready.');
    } catch (err) {
      console.error('Error generating final report:', err);
      // Fallback: just mark as completed
      await supabase
        .from('interviews')
        .update({
          ended_at: new Date().toISOString(),
          score: 60,
        })
        .eq('id', sess.id);

      setPhase('completed');
      toast.success('Interview completed!');
    }
  };

  // ─── End Early ──────────────────────────────────────────────────────────

  const endInterview = useCallback(async () => {
    await finishInterview();
  }, []);

  // ─── Mute Toggle ────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (next) {
        voiceRecognition.pauseListening();
      } else if (phaseRef.current === 'listening') {
        voiceRecognition.resumeListening();
      }
      return next;
    });
  }, []);

  return {
    phase,
    session,
    transcript,
    currentAIText,
    currentUserText,
    interimText: voiceRecognition.interimTranscript,
    questionCount,
    elapsedSeconds,
    isMuted,
    error,
    communicationMetrics,
    initialize,
    endInterview,
    toggleMute,
  };
}
