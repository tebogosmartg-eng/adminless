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

    // Initialize Supabase with Service Role Key to manage all users and bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Get current calling user
    const { data: { user: currentUser }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !currentUser) throw new Error("Invalid session")

    console.log(`[account-recovery] Checking recovery for: ${currentUser.email} (${currentUser.id})`)

    // 2. Find all users with this email (including old IDs)
    // We use the admin API to list users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError

    const matches = users.filter(u => u.email === currentUser.email && u.id !== currentUser.id)
    
    if (matches.length === 0) {
      return new Response(JSON.stringify({ message: "No duplicate accounts found for this email." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let recordsMoved = 0
    let sourceIdUsed = ""

    // 3. Check each duplicate for data and migrate
    for (const oldUser of matches) {
      // Check if this old user has classes
      const { count, error: countError } = await supabaseAdmin
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', oldUser.id)

      if (!countError && count > 0) {
        console.log(`[account-recovery] Found ${count} classes on old ID: ${oldUser.id}. Migrating...`)
        
        // MIGRATE ALL DATA TABLES
        const tables = [
            'classes', 'academic_years', 'terms', 'assessments', 
            'assessment_marks', 'activities', 'todos', 'attendance', 
            'learner_notes', 'evidence', 'timetable', 'lesson_logs', 'curriculum_topics'
        ]

        for (const table of tables) {
            const { error: moveError } = await supabaseAdmin
                .from(table)
                .update({ user_id: currentUser.id })
                .eq('user_id', oldUser.id)
            
            if (moveError) console.error(`[account-recovery] Error moving ${table}:`, moveError)
        }

        // Migrate Profile Data (Merge into current)
        const { data: oldProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', oldUser.id).single()
        if (oldProfile) {
            const { id, ...profileData } = oldProfile
            await supabaseAdmin.from('profiles').upsert({ id: currentUser.id, ...profileData })
        }

        recordsMoved += count
        sourceIdUsed = oldUser.id
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      migratedCount: recordsMoved,
      message: recordsMoved > 0 
        ? `Successfully restored ${recordsMoved} classes from your historical account.` 
        : "No historical data found in linked accounts."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error("[account-recovery] Critical Failure:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})