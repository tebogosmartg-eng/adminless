import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log the active Supabase URL on load as requested
console.log("[Supabase Environment Check] VITE_SUPABASE_URL:", SUPABASE_URL || "MISSING");

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    "Supabase configuration is missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment."
  );
}

export const supabase = createClient(
  SUPABASE_URL || "", 
  SUPABASE_PUBLISHABLE_KEY || "", 
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'adminless-auth-token',
    },
  }
);