import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/App'; // Ensure queryClient is exported from App or setup differently

export const queueAction = async (table: string, action: 'create' | 'update' | 'delete' | 'upsert', data: any) => {
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
      console.error(`Cloud mutation failed for table '${table}':`, error.message);
      throw error; 
    }
  }
  
  // Invalidate query client cache for the affected table
  // You might need to adjust this to fit how queries are keyed
  // For now, this requires having access to the QueryClient.
  // Alternatively, the calling component should invalidate.
};