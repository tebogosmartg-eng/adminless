import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { TimetableEntry } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { showSuccess, showError } from '@/utils/toast';
import { useAcademic } from '@/context/AcademicContext';

export const useTimetable = () => {
  const { activeYear } = useAcademic();
  
  // Scoped Query: routines typically change per year
  const timetable = useLiveQuery(
    () => activeYear 
        ? db.timetable.where('year_id').equals(activeYear.id).toArray() 
        : [],
    [activeYear?.id]
  ) || [];

  const updateEntry = async (entry: Partial<TimetableEntry> & { day: string; period: number }) => {
    // VALIDATION: Prevent insertion without year scope
    if (!activeYear) {
        showError("Schedule update blocked: No active year cycle selected.");
        return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const existing = timetable.find(t => t.day === entry.day && t.period === entry.period);
      
      const payload: TimetableEntry = {
        id: existing?.id || crypto.randomUUID(),
        user_id: user.id,
        year_id: activeYear.id, // Automatic scoping
        day: entry.day,
        period: entry.period,
        subject: entry.subject || '',
        class_name: entry.class_name || '',
        class_id: entry.class_id || null,
        start_time: entry.start_time || '',
        end_time: entry.end_time || '',
        notes: entry.notes !== undefined ? entry.notes : (existing?.notes || '')
      };

      await db.timetable.put(payload);
      await queueAction('timetable', 'upsert', payload);
    } catch (e) {
      console.error(e);
      showError("Failed to update routine entry.");
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