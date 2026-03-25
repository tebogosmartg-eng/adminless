import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TimetableEntry } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useAcademic } from '@/context/AcademicContext';

export const useTimetable = () => {
  const { activeYear } = useAcademic();
  const queryClient = useQueryClient();

  const { data: timetable = [] } = useQuery({
    queryKey: ['timetable', activeYear?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      // Direct Supabase call (omitting the non-existent year_id column filter)
      const { data, error } = await supabase
        .from('timetable')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) {
        console.error("Timetable fetch error", error);
        return [];
      }
      
      return data as TimetableEntry[];
    },
    enabled: !!activeYear?.id
  });

  const updateEntry = async (entry: Partial<TimetableEntry> & { day: string; period: number }) => {
    if (!activeYear?.id) {
        showError("Schedule update blocked: No active year cycle selected.");
        return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const existing = timetable.find(t => t.day === entry.day && t.period === entry.period);
      
      const payload: any = {
        id: existing?.id || crypto.randomUUID(),
        user_id: user.id,
        day: entry.day,
        period: entry.period,
        subject: entry.subject || '',
        class_name: entry.class_name || '',
        class_id: entry.class_id || null,
        start_time: entry.start_time || '',
        end_time: entry.end_time || '',
        notes: entry.notes !== undefined ? entry.notes : (existing?.notes || '')
      };

      const { error } = await supabase.from('timetable').upsert(payload);
      if (error) throw error;
      
      await queryClient.invalidateQueries({ queryKey: ['timetable'] });
    } catch (e) {
      console.error(e);
      showError("Failed to update routine entry.");
    }
  };

  const clearEntry = async (day: string, period: number) => {
    try {
      const existing = timetable.find(t => t.day === day && t.period === period);
      if (existing) {
        const { error } = await supabase.from('timetable').delete().eq('id', existing.id);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['timetable'] });
      }
    } catch (e) {
      showError("Failed to clear entry.");
    }
  };

  return { timetable, updateEntry, clearEntry };
};