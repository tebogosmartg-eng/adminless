import { useState, useEffect } from 'react';
import { db } from '@/db';
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

      // Query local DB
      const attendanceRecords = await db.attendance
        .where('date').equals(today)
        .filter(r => r.class_id ? classIds.includes(r.class_id) : false)
        .toArray();

      // Get IDs of classes that HAVE attendance for today
      const markedClassIds = new Set(attendanceRecords.map(r => r.class_id));

      // Filter classes that don't have attendance
      const missing = activeClasses.filter(c => !markedClassIds.has(c.id));
      
      setPendingClasses(missing);
      setLoading(false);
    };

    checkAttendance();
  }, [classes]);

  return { pendingClasses, loading };
};