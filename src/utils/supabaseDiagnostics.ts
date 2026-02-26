import { supabase } from "@/integrations/supabase/client";

export const runSupabaseDiagnostics = async () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const hostname = url ? new URL(url).hostname : 'Unknown';
  
  console.group("%c[Supabase Diagnostic]", "color: #2563eb; font-weight: bold;");
  console.log(`Project Host: ${hostname}`);
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.warn("Auth Status: Unauthenticated or Session Expired");
    console.groupEnd();
    return;
  }

  console.log(`Auth User ID: ${user.id}`);
  console.log(`Auth Email: ${user.email}`);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.warn(`Profile Row: NOT FOUND (${profileError.message})`);
  } else {
    console.log("%cProfile Row: EXISTS", "color: #16a34a; font-weight: bold;");
  }

  console.groupEnd();
};