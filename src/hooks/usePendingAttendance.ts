import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClassInfo } from '@/lib/types';
import { format } from 'date-fns';

export const usePendingAttendance = (classes: ClassInfo[]) => {
  const [pendingClasses, setPendingClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAttendance = async () => {
      if (classes.length === 0) {
        setLoading(false);
        return;
      }

      // Only check active classes
      const activeClasses = classes.filter(c => !c.archived);
      
      if (activeClasses.length === 0) {
        setPendingClasses([]);
        setLoading(false);
        return;
      }

      const today = format(new Date(), 'yyyy-MM-dd');
      const classIds = activeClasses.map(c => c.id);

      const { data: attendanceRecords, error } = await supabase
        .from('attendance')
        .select('class_id')
        .eq('date', today)
        .in('class_id', classIds);

      if (error) {
        console.error('Error checking pending attendance:', error);
        setLoading(false);
        return;
      }

      // Get IDs of classes that HAVE attendance
      const markedClassIds = new Set(attendanceRecords?.map((r: any) => r.class_id));

      // Filter classes that don't have attendance
      const missing = activeClasses.filter(c => !markedClassIds.has(c.id));
      
      setPendingClasses(missing);
      setLoading(false);
    };

    checkAttendance();
  }, [classes]);

  return { pendingClasses, loading };
};