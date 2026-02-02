import { db, DBSyncItem } from '@/db';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const pullData = async (userId: string) => {
  try {
    // 1. Classes
    const { data: classes } = await supabase.from('classes').select('*').eq('user_id', userId);
    if (classes) {
        // Map snake_case from DB to camelCase for local Dexie store
        const mappedClasses = classes.map(c => ({
            ...c,
            className: c.class_name,
            class_name: undefined // Clean up if necessary
        }));
        await db.classes.bulkPut(mappedClasses);
    }

    // 2. Learners (Need all learners for user's classes)
    const classIds = classes?.map(c => c.id) || [];
    
    if (classIds.length > 0) {
        const { data: learners } = await supabase.from('learners').select('*').in('class_id', classIds);
        if (learners) {
            await db.learners.bulkPut(learners);
            const learnerIds = learners.map(l => l.id);

            // 9. Learner Notes (New) - Only for learners we have
            if (learnerIds.length > 0) {
                const { data: notes } = await supabase.from('learner_notes').select('*').in('learner_id', learnerIds);
                if (notes) await db.learner_notes.bulkPut(notes);
            }
        }
        
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

        // 5. Attendance
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

    // 8. Timetable
    const { data: timetable } = await supabase.from('timetable').select('*').eq('user_id', userId);
    if (timetable) await db.timetable.bulkPut(timetable);

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
      let payload = { ...data };
      delete payload.sync_status;

      // Handle property mapping for 'classes' table (camelCase UI -> snake_case DB)
      if (table === 'classes') {
          if (payload.className !== undefined) {
              payload.class_name = payload.className;
              delete payload.className;
          }
      }

      let error = null;

      if (action === 'create') {
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