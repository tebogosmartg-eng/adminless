import { db, DBSyncItem } from '@/db';
import { supabase } from '@/integrations/supabase/client';

let isPushing = false;

/**
 * Pushes local changes from the sync_queue to Supabase.
 * Uses a lock to prevent concurrent executions.
 */
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
      
      // Clean payload: remove local-only metadata
      const payload = { ...data };
      delete payload.sync_status;

      // Map camelCase UI properties to snake_case DB columns where needed
      if (table === 'classes' && payload.className !== undefined) {
        payload.class_name = payload.className;
        delete payload.className;
      }

      let error = null;

      // Execute appropriate Supabase action
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
        // We stop processing the queue if a request fails to maintain order/dependency
        break; 
      } else {
        // Success: Remove from queue
        await db.sync_queue.delete(id!);
      }
    }
  } catch (err) {
    console.error("[sync] Critical error during push:", err);
  } finally {
    isPushing = false;
  }
};

/**
 * Pulls latest data from Supabase into the local Dexie DB.
 * Safely avoids overwriting records with pending local changes.
 */
export const pullData = async (userId: string) => {
  try {
    const pending = await db.sync_queue.toArray();
    const pendingIdsByTable = pending.reduce((acc, item) => {
      if (!acc[item.table]) acc[item.table] = new Set();
      if (item.data.id) acc[item.table].add(item.data.id);
      return acc;
    }, {} as Record<string, Set<string>>);

    const pullTable = async (tableName: string, query: any, idKey = 'id') => {
      const { data } = await query;
      if (!data) return;

      // Filter out items that have pending local changes to prevent overwriting "dirty" data
      const itemsToPut = data.filter((item: any) => {
        const id = item[idKey];
        return !pendingIdsByTable[tableName]?.has(id);
      });

      if (itemsToPut.length > 0) {
        // Handle specific mapping for classes
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

    await pullTable('classes', supabase.from('classes').select('*').eq('user_id', userId));
    
    // Get class IDs for related data
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

      await pullTable('attendance', supabase.from('attendance').select('*').in('class_id', classIds), 'learner_id');
      await pullTable('learner_notes', supabase.from('learner_notes').select('*').in('learner_id', classIds)); // notes tied to learners
    }

    await pullTable('academic_years', supabase.from('academic_years').select('*').eq('user_id', userId));
    await pullTable('terms', supabase.from('terms').select('*').eq('user_id', userId));
    await pullTable('profiles', supabase.from('profiles').select('*').eq('id', userId));
    await pullTable('todos', supabase.from('todos').select('*').eq('user_id', userId));
    await pullTable('timetable', supabase.from('timetable').select('*').eq('user_id', userId));

    console.log("[sync] Data pull complete.");
  } catch (error) {
    console.error("[sync] Pull failed:", error);
  }
};

/**
 * Adds an action to the sync queue.
 * Deduplicates the queue for updates to the same record.
 */
export const queueAction = async (table: string, action: 'create' | 'update' | 'delete' | 'upsert', data: any) => {
  // If this is an update/upsert, check if we already have a pending action for this item
  const dataItems = Array.isArray(data) ? data : [data];
  
  for (const item of dataItems) {
    if (item.id && (action === 'update' || action === 'upsert' || action === 'create')) {
      const existing = await db.sync_queue
        .where('table').equals(table)
        .filter(q => q.data.id === item.id && (q.action === 'update' || q.action === 'upsert' || q.action === 'create'))
        .first();
      
      if (existing) {
        // Update existing queue item instead of adding a new one
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
  
  // Try to push immediately if online
  if (navigator.onLine) {
    pushChanges();
  }
};