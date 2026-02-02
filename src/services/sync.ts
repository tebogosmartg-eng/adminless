import { db, DBSyncItem } from '@/db';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const pullData = async (userId: string) => {
  try {
    const { data: classes } = await supabase.from('classes').select('*').eq('user_id', userId);
    if (classes) {
        const mappedClasses = classes.map(c => ({
            ...c,
            className: c.class_name,
            class_name: undefined 
        }));
        await db.classes.bulkPut(mappedClasses);
    }

    const classIds = classes?.map(c => c.id) || [];
    
    if (classIds.length > 0) {
        const { data: learners } = await supabase.from('learners').select('*').in('class_id', classIds);
        if (learners) {
            await db.learners.bulkPut(learners);
            const learnerIds = learners.map(l => l.id);
            if (learnerIds.length > 0) {
                const { data: notes } = await supabase.from('learner_notes').select('*').in('learner_id', learnerIds);
                if (notes) await db.learner_notes.bulkPut(notes);
            }
        }
        
        const { data: assessments } = await supabase.from('assessments').select('*').in('class_id', classIds);
        if (assessments) {
            await db.assessments.bulkPut(assessments);
            const assIds = assessments.map(a => a.id);
            if (assIds.length > 0) {
                const { data: marks } = await supabase.from('assessment_marks').select('*').in('assessment_id', assIds);
                if (marks) await db.assessment_marks.bulkPut(marks);
            }
        }

        const { data: attendance } = await supabase.from('attendance').select('*').in('class_id', classIds);
        if (attendance) await db.attendance.bulkPut(attendance);
    }

    const { data: years } = await supabase.from('academic_years').select('*').eq('user_id', userId);
    if (years) await db.academic_years.bulkPut(years);
    
    const { data: terms } = await supabase.from('terms').select('*').eq('user_id', userId);
    if (terms) await db.terms.bulkPut(terms);

    const { data: profiles } = await supabase.from('profiles').select('*').eq('id', userId);
    if (profiles) await db.profiles.bulkPut(profiles);

    const { data: todos } = await supabase.from('todos').select('*').eq('user_id', userId);
    if (todos) await db.todos.bulkPut(todos);

    const { data: timetable } = await supabase.from('timetable').select('*').eq('user_id', userId);
    if (timetable) await db.timetable.bulkPut(timetable);

    console.log("[sync] Data pull complete");
  } catch (error) {
    console.error("[sync] Pull failed", error);
  }
};

export const pushChanges = async () => {
  const queue = await db.sync_queue.orderBy('timestamp').toArray();
  if (queue.length === 0) return;

  console.log(`[sync] Pushing ${queue.length} changes...`);
  
  for (const item of queue) {
    try {
      const { table, action, data, id } = item;
      let payload = { ...data };
      delete payload.sync_status;

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
        console.error(`[sync] Error on ${table} (${action}):`, error);
        // If error is a conflict or logical error, remove from queue to avoid stall
        if (error.code === '23505' || error.status === 409) {
            await db.sync_queue.delete(id!);
        } else {
            throw error; // Network error or temporary fail
        }
      } else {
        await db.sync_queue.delete(id!);
      }
    } catch (err) {
      console.error("[sync] Network or temporary failure. Stopping queue.", err);
      break; 
    }
  }
};

export const queueAction = async (table: string, action: 'create' | 'update' | 'delete' | 'upsert', data: any) => {
  await db.sync_queue.add({ table, action, data, timestamp: Date.now() });
  if (navigator.onLine) pushChanges();
};