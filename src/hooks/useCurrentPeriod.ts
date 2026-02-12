import { useState, useEffect, useMemo } from 'react';
import { useTimetable } from './useTimetable';
import { format, isBefore, isAfter, parse } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

export const useCurrentPeriod = () => {
  const { timetable } = useTimetable();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Update state every minute to keep current/next markers accurate
    const timer = setInterval(() => setNow(new Date()), 60000); 
    return () => clearInterval(timer);
  }, []);

  const today = format(now, 'EEEE');
  const todayStr = format(now, 'yyyy-MM-dd');

  // Fetch only today's attendance records to verify register completion
  const attendanceToday = useLiveQuery(
      () => db.attendance.where('date').equals(todayStr).toArray(),
      [todayStr]
  ) || [];

  const periods = useMemo(() => {
    // Map class IDs that HAVE already marked attendance today
    const markedClassIds = new Set(attendanceToday.map(r => r.class_id));

    return timetable
      .filter(t => t.day === today)
      .sort((a, b) => a.period - b.period)
      .map(t => {
          // Default logic: sessions start at 8:00 AM, 55 mins each
          const startBase = 8 * 60 + (t.period - 1) * 60;
          const endBase = startBase + 55;
          
          const startTime = t.start_time || `${Math.floor(startBase/60).toString().padStart(2, '0')}:${(startBase%60).toString().padStart(2, '0')}`;
          const endTime = t.end_time || `${Math.floor(endBase/60).toString().padStart(2, '0')}:${(endBase%60).toString().padStart(2, '0')}`;

          const startParsed = parse(startTime, 'HH:mm', now);
          const endParsed = parse(endTime, 'HH:mm', now);

          return {
              ...t,
              startParsed,
              endParsed,
              startTime,
              endTime,
              isCurrent: isAfter(now, startParsed) && isBefore(now, endParsed),
              isPast: isAfter(now, endParsed),
              // Flag missing registers for scheduled classes
              isPendingAttendance: t.class_id ? !markedClassIds.has(t.class_id) : false
          };
      });
  }, [timetable, today, now, attendanceToday]);

  const currentPeriod = periods.find(p => p.isCurrent);
  const nextPeriod = periods.find(p => !p.isPast && !p.isCurrent);

  return { currentPeriod, nextPeriod, periods };
};