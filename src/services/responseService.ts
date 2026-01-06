import { supabase } from '@/lib/supabase';

export interface Participant {
  id: string;
  session_id: string;
  anonymous_id: string;
  nickname: string | null;
  avatar: string | null;
  score: number;
  streak: number;
  joined_at: string;
  last_seen_at: string;
  is_blocked: boolean;
}

export interface Response {
  id: string;
  session_id: string;
  question_id: string;
  participant_id: string;
  option_id: string | null;
  text_response: string | null;
  response_time: number | null;
  is_correct: boolean | null;
  points_earned: number;
  created_at: string;
}

export interface ResponseWithDetails extends Response {
  participant?: Participant;
}

export interface ResponseAggregation {
  option_id: string;
  option_text: string;
  vote_count: number;
  percentage: number;
  is_correct?: boolean;
}

export interface LeaderboardEntry {
  id: string;
  participantId: string;
  nickname: string;
  avatar: string | null;
  score: number;
  correct_answers: number;
  correctAnswers: number;
  streak: number;
  rank: number;
}

class ResponseService {
  /**
   * Join session as participant
   */
  async joinSession(
    sessionId: string,
    anonymousId: string,
    nickname?: string,
    avatar?: string
  ): Promise<Participant | null> {
    try {
      // Check if participant already exists
      const { data: existing } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('anonymous_id', anonymousId)
        .single();

      if (existing) {
        // Update last seen
        const { data, error } = await supabase
          .from('participants')
          .update({ last_seen_at: new Date().toISOString() } as any)
          .eq('id', (existing as any).id)
          .select()
          .single();

        return data as Participant;
      }

      // Create new participant
      const { data, error } = await supabase
        .from('participants')
        .insert({
          session_id: sessionId,
          anonymous_id: anonymousId,
          nickname: nickname || null,
          avatar: avatar || null,
          score: 0,
          streak: 0,
          is_blocked: false,
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Error joining session:', error);
        return null;
      }

      return data as Participant;
    } catch (error) {
      console.error('Error in joinSession:', error);
      return null;
    }
  }

  /**
   * Submit response (vote or text)
   */
  async submitResponse(
    sessionId: string,
    questionId: string,
    participantId: string,
    optionId?: string,
    textResponse?: string,
    responseTime?: number
  ): Promise<{ response: Response | null; pointsEarned: number }> {
    try {
      // Check if participant already responded to this question
      const { data: existing } = await supabase
        .from('responses')
        .select('*')
        .eq('session_id', sessionId)
        .eq('question_id', questionId)
        .eq('participant_id', participantId)
        .single();

      if (existing) {
        console.log('Participant already responded to this question');
        return { response: existing as Response, pointsEarned: 0 };
      }

      // Determine if answer is correct (for quizzes)
      let isCorrect: boolean | null = null;
      let basePoints = 0;

      if (optionId) {
        const { data: option } = await supabase
          .from('options')
          .select('is_correct')
          .eq('id', optionId)
          .single();

        if (option) {
          isCorrect = (option as any).is_correct;
          if (isCorrect) {
            basePoints = 100; // Base points for correct answer
            // Time bonus: faster = more points
            if (responseTime && responseTime < 5000) {
              basePoints += Math.floor((5000 - responseTime) / 100);
            }
          }
        }
      }

      // Insert response
      const { data, error } = await supabase
        .from('responses')
        .insert({
          session_id: sessionId,
          question_id: questionId,
          participant_id: participantId,
          option_id: optionId || null,
          text_response: textResponse || null,
          response_time: responseTime || null,
          is_correct: isCorrect,
          points_earned: basePoints,
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Error submitting response:', error);
        return { response: null, pointsEarned: 0 };
      }

      // Update participant score if correct
      if (isCorrect && basePoints > 0) {
        await supabase
          .from('participants')
          .update({
            score: supabase.rpc('increment_score', { x: basePoints }),
            streak: supabase.rpc('increment_streak'),
          } as any)
          .eq('id', participantId);
      } else if (isCorrect === false) {
        // Reset streak on wrong answer
        await supabase
          .from('participants')
          .update({ streak: 0 } as any)
          .eq('id', participantId);
      }

      return { response: data as Response, pointsEarned: basePoints };
    } catch (error) {
      console.error('Error in submitResponse:', error);
      return { response: null, pointsEarned: 0 };
    }
  }

  /**
   * Get response aggregation for a question
   */
  async getResponseAggregation(questionId: string): Promise<ResponseAggregation[]> {
    try {
      const { data, error } = await supabase
        .from('responses')
        .select(`
          option_id,
          options (
            id,
            option_text,
            is_correct
          )
        `)
        .eq('question_id', questionId)
        .not('option_id', 'is', null);

      if (error) {
        console.error('Error fetching response aggregation:', error);
        return [];
      }

      // Count votes per option
      const voteCounts = new Map<string, { text: string; count: number; isCorrect: boolean }>();
      let totalVotes = 0;

      (data || []).forEach((response: any) => {
        if (response.option_id && response.options) {
          const optionId = response.option_id;
          const optionText = response.options.option_text;
          const isCorrect = response.options.is_correct;

          if (!voteCounts.has(optionId)) {
            voteCounts.set(optionId, { text: optionText, count: 0, isCorrect });
          }

          const current = voteCounts.get(optionId)!;
          current.count++;
          totalVotes++;
        }
      });

      // Convert to array with percentages
      const aggregation: ResponseAggregation[] = Array.from(voteCounts.entries()).map(
        ([optionId, { text, count, isCorrect }]) => ({
          option_id: optionId,
          option_text: text,
          vote_count: count,
          percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
          is_correct: isCorrect,
        })
      );

      return aggregation;
    } catch (error) {
      console.error('Error in getResponseAggregation:', error);
      return [];
    }
  }

  /**
   * Get text responses for word cloud
   */
  async getTextResponses(questionId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('responses')
        .select('text_response')
        .eq('question_id', questionId)
        .not('text_response', 'is', null);

      if (error) {
        console.error('Error fetching text responses:', error);
        return [];
      }

      return (data || []).map((r: any) => r.text_response).filter(Boolean) as string[];
    } catch (error) {
      console.error('Error in getTextResponses:', error);
      return [];
    }
  }

  /**
   * Get leaderboard for a session
   */
  async getLeaderboard(sessionId: string): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_blocked', false)
        .order('score', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
      }

      // Get correct answer counts from responses
      const participantIds = (data || []).map((p: any) => p.id);
      const { data: responses } = await supabase
        .from('responses')
        .select('participant_id, is_correct')
        .in('participant_id', participantIds)
        .eq('is_correct', true);

      const correctCounts: Record<string, number> = {};
      (responses || []).forEach((r: any) => {
        correctCounts[r.participant_id] = (correctCounts[r.participant_id] || 0) + 1;
      });

      return (data || []).map((p: any, index) => ({
        id: p.id,
        participantId: p.id,
        nickname: p.nickname || 'Anonymous',
        avatar: p.avatar,
        score: p.score || 0,
        correct_answers: correctCounts[p.id] || 0,
        correctAnswers: correctCounts[p.id] || 0,
        streak: p.streak || 0,
        rank: index + 1,
      }));
    } catch (error) {
      console.error('Error in getLeaderboard:', error);
      return [];
    }
  }

  /**
   * Moderate participant (block/rename)
   */
  async moderateParticipant(
    participantId: string,
    action: 'block' | 'rename' | 'kick',
    newName?: string
  ): Promise<boolean> {
    try {
      if (action === 'block') {
        await supabase
          .from('participants')
          .update({ is_blocked: true } as any)
          .eq('id', participantId);
      } else if (action === 'rename' && newName) {
        await supabase
          .from('participants')
          .update({ nickname: newName } as any)
          .eq('id', participantId);
      } else if (action === 'kick') {
        await supabase
          .from('participants')
          .delete()
          .eq('id', participantId);
      }
      return true;
    } catch (error) {
      console.error('Error moderating participant:', error);
      return false;
    }
  }

  /**
   * Subscribe to responses for a question
   */
  subscribeToResponses(questionId: string, callback: (response: Response) => void) {
    const channel = supabase
      .channel(`responses:${questionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'responses',
          filter: `question_id=eq.${questionId}`,
        },
        (payload) => {
          callback(payload.new as Response);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Subscribe to participant changes
   */
  subscribeToParticipants(sessionId: string, callback: (participants: Participant[]) => void) {
    // Immediately fetch current participants
    this.fetchParticipants(sessionId).then(callback);

    const channel = supabase
      .channel(`participants:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionId}`,
        },
        async () => {
          // Fetch updated participants
          const participants = await this.fetchParticipants(sessionId);
          callback(participants);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Helper to fetch participants for a session
   */
  private async fetchParticipants(sessionId: string): Promise<Participant[]> {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_blocked', false);
    
    return (data || []) as Participant[];
  }

  /**
   * Subscribe to leaderboard changes
   */
  subscribeToLeaderboard(sessionId: string, callback: (leaderboard: LeaderboardEntry[]) => void) {
    // Subscribe to participant score changes
    const participantChannel = supabase
      .channel(`leaderboard-participants:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionId}`,
        },
        async () => {
          const leaderboard = await this.getLeaderboard(sessionId);
          callback(leaderboard);
        }
      )
      .subscribe();

    // Also subscribe to responses to catch score updates immediately
    const responsesChannel = supabase
      .channel(`leaderboard-responses:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'responses',
        },
        async () => {
          // Small delay to allow score update to complete
          setTimeout(async () => {
            const leaderboard = await this.getLeaderboard(sessionId);
            callback(leaderboard);
          }, 300);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantChannel);
      supabase.removeChannel(responsesChannel);
    };
  }

  /**
   * Get participant count
   */
  async getParticipantCount(sessionId: string): Promise<number> {
    try {
      console.log('Fetching participant count for session:', sessionId);
      
      // Use a simpler query that just fetches IDs and counts them
      const { data, error } = await supabase
        .from('participants')
        .select('id')
        .eq('session_id', sessionId)
        .eq('is_blocked', false);

      if (error) {
        console.error('Error fetching participant count:', error);
        return 0;
      }

      const count = data?.length || 0;
      console.log('Participant count result:', count);
      return count;
    } catch (error) {
      console.error('Error in getParticipantCount:', error);
      return 0;
    }
  }

  /**
   * Get the next player number for anonymous mode
   * Returns the count of participants ordered by join time + 1
   */
  async getNextPlayerNumber(sessionId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('id')
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error getting next player number:', error);
        return 1;
      }

      return (data?.length || 0) + 1;
    } catch (error) {
      console.error('Error in getNextPlayerNumber:', error);
      return 1;
    }
  }

  /**
   * Join session as participant with anonymous auto-naming
   * @param sessionId - The session to join
   * @param anonymousId - Unique identifier for this anonymous user
   * @param isAnonymousMode - If true, auto-generates "Player X" names based on join order
   * @param nickname - Custom nickname (used when isAnonymousMode is false)
   * @param avatar - Selected avatar emoji
   */
  async joinSessionWithMode(
    sessionId: string,
    anonymousId: string,
    isAnonymousMode: boolean,
    nickname?: string,
    avatar?: string
  ): Promise<Participant | null> {
    try {
      // Check if participant already exists
      const { data: existing } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('anonymous_id', anonymousId)
        .single();

      if (existing) {
        // Update last seen
        const { data, error } = await supabase
          .from('participants')
          .update({ last_seen_at: new Date().toISOString() } as any)
          .eq('id', (existing as any).id)
          .select()
          .single();

        return data as Participant;
      }

      // Determine nickname based on mode
      let playerNickname: string;
      
      if (isAnonymousMode) {
        // Get the next player number based on existing participants
        const playerNumber = await this.getNextPlayerNumber(sessionId);
        playerNickname = `Player ${playerNumber}`;
      } else {
        // Use provided nickname or generate random one
        playerNickname = nickname || `Player ${Math.floor(Math.random() * 1000)}`;
      }

      // Create new participant
      const { data, error } = await supabase
        .from('participants')
        .insert({
          session_id: sessionId,
          anonymous_id: anonymousId,
          nickname: playerNickname,
          avatar: avatar || null,
          score: 0,
          streak: 0,
          is_blocked: false,
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Error joining session:', error);
        return null;
      }

      return data as Participant;
    } catch (error) {
      console.error('Error in joinSessionWithMode:', error);
      return null;
    }
  }
}

export const responseService = new ResponseService();

// Standalone helper functions for direct import

/**
 * Calculate score based on correctness and time remaining
 */
export function calculateScore(isCorrect: boolean, timeRemaining: number, totalTime: number): number {
  if (!isCorrect) return 0;
  
  // Base score for correct answer
  const baseScore = 100;
  
  // Time bonus: up to 100 extra points for quick answers
  const timeBonus = Math.round((timeRemaining / totalTime) * 100);
  
  return baseScore + timeBonus;
}

/**
 * Submit a response to a question (simplified version for direct import)
 */
export async function submitResponse(params: {
  participantId: string;
  questionId: string;
  optionId?: string;
  textResponse?: string;
  isCorrect?: boolean;
  score?: number;
  responseTime?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('responses')
      .insert({
        participant_id: params.participantId,
        question_id: params.questionId,
        option_id: params.optionId || null,
        text_response: params.textResponse || null,
        is_correct: params.isCorrect ?? false,
        points_earned: params.score || 0,
        response_time: params.responseTime || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting response:', error);
      return { success: false, error: error.message };
    }

    // Update participant's score directly
    if (params.score && params.score > 0) {
      try {
        // Try to use RPC if available
        const { error: rpcError } = await supabase.rpc('increment_score', {
          participant_id: params.participantId,
          amount: params.score,
        });

        // If RPC doesn't exist, do a manual update
        if (rpcError) {
          const { data: participant } = await supabase
            .from('participants')
            .select('score')
            .eq('id', params.participantId)
            .single();

          if (participant) {
            await supabase
              .from('participants')
              .update({ score: (participant.score || 0) + params.score })
              .eq('id', params.participantId);
          }
        }
      } catch (scoreError) {
        console.error('Error updating score:', scoreError);
        // Non-fatal error, response was still submitted
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in submitResponse:', error);
    return { success: false, error: 'Failed to submit response' };
  }
}
