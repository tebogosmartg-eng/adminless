import { supabase } from '@/integrations/supabase/client';

export const queueAction = async (table: string, action: 'create' | 'update' | 'delete' | 'upsert', data: any) => {
  const dataItems = Array.isArray(data) ? data : [data];
  
  for (const item of dataItems) {
    const payload = { ...item };
    
    // --- 1. GLOBAL STRIPPING ---
    delete payload.sync_status;
    delete payload.is_finalised;

    // --- 2. TABLE-SPECIFIC STRIPPING ---
    if (table === 'classes') {
      if (payload.className !== undefined) {
        payload.class_name = payload.className;
        delete payload.className;
      }
      delete payload.year_id;
      delete payload.term_id;
      delete payload.learners;
    }

    if (table === 'terms') {
       delete payload.is_finalised;
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
      delete payload.questions;
      delete payload.rubric_id;
      delete payload.task_slot_key;
    }

    if (table === 'assessment_marks') {
      delete payload.question_marks;
      delete payload.rubric_selections;
    }

    if (table === 'learners') {
      delete payload.user_id;
      delete payload.gender;
      delete payload.className;
      delete payload.isCurrentClass;
      delete payload.key;
      delete payload.originalIndex;
    }

    if (table === 'timetable') {
      delete payload.year_id;
      delete payload.notes;
    }

    // Add user_id if required and missing
    if (!payload.user_id && !['profiles', 'learners', 'teacherfile_template_sections', 'teacherfile_entry_attachments'].includes(table)) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) payload.user_id = user.id;
    }

    let error = null;
    
    // CONVERT ALL WRITES TO UPSERT() TO PREVENT 409 CONFLICTS
    if (action === 'create' || action === 'upsert' || action === 'update') {
      const options: any = {};
      if (table === 'attendance') {
          options.onConflict = 'learner_id,date';
      }
      
      const { error: e } = await supabase.from(table as any).upsert(payload, options);
      error = e;
    } else if (action === 'delete') {
      const { error: e } = await supabase.from(table as any).delete().eq('id', payload.id);
      error = e;
    }

    if (error) {
      console.error(`Cloud mutation failed for table '${table}':`, error.message);
      // We log but don't throw, allowing the rest of the queue to process
    }
  }
};