-- Add score column to responses table
ALTER TABLE public.responses 
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_responses_score ON public.responses(score);

-- Update session types to include new types
DO $$ 
BEGIN
    -- Check if types need to be added
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'yesno' AND enumtypid = 'session_type'::regtype) THEN
        ALTER TYPE session_type ADD VALUE IF NOT EXISTS 'yesno';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rating' AND enumtypid = 'session_type'::regtype) THEN
        ALTER TYPE session_type ADD VALUE IF NOT EXISTS 'rating';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'minigame' AND enumtypid = 'session_type'::regtype) THEN
        ALTER TYPE session_type ADD VALUE IF NOT EXISTS 'minigame';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'battle' AND enumtypid = 'session_type'::regtype) THEN
        ALTER TYPE session_type ADD VALUE IF NOT EXISTS 'battle';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
