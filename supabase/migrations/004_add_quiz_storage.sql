-- Add explanation column to questions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'questions' AND column_name = 'explanation') THEN
        ALTER TABLE questions ADD COLUMN explanation TEXT;
    END IF;
END $$;

-- Create storage bucket for PDF files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'quiz-pdfs',
    'quiz-pdfs',
    true,
    10485760, -- 10MB limit
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to quiz-pdfs bucket
CREATE POLICY IF NOT EXISTS "Public read access for quiz PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'quiz-pdfs');

-- Allow authenticated users to upload PDFs
CREATE POLICY IF NOT EXISTS "Authenticated users can upload PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'quiz-pdfs');

-- Allow users to delete their own PDFs
CREATE POLICY IF NOT EXISTS "Users can delete own PDFs"
ON storage.objects FOR DELETE
USING (bucket_id = 'quiz-pdfs');

-- Add pdf_url to sessions settings if you want to track the source PDF
COMMENT ON COLUMN sessions.settings IS 'JSON settings including pdf_url for AI-generated quizzes';
