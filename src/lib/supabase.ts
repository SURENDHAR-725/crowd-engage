import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = 'https://jfczltytbtzuhpxsrevd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmY3psdHl0YnR6dWhweHNyZXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTQ3MjksImV4cCI6MjA4MjU3MDcyOX0.2GxXADa3nswTtY94VJy5vbE4cUyzEGXyB-3GW5XMC7A';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
  const { data, error } = await supabase
    .from('sessions')
    .select('id')
    .eq('code', code.toUpperCase())
    .single();
  
  return !data && error?.code === 'PGRST116'; // PGRST116 = no rows returned
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
