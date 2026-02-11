import { createClient } from '@supabase/supabase-js';

// Define the expected production project details for comparison
const EXPECTED_PROD_URL = "https://whfnuntkisnksxhtepqn.supabase.co";

// Environment variables are prioritized for staging/production separation
const ENV_URL = import.meta.env.VITE_SUPABASE_URL;
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use fallback values if environment variables are not defined
const SUPABASE_URL = ENV_URL || "https://whfnuntkisnksxhtepqn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = ENV_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZm51bnRraXNua3N4aHRlcHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNzMxMjksImV4cCI6MjA4NDc0OTEyOX0.exARgqyfblrG1n1fuVzmCt7IECCFKWofeXXDxN8NRws";

/**
 * Supabase Environment Diagnostic
 * Task: Verify whether the app is pointing to the correct Supabase project.
 */
console.group("[Supabase Environment Audit]");
console.log("1. Project URL (Active):", SUPABASE_URL);
console.log("2. Project URL (Expected):", EXPECTED_PROD_URL);
console.log("3. VITE_SUPABASE_URL Source:", ENV_URL ? "Environment Variable" : "Hardcoded Fallback");
console.log("4. VITE_SUPABASE_ANON_KEY Source:", ENV_KEY ? "Environment Variable" : "Hardcoded Fallback");
console.log("5. Target Match:", SUPABASE_URL === EXPECTED_PROD_URL ? "✅ MATCHED (Production)" : "❌ MISMATCH (Pointing to wrong project)");
console.log("6. App Mode:", import.meta.env.MODE);
console.groupEnd();

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'adminless-auth-token', // Ensure session isn't cross-pollinated between envs
  },
});