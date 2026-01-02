-- Add missing columns to participants table
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS avatar TEXT,
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Add missing column to responses table
ALTER TABLE responses
ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_participants_session_blocked ON participants(session_id, is_blocked);
CREATE INDEX IF NOT EXISTS idx_participants_score ON participants(session_id, score DESC);
