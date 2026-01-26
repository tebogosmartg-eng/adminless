import { db, DBSyncItem } from '@/db';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const pullData = async (userId: string) => {
  try {
    // 1. Classes
    const { data: classes } = await supabase.from('classes').select('*').eq('user_id', userId);
    if (classes) await db.classes.bulkPut(classes);

    // 2. Learners (Need all learners for user's classes)
    // We get them via join usually, but for sync fetch flat
    // Helper to get class IDs
    const classIds = classes?.map(c => c.id) || [];
    
    if (classIds.length > 0) {
        const { data: learners } = await supabase.from('learners').select('*').in('class_id', classIds);
        if (learners) await db.learners.bulkPut(learners);
        
        // 3. Assessments
        const { data: assessments } = await supabase.from('assessments').select('*').in('class_id', classIds);
        if (assessments) {
            await db.assessments.bulkPut(assessments);
            const assIds = assessments.map(a => a.id);
            
            // 4. Marks
            if (assIds.length > 0) {
                const { data: marks } = await supabase.from('assessment_marks').select('*').in('assessment_id', assIds);
                if (marks) await db.assessment_marks.bulkPut(marks);
            }
        }
    }

    // 5. Academic Config
    const { data: years } = await supabase.from('academic_years').select('*').eq('user_id', userId);
    if (years) await db.academic_years.bulkPut(years);
    
    const { data: terms } = await supabase.from('terms').select('*').eq('user_id', userId);
    if (terms) await db.terms.bulkPut(terms);

    // 6. Extras
    const { data: profiles } = await supabase.from('profiles').select('*').eq('id', userId);
    if (profiles) await db.profiles.bulkPut(profiles);

    const { data: todos } = await supabase.from('todos').select('*').eq('user_id', userId);
    if (todos) await db.todos.bulkPut(todos);

    console.log("Data pull complete");
  } catch (error) {
    console.error("Pull failed", error);
  }
};

export const pushChanges = async () => {
  const queue = await db.sync_queue.orderBy('timestamp').toArray();
  if (queue.length === 0) return;

  console.log(`Pushing ${queue.length} changes...`);
  
  for (const item of queue) {
    try {
      const { table, action, data, id } = item;
      
      // Remove local-only fields if present
      const payload = { ...data };
      delete payload.sync_status;

      let error = null;

      if (action === 'create' || action === 'insert') {
        const { error: e } = await supabase.from(table as any).insert(payload);
        error = e;
      } else if (action === 'update') {
        const { error: e } = await supabase.from(table as any).update(payload).eq('id', payload.id);
        error = e;
      } else if (action === 'upsert') {
        const { error: e } = await supabase.from(table as any).upsert(payload);
        error = e;
      } else if (action === 'delete') {
        const { error: e } = await supabase.from(table as any).delete().eq('id', payload.id);
        error = e;
      }

      if (error) {
        console.error(`Sync error on ${table}:`, error);
        // If critical error, maybe break? For now, we log and keep trying others or remove if strictly malformed
        // Ideally we keep it in queue if network error, remove if schema error.
        // Assuming network is good (since we check online status before calling push), we assume schema error?
        // Actually, if we are here, we assume online.
        throw error; 
      } else {
        // Success
        await db.sync_queue.delete(id!);
      }
    } catch (err) {
      console.error("Failed to push item", item, err);
      // Stop processing queue to preserve order dependency? 
      // Or skip? For simple app, breaking might be safer to avoid data corruption.
      break; 
    }
  }
};

export const queueAction = async (table: string, action: 'create' | 'update' | 'delete' | 'upsert', data: any) => {
  await db.sync_queue.add({
    table,
    action,
    data,
    timestamp: Date.now()
  });
  
  // Try to push immediately if online
  if (navigator.onLine) {
    pushChanges(); // Non-blocking
  }
};