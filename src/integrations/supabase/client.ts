import { createClient } from '@supabase/supabase-js';

// Environment variables are prioritized for staging/production separation
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://whfnuntkisnksxhtepqn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZm51bnRraXNua3N4aHRlcHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNzMxMjksImV4cCI6MjA4NDc0OTEyOX0.exARgqyfblrG1n1fuVzmCt7IECCFKWofeXXDxN8NRws";

console.log(`[supabase] Initializing client for ${SUPABASE_URL} in ${import.meta.env.MODE} mode`);

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'adminless-auth-token', // Unique key for this app's session
  },
});