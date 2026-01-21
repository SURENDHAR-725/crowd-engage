-- Migration: Add buzzer game support to participants table
-- This adds avatar, score columns for the buzzer game feature

-- Add avatar column to participants table
ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '😀';

-- Add score column to participants table (for buzzer game scoring)
ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

-- Create index for leaderboard queries on participants
CREATE INDEX IF NOT EXISTS idx_participants_score ON public.participants(score DESC);
CREATE INDEX IF NOT EXISTS idx_participants_session_score ON public.participants(session_id, score DESC);

-- Update session types to include mocktest if not already present
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'mocktest' AND enumtypid = 'session_type'::regtype) THEN
        ALTER TYPE session_type ADD VALUE IF NOT EXISTS 'mocktest';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create function to update participant score (used by buzzer game)
CREATE OR REPLACE FUNCTION update_participant_score(
    p_participant_id UUID,
    p_points INTEGER
) RETURNS INTEGER AS $$
DECLARE
    new_score INTEGER;
BEGIN
    UPDATE public.participants
    SET score = GREATEST(0, COALESCE(score, 0) + p_points)
    WHERE id = p_participant_id
    RETURNING score INTO new_score;
    
    RETURN new_score;
END;
$$ LANGUAGE plpgsql;
