import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TimetableEntry } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { showError } from '@/utils/toast';
import { logAdminLessError } from '@/utils/logAdminLessError';
import { useAcademic } from '@/context/AcademicContext';

export const useTimetable = () => {
  const { activeYear } = useAcademic();
  const queryClient = useQueryClient();

  const {
    data: timetable = [],
    error: timetableQueryError,
    isLoading: timetableQueryLoading,
    isFetching: timetableQueryFetching,
    refetch,
  } = useQuery({
    queryKey: ['timetable', activeYear?.id],
    queryFn: async () => {
      try {
          const { data: { user }, error: authErr } = await supabase.auth.getUser();
          if (authErr || !user) return [];
          
          const { data, error } = await supabase
            .from('timetable')
            .select('*')
            .eq('user_id', user.id);
            
          if (error) throw error;
          
          return data as TimetableEntry[];
      } catch (e) {
          logAdminLessError('timetable_fetch', e);
          throw e;
      }
    },
    enabled: !!activeYear?.id
  });

  const error: Error | null =
    timetableQueryError == null
      ? null
      : timetableQueryError instanceof Error
        ? timetableQueryError
        : new Error(String(timetableQueryError));

  const updateEntry = async (entry: Partial<TimetableEntry> & { day: string; period: number }) => {
    if (!activeYear?.id) {
        showError("Schedule update blocked: No active year cycle selected.");
        return;
    }

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error("Authentication failed");

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
      };

      const { error } = await supabase.from('timetable').upsert(payload);
      if (error) throw error;
      
      await queryClient.invalidateQueries({ queryKey: ['timetable'] });
    } catch (e) {
      logAdminLessError('timetable_update_entry', e);
      showError("Failed to update timetable");
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
      logAdminLessError('timetable_clear_entry', e);
      showError("Failed to update timetable");
    }
  };

  return {
    data: timetable,
    timetable,
    error,
    isLoading: Boolean(activeYear?.id) && timetableQueryLoading,
    isFetching: Boolean(activeYear?.id) && timetableQueryFetching,
    refetch,
    updateEntry,
    clearEntry,
  };
};