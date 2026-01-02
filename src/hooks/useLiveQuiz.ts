import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface QuizState {
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  timeRemaining: number;
  isRevealing: boolean;
  isPaused: boolean;
  showLeaderboard: boolean;
  status: 'waiting' | 'active' | 'revealing' | 'leaderboard' | 'ended';
}

interface UseLiveQuizOptions {
  sessionId: string;
  isHost: boolean;
  totalQuestions: number;
  defaultTimeLimit?: number;
}

const CHANNEL_PREFIX = 'live-quiz:';

export function useLiveQuiz({ 
  sessionId, 
  isHost, 
  totalQuestions, 
  defaultTimeLimit = 30 
}: UseLiveQuizOptions) {
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    questionStartedAt: null,
    timeRemaining: defaultTimeLimit,
    isRevealing: false,
    isPaused: false,
    showLeaderboard: false,
    status: 'waiting',
  });
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize real-time channel
  useEffect(() => {
    if (!sessionId) return;

    const channelName = `${CHANNEL_PREFIX}${sessionId}`;
    
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
        presence: { key: sessionId },
      },
    });

    // Listen for state broadcasts from host
    channel.on('broadcast', { event: 'quiz-state' }, ({ payload }) => {
      if (!isHost) {
        setQuizState(payload as QuizState);
      }
    });

    // Listen for specific events
    channel.on('broadcast', { event: 'question-start' }, ({ payload }) => {
      if (!isHost) {
        setQuizState(prev => ({
          ...prev,
          currentQuestionIndex: payload.questionIndex,
          questionStartedAt: payload.startedAt,
          timeRemaining: payload.timeLimit,
          isRevealing: false,
          isPaused: false,
          status: 'active',
        }));
      }
    });

    channel.on('broadcast', { event: 'timer-sync' }, ({ payload }) => {
      if (!isHost) {
        setQuizState(prev => ({
          ...prev,
          timeRemaining: payload.timeRemaining,
          isPaused: payload.isPaused,
        }));
      }
    });

    channel.on('broadcast', { event: 'reveal-answers' }, ({ payload }) => {
      setQuizState(prev => ({
        ...prev,
        isRevealing: true,
        status: 'revealing',
        timeRemaining: 0,
      }));
    });

    channel.on('broadcast', { event: 'show-leaderboard' }, () => {
      setQuizState(prev => ({
        ...prev,
        showLeaderboard: true,
        status: 'leaderboard',
      }));
    });

    channel.on('broadcast', { event: 'quiz-ended' }, () => {
      setQuizState(prev => ({
        ...prev,
        status: 'ended',
      }));
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Connected to live quiz channel');
      }
    });

    channelRef.current = channel;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [sessionId, isHost]);

  // Host timer management
  useEffect(() => {
    if (!isHost || quizState.status !== 'active' || quizState.isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setQuizState(prev => {
        const newTime = Math.max(0, prev.timeRemaining - 1);
        
        // Broadcast timer sync every second
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'timer-sync',
            payload: { timeRemaining: newTime, isPaused: false },
          });
        }

        // Auto-reveal when timer hits 0
        if (newTime === 0 && !prev.isRevealing) {
          setTimeout(() => revealAnswers(), 100);
        }

        return { ...prev, timeRemaining: newTime };
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isHost, quizState.status, quizState.isPaused]);

  // Host functions
  const startQuestion = useCallback((questionIndex: number, timeLimit?: number) => {
    if (!isHost || !channelRef.current) return;

    const startedAt = Date.now();
    const limit = timeLimit || defaultTimeLimit;

    const newState: Partial<QuizState> = {
      currentQuestionIndex: questionIndex,
      questionStartedAt: startedAt,
      timeRemaining: limit,
      isRevealing: false,
      isPaused: false,
      showLeaderboard: false,
      status: 'active',
    };

    setQuizState(prev => ({ ...prev, ...newState }));

    channelRef.current.send({
      type: 'broadcast',
      event: 'question-start',
      payload: { 
        questionIndex, 
        startedAt, 
        timeLimit: limit,
      },
    });

    toast.success(`Question ${questionIndex + 1} started!`);
  }, [isHost, defaultTimeLimit]);

  const pauseTimer = useCallback(() => {
    if (!isHost || !channelRef.current) return;

    setQuizState(prev => ({ ...prev, isPaused: true }));

    channelRef.current.send({
      type: 'broadcast',
      event: 'timer-sync',
      payload: { timeRemaining: quizState.timeRemaining, isPaused: true },
    });
  }, [isHost, quizState.timeRemaining]);

  const resumeTimer = useCallback(() => {
    if (!isHost || !channelRef.current) return;

    setQuizState(prev => ({ ...prev, isPaused: false }));

    channelRef.current.send({
      type: 'broadcast',
      event: 'timer-sync',
      payload: { timeRemaining: quizState.timeRemaining, isPaused: false },
    });
  }, [isHost, quizState.timeRemaining]);

  const revealAnswers = useCallback(() => {
    if (!isHost || !channelRef.current) return;

    setQuizState(prev => ({
      ...prev,
      isRevealing: true,
      status: 'revealing',
      timeRemaining: 0,
    }));

    channelRef.current.send({
      type: 'broadcast',
      event: 'reveal-answers',
      payload: { questionIndex: quizState.currentQuestionIndex },
    });
  }, [isHost, quizState.currentQuestionIndex]);

  const showLeaderboard = useCallback(() => {
    if (!isHost || !channelRef.current) return;

    setQuizState(prev => ({
      ...prev,
      showLeaderboard: true,
      status: 'leaderboard',
    }));

    channelRef.current.send({
      type: 'broadcast',
      event: 'show-leaderboard',
      payload: {},
    });
  }, [isHost]);

  const nextQuestion = useCallback(() => {
    if (!isHost) return;

    const nextIndex = quizState.currentQuestionIndex + 1;
    if (nextIndex < totalQuestions) {
      startQuestion(nextIndex);
    }
  }, [isHost, quizState.currentQuestionIndex, totalQuestions, startQuestion]);

  const previousQuestion = useCallback(() => {
    if (!isHost) return;

    const prevIndex = quizState.currentQuestionIndex - 1;
    if (prevIndex >= 0) {
      startQuestion(prevIndex);
    }
  }, [isHost, quizState.currentQuestionIndex, startQuestion]);

  const endQuiz = useCallback(() => {
    if (!isHost || !channelRef.current) return;

    setQuizState(prev => ({
      ...prev,
      status: 'ended',
    }));

    channelRef.current.send({
      type: 'broadcast',
      event: 'quiz-ended',
      payload: {},
    });

    toast.success('Quiz ended!');
  }, [isHost]);

  // Broadcast full state periodically for late joiners
  useEffect(() => {
    if (!isHost || !channelRef.current) return;

    const syncInterval = setInterval(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'quiz-state',
        payload: quizState,
      });
    }, 5000); // Sync every 5 seconds

    return () => clearInterval(syncInterval);
  }, [isHost, quizState]);

  return {
    quizState,
    // Host controls
    startQuestion,
    pauseTimer,
    resumeTimer,
    revealAnswers,
    showLeaderboard,
    nextQuestion,
    previousQuestion,
    endQuiz,
    // Computed values
    isActive: quizState.status === 'active',
    isRevealing: quizState.isRevealing,
    canGoNext: quizState.currentQuestionIndex < totalQuestions - 1,
    canGoPrevious: quizState.currentQuestionIndex > 0,
  };
}

export default useLiveQuiz;
