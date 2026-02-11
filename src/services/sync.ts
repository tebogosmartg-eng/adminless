import { db, DBSyncItem } from '@/db';
import { supabase } from '@/integrations/supabase/client';

let isPushing = false;

export const pushChanges = async () => {
  if (isPushing || !navigator.onLine) return;
  
  const queueCount = await db.sync_queue.count();
  if (queueCount === 0) return;

  isPushing = true;
  console.log(`[sync] Pushing ${queueCount} changes...`);
  
  try {
    const queue = await db.sync_queue.orderBy('timestamp').toArray();
    
    for (const item of queue) {
      const { table, action, data, id } = item;
      const payload = { ...data };
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
        console.error(`[sync] Failed to sync ${table} item:`, error);
        break; 
      } else {
        await db.sync_queue.delete(id!);
      }
    }
  } catch (err) {
    console.error("[sync] Critical error during push:", err);
  } finally {
    isPushing = false;
  }
};

export const pullData = async (userId: string) => {
  try {
    console.group(`[Diagnostic] Pulling Data from Supabase for User: ${userId}`);
    
    const pending = await db.sync_queue.toArray();
    const pendingIdsByTable = pending.reduce((acc, item) => {
      if (!acc[item.table]) acc[item.table] = new Set();
      if (item.data.id) acc[item.table].add(item.data.id);
      return acc;
    }, {} as Record<string, Set<string>>);

    const pullTable = async (tableName: string, query: any, idKey = 'id') => {
      console.log(`[Diagnostic] Executing Supabase query for '${tableName}': SELECT * WHERE user_id = ${userId}`);
      const { data, error } = await query;
      
      if (error) {
          console.error(`[Diagnostic] Supabase query ERROR for '${tableName}':`, error);
          return;
      }

      console.log(`[Diagnostic] Supabase result count for '${tableName}':`, data?.length || 0);

      if (!data) return;

      const itemsToPut = data.filter((item: any) => {
        const id = item[idKey];
        return !pendingIdsByTable[tableName]?.has(id);
      });

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

    // --- TASK 4: FILTERLESS DATA TEST ---
    // We execute queries based on user_id only (no term/year filtering happens at the server level in this pull)
    // If data exists in Supabase for this user, it WILL be pulled here regardless of active Term.
    
    await pullTable('classes', supabase.from('classes').select('*').eq('user_id', userId));
    
    const localClasses = await db.classes.toArray();
    const classIds = localClasses.map(c => c.id);

    console.log(`[Diagnostic] Local Class ID count for subsequent pulls:`, classIds.length);

    if (classIds.length > 0) {
      await pullTable('learners', supabase.from('learners').select('*').in('class_id', classIds));
      await pullTable('assessments', supabase.from('assessments').select('*').in('class_id', classIds));
      
      const localAssessments = await db.assessments.toArray();
      const assIds = localAssessments.map(a => a.id);
      if (assIds.length > 0) {
        await pullTable('assessment_marks', supabase.from('assessment_marks').select('*').in('assessment_id', assIds));
      }

      await pullTable('attendance', supabase.from('attendance').select('*').in('class_id', classIds), 'learner_id');
      await pullTable('learner_notes', supabase.from('learner_notes').select('*').in('learner_id', classIds));
    }

    await pullTable('academic_years', supabase.from('academic_years').select('*').eq('user_id', userId));
    await pullTable('terms', supabase.from('terms').select('*').eq('user_id', userId));
    await pullTable('profiles', supabase.from('profiles').select('*').eq('id', userId));
    await pullTable('todos', supabase.from('todos').select('*').eq('user_id', userId));
    await pullTable('timetable', supabase.from('timetable').select('*').eq('user_id', userId));
    await pullTable('lesson_logs', supabase.from('lesson_logs').select('*').eq('user_id', userId));

    console.groupEnd();
    console.log("[sync] Data pull complete.");
  } catch (error) {
    console.error("[sync] Pull failed:", error);
  }
};

export const queueAction = async (table: string, action: 'create' | 'update' | 'delete' | 'upsert', data: any) => {
  const dataItems = Array.isArray(data) ? data : [data];
  
  for (const item of dataItems) {
    if (item.id && (action === 'update' || action === 'upsert' || action === 'create')) {
      const existing = await db.sync_queue
        .where('table').equals(table)
        .filter(q => q.data.id === item.id && (q.action === 'update' || q.action === 'upsert' || q.action === 'create'))
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