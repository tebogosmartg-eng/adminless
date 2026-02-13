// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Unauthorized")

    // Use Service Role Key to execute bulk updates and bypass RLS if necessary
    // though filtering strictly by auth.uid() via the user session is safer.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 1. Get current calling user to verify identity
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error("Invalid session")

    const { term1Id } = await req.json()
    if (!term1Id) throw new Error("Missing target Term 1 ID")

    console.log(`[academic-reset] Starting backend reset for user: ${user.id} to term: ${term1Id}`)

    // 2. Perform Migration on Tables with term_id
    // We execute these as updates strictly for the authenticated user
    const tablesToUpdate = [
        'classes', 
        'assessments', 
        'evidence', 
        'attendance', 
        'learner_notes', 
        'activities', 
        'todos'
    ]

    const results: Record<string, number> = {}
    let totalMoved = 0

    for (const table of tablesToUpdate) {
        const { data, count, error } = await supabaseClient
            .from(table)
            .update({ term_id: term1Id })
            .eq('user_id', user.id)
            .neq('term_id', term1Id) // Only move if not already there
            .select('*', { count: 'exact', head: true })
        
        if (error) {
            console.warn(`[academic-reset] Skipping ${table} (Possibly missing term_id column or permission):`, error.message)
            continue
        }

        results[table] = count || 0
        totalMoved += count || 0
    }

    return new Response(JSON.stringify({ 
      success: true, 
      counts: results,
      total: totalMoved,
      message: `Backend migration complete. Consolidated ${totalMoved} records into Term 1.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error("[academic-reset] Critical Failure:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})