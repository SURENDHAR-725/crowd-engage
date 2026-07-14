-- =====================================================
-- TABLE: interviews
-- =====================================================
CREATE TABLE IF NOT EXISTS public.interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    interview_type TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    score NUMERIC(4, 2), -- overall score
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    -- Report summaries
    technical_score NUMERIC(4, 2),
    communication_score NUMERIC(4, 2),
    confidence_score NUMERIC(4, 2),
    problem_solving_score NUMERIC(4, 2),
    strengths TEXT[] DEFAULT '{}',
    weaknesses TEXT[] DEFAULT '{}',
    suggested_topics TEXT[] DEFAULT '{}',
    next_difficulty TEXT,
    performance_summary TEXT
);

-- Indexing for fast lookups
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON public.interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_started_at ON public.interviews(started_at);

-- =====================================================
-- TABLE: interview_questions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.interview_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT,
    ai_feedback TEXT,
    score INTEGER, -- overall score for this question (1-10)
    
    -- Question metrics
    technical_accuracy_score INTEGER,
    communication_score INTEGER,
    confidence_score INTEGER,
    completeness_score INTEGER,
    problem_solving_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_interview_questions_interview_id ON public.interview_questions(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_created_at ON public.interview_questions(created_at);

-- =====================================================
-- TABLE: resume_analysis
-- =====================================================
CREATE TABLE IF NOT EXISTS public.resume_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    extracted_skills TEXT[] DEFAULT '{}',
    projects JSONB DEFAULT '[]'::jsonb,
    certifications TEXT[] DEFAULT '{}',
    education TEXT[] DEFAULT '{}',
    experience JSONB DEFAULT '[]'::jsonb,
    raw_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_resume_analysis_user_id ON public.resume_analysis(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_analysis ENABLE ROW LEVEL SECURITY;

-- Policy definitions for: interviews
DROP POLICY IF EXISTS "Users can manage their own interviews" ON public.interviews;
CREATE POLICY "Users can manage their own interviews"
    ON public.interviews FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy definitions for: interview_questions
-- Since interview_questions is linked to interviews, check if the parent interview belongs to user
DROP POLICY IF EXISTS "Users can manage questions from their own interviews" ON public.interview_questions;
CREATE POLICY "Users can manage questions from their own interviews"
    ON public.interview_questions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews i 
            WHERE i.id = interview_id AND i.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interviews i 
            WHERE i.id = interview_id AND i.user_id = auth.uid()
        )
    );

-- Policy definitions for: resume_analysis
DROP POLICY IF EXISTS "Users can manage their own resume analysis" ON public.resume_analysis;
CREATE POLICY "Users can manage their own resume analysis"
    ON public.resume_analysis FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PERMISSIONS GRANTS FOR ROLES
-- =====================================================
GRANT ALL ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO anon; -- For dev bypass

GRANT ALL ON public.interview_questions TO authenticated;
GRANT ALL ON public.interview_questions TO anon; -- For dev bypass

GRANT ALL ON public.resume_analysis TO authenticated;
GRANT ALL ON public.resume_analysis TO anon; -- For dev bypass
