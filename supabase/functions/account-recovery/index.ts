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

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const mode = body.mode || 'recover-email'

    // ORPHAN DATA MIGRATION MODE
    if (mode === 'fix-orphans') {
        console.log(`[account-recovery] Fixing orphans for user: ${currentUser.id}`)
        let recordsMoved = 0;
        const tables = [
            'classes', 'academic_years', 'terms', 'assessments', 
            'assessment_marks', 'activities', 'todos', 'attendance', 
            'learner_notes', 'evidence', 'timetable', 'lesson_logs', 
            'curriculum_topics', 'diagnostics', 'remediation_tasks', 
            'scan_history', 'scan_jobs', 'teacherfile_templates', 
            'teacherfile_entries', 'review_snapshots'
        ];

        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;
        const validUserIds = new Set(users.map(u => u.id));

        for (const table of tables) {
            const { data } = await supabaseAdmin.from(table).select('user_id');
            if (data) {
                const uniqueUserIds = [...new Set(data.map(r => r.user_id).filter(Boolean))];
                for (const uid of uniqueUserIds) {
                    if (!validUserIds.has(uid)) {
                        // This is an invalid/local ID! Migrate it.
                        const { data: updated, error: updateError } = await supabaseAdmin
                            .from(table)
                            .update({ user_id: currentUser.id })
                            .eq('user_id', uid)
                            .select('id');
                        if (!updateError && updated) recordsMoved += updated.length;
                    }
                }
                
                // Also migrate NULL user_ids
                const { data: nullUpdated, error: nullError } = await supabaseAdmin
                    .from(table)
                    .update({ user_id: currentUser.id })
                    .is('user_id', null)
                    .select('id');
                if (!nullError && nullUpdated) recordsMoved += nullUpdated.length;
            }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          migratedCount: recordsMoved,
          message: `Successfully migrated ${recordsMoved} local/orphaned records to your account.`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    // EMAIL RECOVERY MODE
    console.log(`[account-recovery] Checking recovery for: ${currentUser.email} (${currentUser.id})`)

    // 2. Find all users with this email (including old IDs)
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
    const tables = [
        'classes', 'academic_years', 'terms', 'assessments', 
        'assessment_marks', 'activities', 'todos', 'attendance', 
        'learner_notes', 'evidence', 'timetable', 'lesson_logs', 'curriculum_topics'
    ]

    for (const oldUser of matches) {
      const { count, error: countError } = await supabaseAdmin
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', oldUser.id)

      if (!countError && count > 0) {
        console.log(`[account-recovery] Found ${count} classes on old ID: ${oldUser.id}. Migrating...`)
        
        for (const table of tables) {
            const { data: updated } = await supabaseAdmin
                .from(table)
                .update({ user_id: currentUser.id })
                .eq('user_id', oldUser.id)
                .select('id');
            
            if (updated) recordsMoved += updated.length;
        }

        const { data: oldProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', oldUser.id).single()
        if (oldProfile) {
            const { id, ...profileData } = oldProfile
            await supabaseAdmin.from('profiles').upsert({ id: currentUser.id, ...profileData })
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      migratedCount: recordsMoved,
      message: recordsMoved > 0 
        ? `Successfully restored ${recordsMoved} records from your historical account.` 
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