import { useState, useEffect } from 'react';
import { responseService, type ResponseAggregation, type LeaderboardEntry, type Participant } from '@/services/responseService';
import { toast } from 'sonner';

// Generate a persistent anonymous ID for the browser
const getAnonymousId = (): string => {
  let id = localStorage.getItem('crowdspark_anonymous_id');
  if (!id) {
    id = `anon_${Math.random().toString(36).substring(2, 15)}${Date.now()}`;
    localStorage.setItem('crowdspark_anonymous_id', id);
  }
  return id;
};

export function useParticipant(sessionId?: string) {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const anonymousId = getAnonymousId();

  const joinSession = async (nickname?: string, avatar?: string) => {
    if (!sessionId) return null;

    setLoading(true);
    const data = await responseService.joinSession(sessionId, anonymousId, nickname, avatar);
    setParticipant(data);
    setLoading(false);

    if (data) {
      toast.success('Joined session!');
    } else {
      toast.error('Failed to join session');
    }

    return data;
  };

  return {
    participant,
    loading,
    joinSession,
    anonymousId,
  };
}

export function useResponse(questionId?: string) {
  const [hasResponded, setHasResponded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  const submitResponse = async (
    sessionId: string,
    participantId: string,
    optionId?: string,
    textResponse?: string,
    responseTime?: number
  ) => {
    if (!questionId) return null;

    setLoading(true);
    const result = await responseService.submitResponse(
      sessionId,
      questionId,
      participantId,
      optionId,
      textResponse,
      responseTime
    );
    setLoading(false);

    if (result.response) {
      setHasResponded(true);
      setPointsEarned(result.pointsEarned);
      toast.success(`Response submitted! +${result.pointsEarned} points`);
    } else {
      toast.error('Failed to submit response');
    }

    return result;
  };

  return {
    hasResponded,
    loading,
    pointsEarned,
    submitResponse,
  };
}

export function useResponseAggregation(questionId?: string) {
  const [aggregation, setAggregation] = useState<ResponseAggregation[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (questionId) {
      loadAggregation();
    }
  }, [questionId]);

  const loadAggregation = async () => {
    if (!questionId) return;

    setLoading(true);
    const data = await responseService.getResponseAggregation(questionId);
    setAggregation(data);
    setTotalVotes(data.reduce((sum, item) => sum + item.vote_count, 0));
    setLoading(false);
  };

  // Subscribe to new responses
  useEffect(() => {
    if (!questionId) return;

    const unsubscribe = responseService.subscribeToResponses(questionId, () => {
      loadAggregation(); // Reload when new response comes in
    });

    return unsubscribe;
  }, [questionId]);

  return {
    aggregation,
    totalVotes,
    loading,
    refreshAggregation: loadAggregation,
  };
}

export function useParticipantCount(sessionId?: string) {
  const [count, setCount] = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCount = async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await responseService.getParticipantCount(sessionId);
      setCount(data);
    } catch (error) {
      console.error('Error loading participant count:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      loadCount();
      
      // Refresh count every 5 seconds to ensure accuracy
      const interval = setInterval(loadCount, 5000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
      setCount(0);
    }
  }, [sessionId]);

  // Subscribe to participant changes
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = responseService.subscribeToParticipants(sessionId, (newParticipants) => {
      setParticipants(newParticipants);
      setCount(newParticipants.length);
    });

    return unsubscribe;
  }, [sessionId]);

  return {
    count,
    participants,
    isLoading: loading,
    loading,
    refreshCount: loadCount,
  };
}

export function useLeaderboard(sessionId?: string) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      loadLeaderboard();
    }
  }, [sessionId]);

  const loadLeaderboard = async () => {
    if (!sessionId) return;

    setLoading(true);
    const data = await responseService.getLeaderboard(sessionId);
    setLeaderboard(data);
    setLoading(false);
  };

  // Subscribe to leaderboard changes
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = responseService.subscribeToLeaderboard(sessionId, (newLeaderboard) => {
      setLeaderboard(newLeaderboard);
    });

    return unsubscribe;
  }, [sessionId]);

  return {
    leaderboard,
    isLoading: loading,
    loading,
    refetch: loadLeaderboard,
    refreshLeaderboard: loadLeaderboard,
  };
}

// Hook to get responses for a specific question
export function useQuestionResponses(questionId?: string) {
  const [responses, setResponses] = useState<Array<{
    id: string;
    participant_id: string;
    option_id: string | null;
    is_correct: boolean;
    score: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (questionId) {
      loadResponses();
    }
  }, [questionId]);

  const loadResponses = async () => {
    if (!questionId) return;

    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('responses')
        .select('id, participant_id, option_id, is_correct')
        .eq('question_id', questionId);

      if (error) throw error;
      // Add default score of 0 for backwards compatibility
      setResponses((data || []).map(r => ({ ...r, score: 0 })));
    } catch (error) {
      console.error('Error loading question responses:', error);
      setResponses([]);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to new responses
  useEffect(() => {
    if (!questionId) return;

    const unsubscribe = responseService.subscribeToResponses(questionId, () => {
      loadResponses();
    });

    return unsubscribe;
  }, [questionId]);

  return {
    responses,
    isLoading: loading,
    loading,
    refetch: loadResponses,
    refreshResponses: loadResponses,
  };
}

export function useTextResponses(questionId?: string) {
  const [responses, setResponses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (questionId) {
      loadResponses();
    }
  }, [questionId]);

  const loadResponses = async () => {
    if (!questionId) return;

    setLoading(true);
    const data = await responseService.getTextResponses(questionId);
    setResponses(data);
    setLoading(false);
  };

  // Subscribe to new text responses
  useEffect(() => {
    if (!questionId) return;

    const unsubscribe = responseService.subscribeToResponses(questionId, () => {
      loadResponses();
    });

    return unsubscribe;
  }, [questionId]);

  return {
    responses,
    loading,
    refreshResponses: loadResponses,
  };
}
