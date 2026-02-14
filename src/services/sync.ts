import { db, DBSyncItem } from '@/db';
import { supabase } from '@/integrations/supabase/client';

let isPushing = false;
let isPulling = false;

export const pushChanges = async () => {
  if (isPushing || !navigator.onLine) return;
  
  const queueCount = await db.sync_queue.count();
  if (queueCount === 0) return;

  isPushing = true;
  console.log(`[Sync] Pushing ${queueCount} changes to Supabase...`);
  
  try {
    const queue = await db.sync_queue.orderBy('timestamp').toArray();
    
    for (const item of queue) {
      const { table, action, data, id } = item;
      const payload = { ...data };
      
      if (!payload.user_id && table !== 'profiles') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) payload.user_id = user.id;
      }

      delete payload.sync_status;

      if (table === 'classes' && payload.className !== undefined) {
        payload.class_name = payload.className;
        delete payload.className;
      }

      let error = null;
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
        console.error(`[Sync:Error] Push failed for table '${table}':`, error.message);
        // Do not delete item from queue if it failed due to connection or transient error
        if (error.code === 'PGRST301' || error.code === '42501') break;
        continue;
      }
      
      await db.sync_queue.delete(id!);
    }
  } catch (err) {
      console.error("[Sync:Critical] Push process interrupted:", err);
  } finally {
    isPushing = false;
  }
};

export const pullData = async (userId: string) => {
  if (isPulling || !navigator.onLine) return;
  isPulling = true;
  
  try {
    console.log(`[Sync] Starting data pull for user: ${userId}`);
    
    const pending = await db.sync_queue.toArray();
    const pendingIdsByTable = pending.reduce((acc, item) => {
      if (!acc[item.table]) acc[item.table] = new Set();
      if (item.data.id) acc[item.table].add(item.data.id);
      return acc;
    }, {} as Record<string, Set<string>>);

    const pullTable = async (tableName: string, query: any) => {
      const { data, error } = await query;
      if (error) {
          console.error(`[Sync:Error] Pull failed for table '${tableName}':`, error.message);
          return;
      }
      if (!data) return;

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

    // Sequential pull scoped to authenticated user
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
      await pullTable('evidence', supabase.from('evidence').select('*').in('class_id', classIds));
    }

    await pullTable('todos', supabase.from('todos').select('*').eq('user_id', userId));
    await pullTable('timetable', supabase.from('timetable').select('*').eq('user_id', userId));
    await pullTable('lesson_logs', supabase.from('lesson_logs').select('*').eq('user_id', userId));
    await pullTable('curriculum_topics', supabase.from('curriculum_topics').select('*').eq('user_id', userId));
    await pullTable('rubrics', supabase.from('rubrics').select('*').eq('user_id', userId));
    await pullTable('activities', supabase.from('activities').select('*').eq('user_id', userId));
    await pullTable('scan_history', supabase.from('scan_history').select('*').eq('user_id', userId));

    console.log(`[Sync] Data pull complete.`);
  } catch (error) {
    console.error("[Sync:Critical] Pull operation failed:", error);
  } finally {
    isPulling = false;
  }
};

export const queueAction = async (table: string, action: 'create' | 'update' | 'delete' | 'upsert', data: any) => {
  const dataItems = Array.isArray(data) ? data : [data];
  for (const item of dataItems) {
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
  if (navigator.onLine) pushChanges();
};