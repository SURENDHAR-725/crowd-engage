-- TEMPORARY: Disable RLS for testing purposes
-- WARNING: Re-enable RLS before deploying to production!

-- Disable RLS on all tables for testing
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE options DISABLE ROW LEVEL SECURITY;
ALTER TABLE participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_analytics DISABLE ROW LEVEL SECURITY;

-- Drop the foreign key constraint on users table that references auth.users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Drop the foreign key constraint on sessions table that references users
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_host_id_fkey;

-- Grant all permissions to anon role for testing (fixes 401 errors)
GRANT ALL ON users TO anon;
GRANT ALL ON sessions TO anon;
GRANT ALL ON questions TO anon;
GRANT ALL ON options TO anon;
GRANT ALL ON participants TO anon;
GRANT ALL ON responses TO anon;
GRANT ALL ON session_analytics TO anon;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Insert a test user for development
INSERT INTO users (id, email, full_name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@crowdspark.dev',
  'Test User'
)
ON CONFLICT (id) DO NOTHING;
