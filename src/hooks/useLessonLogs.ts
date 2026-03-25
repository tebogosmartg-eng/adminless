import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { LessonLog } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { showSuccess, showError } from '@/utils/toast';

export const useLessonLogs = (timetableId?: string, date?: string) => {
  const log = useLiveQuery(
    () => (timetableId && date) 
      ? db.lesson_logs.where('[timetable_id+date]').equals([timetableId, date]).first()
      : undefined,
    [timetableId, date]
  );

  const saveLog = async (content: string, homework?: string, topic_ids: string[] = []) => {
    if (!timetableId || !date) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload: LessonLog = {
        id: log?.id || crypto.randomUUID(),
        user_id: user.id,
        timetable_id: timetableId,
        date,
        content,
        homework,
        topic_ids,
        created_at: log?.created_at || new Date().toISOString()
      };

      await db.lesson_logs.put(payload);
      await queueAction('lesson_logs', 'upsert', payload);
      showSuccess("Lesson record updated.");
    } catch (e) {
      showError("Failed to save lesson log.");
    }
  };

  return { log, saveLog };
};