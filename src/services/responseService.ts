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
  participantId: string;
  nickname: string;
  avatar: string | null;
  score: number;
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

      return (data || []).map((p: any, index) => ({
        participantId: p.id,
        nickname: p.nickname || 'Anonymous',
        avatar: p.avatar,
        score: p.score || 0,
        correctAnswers: 0, // TODO: Calculate from responses
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
          const { data } = await supabase
            .from('participants')
            .select('*')
            .eq('session_id', sessionId)
            .eq('is_blocked', false);

          callback((data || []) as Participant[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Subscribe to leaderboard changes
   */
  subscribeToLeaderboard(sessionId: string, callback: (leaderboard: LeaderboardEntry[]) => void) {
    const channel = supabase
      .channel(`leaderboard:${sessionId}`)
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

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Get participant count
   */
  async getParticipantCount(sessionId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('is_blocked', false);

      if (error) {
        console.error('Error fetching participant count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getParticipantCount:', error);
      return 0;
    }
  }
}

export const responseService = new ResponseService();
