import { supabase, generateUniqueSessionCode } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import type { SessionType, SessionStatus } from '@/lib/database.types';

type Session = Database['public']['Tables']['sessions']['Row'];
type SessionInsert = Database['public']['Tables']['sessions']['Insert'];
type SessionUpdate = Database['public']['Tables']['sessions']['Update'];
type Question = Database['public']['Tables']['questions']['Row'];
type QuestionInsert = Database['public']['Tables']['questions']['Insert'];
type Option = Database['public']['Tables']['options']['Row'];
type OptionInsert = Database['public']['Tables']['options']['Insert'];

export type PaceMode = 'instructor' | 'self-paced';
export type IdentityMode = 'anonymous' | 'named';

export interface SessionModes {
  paceMode: PaceMode;
  identityMode: IdentityMode;
  allowMultipleResponses: boolean;
  showLiveResults: boolean;
  shuffleOptions: boolean;
}

export interface CreateSessionData {
  title: string;
  type: SessionType;
  status?: SessionStatus;
  question: string;
  options?: { text: string; isCorrect?: boolean }[];
  timeLimit?: number;
  modes?: SessionModes;
}

export interface SessionWithDetails extends Session {
  question?: Question & { options?: Option[] };
  questions?: (Question & { options?: Option[] })[];
}

class SessionService {
  /**
   * Create a new session with question and options
   */
  async createSession(hostId: string, data: CreateSessionData): Promise<SessionWithDetails | null> {
    try {
      // Generate unique session code
      const code = await generateUniqueSessionCode();

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          code,
          host_id: hostId,
          title: data.title,
          type: data.type,
          status: data.status || 'draft',
          settings: {
            ...(data.timeLimit ? { time_limit: data.timeLimit } : {}),
            ...(data.modes ? {
              pace_mode: data.modes.paceMode,
              identity_mode: data.modes.identityMode,
              allow_multiple_responses: data.modes.allowMultipleResponses,
              show_live_results: data.modes.showLiveResults,
              shuffle_options: data.modes.shuffleOptions,
            } : {}),
          },
        })
        .select()
        .single();

      if (sessionError || !session) {
        console.error('Error creating session:', sessionError);
        return null;
      }

      // Create question
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
          session_id: session.id,
          question_text: data.question,
          question_type: data.type,
          time_limit: data.timeLimit || null,
          order_index: 0,
        })
        .select()
        .single();

      if (questionError || !question) {
        console.error('Error creating question:', questionError);
        return null;
      }

      // Create options (if not word cloud)
      let options: Option[] = [];
      if (data.options && data.options.length > 0) {
        const optionsToInsert: OptionInsert[] = data.options.map((opt, index) => ({
          question_id: question.id,
          option_text: opt.text,
          order_index: index,
          is_correct: opt.isCorrect || false,
        }));

        const { data: createdOptions, error: optionsError } = await supabase
          .from('options')
          .insert(optionsToInsert)
          .select();

        if (optionsError) {
          console.error('Error creating options:', optionsError);
        } else if (createdOptions) {
          options = createdOptions;
        }
      }

      return {
        ...session,
        question: {
          ...question,
          options,
        },
      };
    } catch (error) {
      console.error('Error in createSession:', error);
      return null;
    }
  }

  /**
   * Get all sessions for a host
   */
  async getHostSessions(hostId: string): Promise<SessionWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          questions (
            *,
            options (*)
          )
        `)
        .eq('host_id', hostId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sessions:', error);
        return [];
      }

      return data as SessionWithDetails[];
    } catch (error) {
      console.error('Error in getHostSessions:', error);
      return [];
    }
  }

  /**
   * Get session by code (for participants)
   */
  async getSessionByCode(code: string): Promise<SessionWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          questions (
            *,
            options (*)
          )
        `)
        .eq('code', code.toUpperCase())
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Error fetching session by code:', error);
        return null;
      }

      return data as SessionWithDetails;
    } catch (error) {
      console.error('Error in getSessionByCode:', error);
      return null;
    }
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<SessionWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          questions (
            *,
            options (*)
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('Error fetching session by ID:', error);
        return null;
      }

      return data as SessionWithDetails;
    } catch (error) {
      console.error('Error in getSessionById:', error);
      return null;
    }
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<boolean> {
    try {
      const update: SessionUpdate = { status };

      if (status === 'active') {
        update.started_at = new Date().toISOString();
      } else if (status === 'ended') {
        update.ended_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('sessions')
        .update(update)
        .eq('id', sessionId);

      if (error) {
        console.error('Error updating session status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateSessionStatus:', error);
      return false;
    }
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, updates: SessionUpdate): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) {
        console.error('Error updating session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateSession:', error);
      return false;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('Error deleting session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteSession:', error);
      return false;
    }
  }

  /**
   * Subscribe to session changes
   */
  subscribeToSession(sessionId: string, callback: (session: Session) => void) {
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          callback(payload.new as Session);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const sessionService = new SessionService();
