import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { TimetableEntry } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { showSuccess, showError } from '@/utils/toast';

export const useTimetable = () => {
  const timetable = useLiveQuery(() => db.timetable.toArray()) || [];

  const updateEntry = async (entry: Partial<TimetableEntry> & { day: string; period: number }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if entry exists for this day/period
      const existing = timetable.find(t => t.day === entry.day && t.period === entry.period);
      
      const payload: TimetableEntry = {
        id: existing?.id || crypto.randomUUID(),
        user_id: user.id,
        day: entry.day,
        period: entry.period,
        subject: entry.subject || '',
        class_name: entry.class_name || '',
        class_id: entry.class_id || null,
        start_time: entry.start_time || '',
        end_time: entry.end_time || ''
      };

      await db.timetable.put(payload);
      await queueAction('timetable', 'upsert', payload);
      
      // showSuccess("Timetable updated."); 
      // Commented out to prevent toast spam on bulk edits
    } catch (e) {
      console.error(e);
      showError("Failed to update timetable.");
    }
  };

  const clearEntry = async (day: string, period: number) => {
    try {
      const existing = timetable.find(t => t.day === day && t.period === period);
      if (existing) {
        await db.timetable.delete(existing.id);
        await queueAction('timetable', 'delete', { id: existing.id });
      }
    } catch (e) {
      showError("Failed to clear entry.");
    }
  };

  return { timetable, updateEntry, clearEntry };
};