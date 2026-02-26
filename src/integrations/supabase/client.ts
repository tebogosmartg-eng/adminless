import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail fast if environment is misconfigured
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  const errorMsg = "CRITICAL ERROR: Supabase Environment Variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are missing. Check your Dyad Secrets or .env.local file.";
  console.error(errorMsg);
}

export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co", 
  SUPABASE_PUBLISHABLE_KEY || "placeholder-key",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'adminless-auth-token',
    },
  }
);