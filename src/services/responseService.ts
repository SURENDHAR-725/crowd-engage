import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Participant = Database['public']['Tables']['participants']['Row'];
type ParticipantInsert = Database['public']['Tables']['participants']['Insert'];
type Response = Database['public']['Tables']['responses']['Row'];
type ResponseInsert = Database['public']['Tables']['responses']['Insert'];

export interface ResponseWithDetails extends Response {
  participant?: Participant;
}

export interface ResponseAggregation {
  option_id: string;
  option_text: string;
  vote_count: number;
  percentage: number;
}

class ResponseService {
  /**
   * Join session as participant
   */
  async joinSession(sessionId: string, anonymousId: string, nickname?: string): Promise<Participant | null> {
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
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        return data;
      }

      // Create new participant
      const { data, error } = await supabase
        .from('participants')
        .insert({
          session_id: sessionId,
          anonymous_id: anonymousId,
          nickname: nickname || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error joining session:', error);
        return null;
      }

      return data;
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
  ): Promise<Response | null> {
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
        return existing;
      }

      // Determine if answer is correct (for quizzes)
      let isCorrect: boolean | null = null;
      if (optionId) {
        const { data: option } = await supabase
          .from('options')
          .select('is_correct')
          .eq('id', optionId)
          .single();

        if (option) {
          isCorrect = option.is_correct;
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
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting response:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in submitResponse:', error);
      return null;
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
            option_text
          )
        `)
        .eq('question_id', questionId)
        .not('option_id', 'is', null);

      if (error) {
        console.error('Error fetching response aggregation:', error);
        return [];
      }

      // Count votes per option
      const voteCounts = new Map<string, { text: string; count: number }>();
      let totalVotes = 0;

      data.forEach((response: any) => {
        if (response.option_id && response.options) {
          const optionId = response.option_id;
          const optionText = response.options.option_text;

          if (!voteCounts.has(optionId)) {
            voteCounts.set(optionId, { text: optionText, count: 0 });
          }

          const current = voteCounts.get(optionId)!;
          current.count++;
          totalVotes++;
        }
      });

      // Convert to array with percentages
      const aggregation: ResponseAggregation[] = Array.from(voteCounts.entries()).map(
        ([optionId, { text, count }]) => ({
          option_id: optionId,
          option_text: text,
          vote_count: count,
          percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
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

      return data.map((r) => r.text_response).filter(Boolean) as string[];
    } catch (error) {
      console.error('Error in getTextResponses:', error);
      return [];
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
  subscribeToParticipants(sessionId: string, callback: (count: number) => void) {
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
          // Fetch updated count
          const { count } = await supabase
            .from('participants')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId);

          callback(count || 0);
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
        .eq('session_id', sessionId);

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
