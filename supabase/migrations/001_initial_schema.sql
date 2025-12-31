-- CrowdSpark Database Schema
-- Initial Migration: Core Tables and Security

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom Types
CREATE TYPE session_type AS ENUM ('mcq', 'wordcloud', 'quiz');
CREATE TYPE session_status AS ENUM ('draft', 'active', 'paused', 'ended');
CREATE TYPE question_type AS ENUM ('mcq', 'wordcloud', 'quiz', 'rating');
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');

-- =====================================================
-- TABLE: users (extends auth.users)
-- =====================================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    subscription_tier subscription_tier DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: sessions
-- =====================================================
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    host_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type session_type NOT NULL DEFAULT 'mcq',
    status session_status NOT NULL DEFAULT 'draft',
    settings JSONB DEFAULT '{}'::jsonb,
    participant_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast code lookups
CREATE UNIQUE INDEX idx_sessions_code ON public.sessions(UPPER(code));
CREATE INDEX idx_sessions_host_id ON public.sessions(host_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);

-- =====================================================
-- TABLE: questions
-- =====================================================
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    order_index INTEGER DEFAULT 0,
    time_limit INTEGER, -- seconds, nullable
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_session_id ON public.questions(session_id);
CREATE INDEX idx_questions_order ON public.questions(session_id, order_index);

-- =====================================================
-- TABLE: options
-- =====================================================
CREATE TABLE public.options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_options_question_id ON public.options(question_id);

-- =====================================================
-- TABLE: participants
-- =====================================================
CREATE TABLE public.participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    anonymous_id TEXT NOT NULL,
    nickname TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, anonymous_id)
);

CREATE INDEX idx_participants_session_id ON public.participants(session_id);
CREATE INDEX idx_participants_anonymous_id ON public.participants(anonymous_id);

-- =====================================================
-- TABLE: responses
-- =====================================================
CREATE TABLE public.responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    option_id UUID REFERENCES public.options(id) ON DELETE CASCADE,
    text_response TEXT,
    response_time INTEGER, -- milliseconds
    is_correct BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_responses_session_id ON public.responses(session_id);
CREATE INDEX idx_responses_question_id ON public.responses(question_id);
CREATE INDEX idx_responses_participant_id ON public.responses(participant_id);

-- =====================================================
-- TABLE: session_analytics
-- =====================================================
CREATE TABLE public.session_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    total_participants INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,
    engagement_rate NUMERIC(5,2) DEFAULT 0,
    avg_response_time NUMERIC(10,2),
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id)
);

-- =====================================================
-- FUNCTIONS: Helper Functions
-- =====================================================

-- Generate random session code
CREATE OR REPLACE FUNCTION generate_session_code(length INTEGER DEFAULT 6)
RETURNS TEXT AS $$
DECLARE
    characters TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(characters, floor(random() * length(characters) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update participant count trigger
CREATE OR REPLACE FUNCTION update_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.sessions
    SET participant_count = (
        SELECT COUNT(DISTINCT id)
        FROM public.participants
        WHERE session_id = NEW.session_id
    )
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_participant_count
AFTER INSERT ON public.participants
FOR EACH ROW
EXECUTE FUNCTION update_participant_count();

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_analytics ENABLE ROW LEVEL SECURITY;

-- Users: Can read and update their own profile
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Sessions: Hosts can CRUD their own, anyone can read active sessions by code
CREATE POLICY "Hosts can view their own sessions"
    ON public.sessions FOR SELECT
    USING (auth.uid() = host_id);

CREATE POLICY "Anyone can view active sessions by code"
    ON public.sessions FOR SELECT
    USING (status = 'active');

CREATE POLICY "Hosts can create sessions"
    ON public.sessions FOR INSERT
    WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their own sessions"
    ON public.sessions FOR UPDATE
    USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their own sessions"
    ON public.sessions FOR DELETE
    USING (auth.uid() = host_id);

-- Questions: Controlled by session ownership
CREATE POLICY "Hosts can manage questions in their sessions"
    ON public.questions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE id = questions.session_id
            AND host_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view questions in active sessions"
    ON public.questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE id = questions.session_id
            AND status = 'active'
        )
    );

-- Options: Follow question policies
CREATE POLICY "Hosts can manage options"
    ON public.options FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.questions q
            JOIN public.sessions s ON s.id = q.session_id
            WHERE q.id = options.question_id
            AND s.host_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view options in active sessions"
    ON public.options FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.questions q
            JOIN public.sessions s ON s.id = q.session_id
            WHERE q.id = options.question_id
            AND s.status = 'active'
        )
    );

-- Participants: Anyone can join, hosts can view
CREATE POLICY "Anyone can join sessions"
    ON public.participants FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE id = participants.session_id
            AND status IN ('active', 'paused')
        )
    );

CREATE POLICY "Participants can update their own data"
    ON public.participants FOR UPDATE
    USING (true); -- Will validate via anonymous_id in application

CREATE POLICY "Hosts can view participants in their sessions"
    ON public.participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE id = participants.session_id
            AND host_id = auth.uid()
        )
    );

CREATE POLICY "Participants can view others in same session"
    ON public.participants FOR SELECT
    USING (true); -- Needed for participant count

-- Responses: Anyone can submit, hosts can view aggregated results
CREATE POLICY "Anyone can submit responses to active sessions"
    ON public.responses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE id = responses.session_id
            AND status = 'active'
        )
    );

CREATE POLICY "Hosts can view responses in their sessions"
    ON public.responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE id = responses.session_id
            AND host_id = auth.uid()
        )
    );

CREATE POLICY "Participants can view aggregated results in active sessions"
    ON public.responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE id = responses.session_id
            AND status IN ('active', 'ended')
        )
    );

-- Analytics: Only hosts can view
CREATE POLICY "Hosts can view analytics for their sessions"
    ON public.session_analytics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE id = session_analytics.session_id
            AND host_id = auth.uid()
        )
    );

-- =====================================================
-- REALTIME PUBLICATION
-- =====================================================

-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.responses;

-- =====================================================
-- SEED DATA (Optional - for development)
-- =====================================================

-- Insert test user (only if in development)
-- This will be handled by actual auth sign-up in production

COMMENT ON TABLE public.sessions IS 'Interactive audience engagement sessions';
COMMENT ON TABLE public.questions IS 'Questions within sessions';
COMMENT ON TABLE public.options IS 'Answer options for MCQ and quiz questions';
COMMENT ON TABLE public.participants IS 'Anonymous participants in sessions';
COMMENT ON TABLE public.responses IS 'Participant responses and votes';
COMMENT ON TABLE public.session_analytics IS 'Aggregated session metrics';
