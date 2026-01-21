export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Extended session types for all features
export type SessionType = 
  | 'mcq' 
  | 'quiz' 
  | 'yesno' 
  | 'rating' 
  | 'minigame' 
  | 'mocktest';

export type SessionStatus = 'draft' | 'active' | 'paused' | 'ended';
export type QuestionType = 'mcq' | 'quiz' | 'rating' | 'yesno' | 'open-ended';
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

// Mini game types
export type MiniGameType = 
  | 'fastest-finger' 
  | 'memory-match' 
  | 'word-scramble' 
  | 'emoji-decode';

// Session modes configuration
export interface SessionModes {
  paceMode: 'instructor' | 'self-paced';
  identityMode: 'anonymous' | 'named';
  allowMultipleResponses: boolean;
  showLiveResults: boolean;
  shuffleOptions: boolean;
  chaosMode?: boolean;
}

// AI Insights types
export interface AIInsights {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  engagementScore: number;
  keyThemes: string[];
  participationRate: number;
  averageResponseTime: number;
  topPerformers?: LeaderboardEntry[];
}

// Leaderboard entry for quizzes and games
export interface LeaderboardEntry {
  participantId: string;
  nickname: string;
  score: number;
  correctAnswers: number;
  averageTime: number;
  rank: number;
  streak?: number;
}

// Voice answer transcription
export interface VoiceAnswer {
  participantId: string;
  audioUrl?: string;
  transcription: string;
  confidence: number;
  timestamp: string;
}

// Chaos mode reaction
export interface ChaosReaction {
  type: 'confetti' | 'shake' | 'fireworks' | 'rainbow' | 'explosion';
  trigger: 'milestone' | 'correct-answer' | 'streak' | 'time-bonus' | 'manual';
  intensity: number;
}

// Battle mode team type
export interface BattleTeam {
  id: string;
  name: string;
  color: string;
  score: number;
  memberIds: string[];
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          subscription_tier: SubscriptionTier;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          subscription_tier?: SubscriptionTier;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          subscription_tier?: SubscriptionTier;
          updated_at?: string;
        };
      };
      sessions: {
        Row: {
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
        };
        Insert: {
          id?: string;
          code: string;
          host_id: string;
          title: string;
          type?: SessionType;
          status?: SessionStatus;
          settings?: Json;
          participant_count?: number;
          created_at?: string;
          started_at?: string | null;
          ended_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          host_id?: string;
          title?: string;
          type?: SessionType;
          status?: SessionStatus;
          settings?: Json;
          participant_count?: number;
          started_at?: string | null;
          ended_at?: string | null;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          session_id: string;
          question_text: string;
          question_type: QuestionType;
          order_index: number;
          time_limit: number | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_text: string;
          question_type: QuestionType;
          order_index?: number;
          time_limit?: number | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          question_text?: string;
          question_type?: QuestionType;
          order_index?: number;
          time_limit?: number | null;
          settings?: Json;
          updated_at?: string;
        };
      };
      options: {
        Row: {
          id: string;
          question_id: string;
          option_text: string;
          order_index: number;
          is_correct: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          option_text: string;
          order_index?: number;
          is_correct?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          option_text?: string;
          order_index?: number;
          is_correct?: boolean;
        };
      };
      participants: {
        Row: {
          id: string;
          session_id: string;
          anonymous_id: string;
          nickname: string | null;
          joined_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          anonymous_id: string;
          nickname?: string | null;
          joined_at?: string;
          last_seen_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          anonymous_id?: string;
          nickname?: string | null;
          last_seen_at?: string;
        };
      };
      responses: {
        Row: {
          id: string;
          session_id: string;
          question_id: string;
          participant_id: string;
          option_id: string | null;
          text_response: string | null;
          response_time: number | null;
          is_correct: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_id: string;
          participant_id: string;
          option_id?: string | null;
          text_response?: string | null;
          response_time?: number | null;
          is_correct?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          question_id?: string;
          participant_id?: string;
          option_id?: string | null;
          text_response?: string | null;
          response_time?: number | null;
          is_correct?: boolean | null;
        };
      };
      session_analytics: {
        Row: {
          id: string;
          session_id: string;
          total_participants: number;
          total_responses: number;
          engagement_rate: number;
          avg_response_time: number | null;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          total_participants?: number;
          total_responses?: number;
          engagement_rate?: number;
          avg_response_time?: number | null;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          total_participants?: number;
          total_responses?: number;
          engagement_rate?: number;
          avg_response_time?: number | null;
          calculated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_session_code: {
        Args: { length?: number };
        Returns: string;
      };
    };
    Enums: {
      session_type: SessionType;
      session_status: SessionStatus;
      question_type: QuestionType;
      subscription_tier: SubscriptionTier;
    };
  };
}
