import { db, DBSyncItem } from '@/db';
import { supabase } from '@/integrations/supabase/client';

let isPushing = false;

export const pushChanges = async () => {
  if (isPushing || !navigator.onLine) return;
  
  const queueCount = await db.sync_queue.count();
  if (queueCount === 0) return;

  isPushing = true;
  console.log(`[Diagnostic: Sync] Pushing ${queueCount} changes to Supabase...`);
  
  try {
    const queue = await db.sync_queue.orderBy('timestamp').toArray();
    
    for (const item of queue) {
      const { table, action, data, id } = item;
      const payload = { ...data };
      
      // Security Check: Ensure user_id exists for RLS compliance
      if (!payload.user_id && table !== 'profiles') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) payload.user_id = user.id;
      }

      delete payload.sync_status;

      // Handle field name mapping for PostgREST compatibility
      if (table === 'classes' && payload.className !== undefined) {
        payload.class_name = payload.className;
        delete payload.className;
      }

      let error = null;
      console.log(`[Diagnostic: Sync] Executing ${action} on ${table}`, { id: payload.id });

      if (action === 'create' || action === 'upsert') {
        const { error: e } = await supabase.from(table as any).upsert(payload);
        error = e;
      } else if (action === 'update') {
        const { error: e } = await supabase.from(table as any).update(payload).eq('id', payload.id);
        error = e;
      } else if (action === 'delete') {
        const { error: e } = await supabase.from(table as any).delete().eq('id', payload.id);
        error = e;
      }

      if (error) {
        console.error(`[Diagnostic: Sync] Push failed for ${table}:`, error.message, error.details);
        // Do not block the whole queue for a single record error unless it's an auth error
        if (error.code === 'PGRST301' || error.code === '42501') {
            console.error("[Diagnostic: Sync] Critical Permission Error. Stopping Queue.");
            break;
        }
        await db.sync_queue.delete(id!); // Clear failing record to prevent loop
      } else {
        await db.sync_queue.delete(id!);
      }
    }
  } catch (err) {
    console.error("[Diagnostic: Sync] Critical error during push:", err);
  } finally {
    isPushing = false;
  }
};

export const pullData = async (userId: string) => {
  try {
    console.group(`[Diagnostic: Sync] Restoring Context for User: ${userId}`);
    
    const pending = await db.sync_queue.toArray();
    const pendingIdsByTable = pending.reduce((acc, item) => {
      if (!acc[item.table]) acc[item.table] = new Set();
      if (item.data.id) acc[item.table].add(item.data.id);
      return acc;
    }, {} as Record<string, Set<string>>);

    const pullTable = async (tableName: string, query: any) => {
      const { data, error } = await query;
      
      if (error) {
          console.error(`[Diagnostic: Sync] Error pulling ${tableName}:`, error.message);
          return;
      }

      if (!data || data.length === 0) {
          console.log(`[Diagnostic: Sync] No remote records for ${tableName}`);
          return;
      }

      // Filter out items that are currently pending in the local sync queue to prevent overwriting local work
      const itemsToPut = data.filter((item: any) => !pendingIdsByTable[tableName]?.has(item.id));

      if (itemsToPut.length > 0) {
        if (tableName === 'classes') {
          const mapped = itemsToPut.map((c: any) => ({
            ...c,
            className: c.class_name,
            class_name: undefined
          }));
          await db.classes.bulkPut(mapped);
        } else {
          // @ts-ignore
          await db[tableName].bulkPut(itemsToPut);
        }
      }
    };

    // Sequential pull to maintain relational integrity
    await pullTable('academic_years', supabase.from('academic_years').select('*').eq('user_id', userId));
    await pullTable('terms', supabase.from('terms').select('*').eq('user_id', userId));
    await pullTable('profiles', supabase.from('profiles').select('*').eq('id', userId));
    await pullTable('classes', supabase.from('classes').select('*').eq('user_id', userId));
    
    const localClasses = await db.classes.toArray();
    const classIds = localClasses.map(c => c.id);

    if (classIds.length > 0) {
      await pullTable('learners', supabase.from('learners').select('*').in('class_id', classIds));
      await pullTable('assessments', supabase.from('assessments').select('*').in('class_id', classIds));
      
      const localAssessments = await db.assessments.toArray();
      const assIds = localAssessments.map(a => a.id);
      if (assIds.length > 0) {
        await pullTable('assessment_marks', supabase.from('assessment_marks').select('*').in('assessment_id', assIds));
      }

      await pullTable('attendance', supabase.from('attendance').select('*').in('class_id', classIds));
      await pullTable('learner_notes', supabase.from('learner_notes').select('*').in('learner_id', classIds));
      await pullTable('evidence', supabase.from('evidence').select('*').in('class_id', classIds));
    }

    await pullTable('todos', supabase.from('todos').select('*').eq('user_id', userId));
    await pullTable('timetable', supabase.from('timetable').select('*').eq('user_id', userId));
    await pullTable('lesson_logs', supabase.from('lesson_logs').select('*').eq('user_id', userId));
    await pullTable('curriculum_topics', supabase.from('curriculum_topics').select('*').eq('user_id', userId));
    await pullTable('rubrics', supabase.from('rubrics').select('*').eq('user_id', userId));
    await pullTable('activities', supabase.from('activities').select('*').eq('user_id', userId));

    console.groupEnd();
  } catch (error) {
    console.groupEnd();
    console.error("[Diagnostic: Sync] Global pull operation failed:", error);
  }
};

export const queueAction = async (table: string, action: 'create' | 'update' | 'delete' | 'upsert', data: any) => {
  const dataItems = Array.isArray(data) ? data : [data];
  
  for (const item of dataItems) {
    // Deduplication logic for pending queue
    if (item.id && (action === 'update' || action === 'upsert' || action === 'create')) {
      const existing = await db.sync_queue
        .where('table').equals(table)
        .filter(q => q.data.id === item.id)
        .first();
      
      if (existing) {
        await db.sync_queue.update(existing.id!, {
          data: { ...existing.data, ...item },
          timestamp: Date.now()
        });
        continue;
      }
    }

    await db.sync_queue.add({
      table,
      action,
      data: item,
      timestamp: Date.now()
    });
  }
  
  if (navigator.onLine) {
    pushChanges();
  }
};