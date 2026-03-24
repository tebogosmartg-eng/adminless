import { createClient } from '@supabase/supabase-js';

// Centralized credentials to guarantee localhost and live deployments use the exact same database.
export const SUPABASE_URL = "https://whfnuntkisnksxhtepqn.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZm51bnRraXNua3N4aHRlcHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNzMxMjksImV4cCI6MjA4NDc0OTEyOX0.exARgqyfblrG1n1fuVzmCt7IECCFKWofeXXDxN8NRws";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'adminless-auth-token',
  },
});