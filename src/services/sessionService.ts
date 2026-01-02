import { supabase, generateUniqueSessionCode } from '@/lib/supabase';
import type { SessionType, SessionStatus, Json } from '@/lib/database.types';

export type PaceMode = 'instructor' | 'self-paced';
export type IdentityMode = 'anonymous' | 'named';

export interface SessionModes {
  paceMode: PaceMode;
  identityMode: IdentityMode;
  allowMultipleResponses: boolean;
  showLiveResults: boolean;
  shuffleOptions: boolean;
  chaosMode?: boolean;
}

export interface QuestionData {
  text: string;
  type: 'mcq' | 'poll' | 'true-false' | 'open-ended';
  timeLimit?: number;
  points?: number;
  options?: { text: string; isCorrect?: boolean }[];
}

export interface CreateSessionData {
  title: string;
  type: SessionType;
  status?: SessionStatus;
  questions: QuestionData[];
  modes?: SessionModes;
}

export interface Session {
  id: string;
  code: string;
  host_id: string;
  title: string;
  type: SessionType;
  status: SessionStatus;
  settings: Json;
  participant_count: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  updated_at: string;
}

export interface Question {
  id: string;
  session_id: string;
  question_text: string;
  question_type: string;
  order_index: number;
  time_limit: number | null;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export interface Option {
  id: string;
  question_id: string;
  option_text: string;
  order_index: number;
  is_correct: boolean;
  created_at: string;
}

export interface SessionUpdate {
  status?: SessionStatus;
  started_at?: string;
  ended_at?: string;
  title?: string;
  settings?: Json;
}

export interface OptionInsert {
  question_id: string;
  option_text: string;
  order_index: number;
  is_correct: boolean;
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

      // Get the first question from the questions array
      const firstQuestion = data.questions[0];
      if (!firstQuestion) {
        console.error('No questions provided');
        return null;
      }

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
            ...(firstQuestion.timeLimit ? { time_limit: firstQuestion.timeLimit } : {}),
            ...(data.modes ? {
              pace_mode: data.modes.paceMode,
              identity_mode: data.modes.identityMode,
              allow_multiple_responses: data.modes.allowMultipleResponses,
              show_live_results: data.modes.showLiveResults,
              shuffle_options: data.modes.shuffleOptions,
              chaos_mode: data.modes.chaosMode || false,
            } : {}),
          },
        } as any)
        .select()
        .single();

      if (sessionError || !session) {
        console.error('Error creating session:', sessionError);
        return null;
      }

      // Create questions (support multiple questions)
      const questionsToCreate = data.questions.map((q, index) => ({
        session_id: (session as any).id,
        question_text: q.text,
        question_type: q.type,
        time_limit: q.timeLimit || null,
        order_index: index,
        settings: { points: q.points || 100 },
      }));

      const { data: createdQuestions, error: questionError } = await supabase
        .from('questions')
        .insert(questionsToCreate as any)
        .select();

      if (questionError || !createdQuestions || createdQuestions.length === 0) {
        console.error('Error creating questions:', questionError);
        return null;
      }

      const question = createdQuestions[0];

      // Create options (if not word cloud)
      let options: Option[] = [];
      if (firstQuestion.options && firstQuestion.options.length > 0) {
        const optionsToInsert = firstQuestion.options.map((opt, index) => ({
          question_id: (question as any).id,
          option_text: opt.text,
          order_index: index,
          is_correct: opt.isCorrect || false,
        }));

        const { data: createdOptions, error: optionsError } = await supabase
          .from('options')
          .insert(optionsToInsert as any)
          .select();

        if (optionsError) {
          console.error('Error creating options:', optionsError);
        } else if (createdOptions) {
          options = createdOptions;
        }
      }

      return {
        ...(session as Session),
        question: {
          ...(question as Question),
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
        .neq('status', 'ended')
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
        .update(update as any)
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
        .update(updates as any)
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
