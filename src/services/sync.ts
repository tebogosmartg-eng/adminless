import { db } from '@/db';
import { supabase } from '@/integrations/supabase/client';

export const queueAction = async (table: string, action: 'create' | 'update' | 'delete' | 'upsert', data: any) => {
  // Direct push to Supabase for stability in online-only mode
  const dataItems = Array.isArray(data) ? data : [data];
  
  for (const item of dataItems) {
    const payload = { ...item };
    delete payload.sync_status;

    if (table === 'classes' && payload.className !== undefined) {
      payload.class_name = payload.className;
      delete payload.className;
    }
    if (table === 'assessments') {
      if (payload.max !== undefined) {
        payload.max_mark = payload.max;
        delete payload.max;
      }
      if (payload.termId && !payload.term_id) {
        payload.term_id = payload.termId;
      }
      delete payload.termId;
    }

    if (!payload.user_id && !['profiles', 'learners', 'teacherfile_template_sections', 'teacherfile_entry_attachments'].includes(table)) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) payload.user_id = user.id;
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
      console.error(`Direct cloud mutation failed for table '${table}':`, error.message);
      throw error; 
    }
  }
  
  // Update local Dexie cache to keep UI reactive for components using useLiveQuery
  for (const item of dataItems) {
    if (action === 'delete') {
      // @ts-ignore
      if (db[table]) await db[table].delete(item.id);
    } else {
      // @ts-ignore
      if (db[table]) await db[table].put(item);
    }
  }
};