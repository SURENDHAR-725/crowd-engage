import { createClient } from '@supabase/supabase-js';

// Use environment variables or placeholder values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Create client without Database type to avoid TypeScript issues when tables don't exist
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper function to generate session code
export const generateSessionCode = (length: number = 6): string => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Helper to check if session code exists
export const isCodeUnique = async (code: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('id')
      .eq('code', code.toUpperCase())
      .single();
    
    return !data && error?.code === 'PGRST116'; // PGRST116 = no rows returned
  } catch {
    return true; // Assume unique if there's an error (e.g., table doesn't exist)
  }
};

// Generate unique session code
export const generateUniqueSessionCode = async (length: number = 6): Promise<string> => {
  let code = generateSessionCode(length);
  let attempts = 0;
  
  while (!await isCodeUnique(code) && attempts < 10) {
    code = generateSessionCode(length);
    attempts++;
  }
  
  if (attempts >= 10) {
    // If 6-char codes are exhausted, try 8-char
    return generateUniqueSessionCode(8);
  }
  
  return code;
};
