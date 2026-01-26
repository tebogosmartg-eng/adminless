import { db, DBSyncItem } from '@/db';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const pullData = async (userId: string) => {
  try {
    // 1. Classes
    const { data: classes } = await supabase.from('classes').select('*').eq('user_id', userId);
    if (classes) await db.classes.bulkPut(classes);

    // 2. Learners (Need all learners for user's classes)
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

        // 5. Attendance (New)
        // Fetching all attendance history might be heavy. For now, fetch recent? 
        // Or fetch all to ensure full offline capability. Let's fetch all for user's classes.
        // We can optimize with 'updated_at' later.
        const { data: attendance } = await supabase.from('attendance').select('*').in('class_id', classIds);
        if (attendance) await db.attendance.bulkPut(attendance);
    }

    // 6. Academic Config
    const { data: years } = await supabase.from('academic_years').select('*').eq('user_id', userId);
    if (years) await db.academic_years.bulkPut(years);
    
    const { data: terms } = await supabase.from('terms').select('*').eq('user_id', userId);
    if (terms) await db.terms.bulkPut(terms);

    // 7. Extras
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

      if (action === 'create') {
        const { error: e } = await supabase.from(table as any).insert(payload);
        error = e;
      } else if (action === 'update') {
        const { error: e } = await supabase.from(table as any).update(payload).eq('id', payload.id);
        error = e;
      } else if (action === 'upsert') {
        // Handle attendance specifically? Supabase upsert works with unique constraints.
        const { error: e } = await supabase.from(table as any).upsert(payload);
        error = e;
      } else if (action === 'delete') {
        const { error: e } = await supabase.from(table as any).delete().eq('id', payload.id);
        error = e;
      }

      if (error) {
        console.error(`Sync error on ${table}:`, error);
        throw error; 
      } else {
        // Success
        await db.sync_queue.delete(id!);
      }
    } catch (err) {
      console.error("Failed to push item", item, err);
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
  
  if (navigator.onLine) {
    pushChanges(); // Non-blocking
  }
};