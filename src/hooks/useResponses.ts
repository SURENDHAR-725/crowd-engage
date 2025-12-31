import { useState, useEffect } from 'react';
import { responseService, type ResponseAggregation } from '@/services/responseService';
import type { Database } from '@/lib/database.types';
import { toast } from 'sonner';

type Participant = Database['public']['Tables']['participants']['Row'];
type Response = Database['public']['Tables']['responses']['Row'];

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

  const joinSession = async (nickname?: string) => {
    if (!sessionId) return null;

    setLoading(true);
    const data = await responseService.joinSession(sessionId, anonymousId, nickname);
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

  const submitResponse = async (
    sessionId: string,
    participantId: string,
    optionId?: string,
    textResponse?: string,
    responseTime?: number
  ) => {
    if (!questionId) return null;

    setLoading(true);
    const data = await responseService.submitResponse(
      sessionId,
      questionId,
      participantId,
      optionId,
      textResponse,
      responseTime
    );
    setLoading(false);

    if (data) {
      setHasResponded(true);
      toast.success('Response submitted!');
    } else {
      toast.error('Failed to submit response');
    }

    return data;
  };

  return {
    hasResponded,
    loading,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      loadCount();
    }
  }, [sessionId]);

  const loadCount = async () => {
    if (!sessionId) return;

    setLoading(true);
    const data = await responseService.getParticipantCount(sessionId);
    setCount(data);
    setLoading(false);
  };

  // Subscribe to participant changes
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = responseService.subscribeToParticipants(sessionId, (newCount) => {
      setCount(newCount);
    });

    return unsubscribe;
  }, [sessionId]);

  return {
    count,
    loading,
    refreshCount: loadCount,
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
