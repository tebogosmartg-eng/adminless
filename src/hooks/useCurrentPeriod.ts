import { useState, useEffect, useMemo } from 'react';
import { useTimetable } from './useTimetable';
import { format, isBefore, isAfter, parse } from 'date-fns';

export const useCurrentPeriod = () => {
  const { timetable } = useTimetable();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const today = format(now, 'EEEE');
  
  // Basic school hours assumption if start/end times aren't provided
  // Period 1: 08:00, Period 2: 09:00, etc.
  const periods = useMemo(() => {
    return timetable
      .filter(t => t.day === today)
      .sort((a, b) => a.period - b.period)
      .map(t => {
          // If the user hasn't set specific times, we assume 50min periods starting at 8am
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
              isCurrent: isAfter(now, startParsed) && isBefore(now, endParsed),
              isNext: false
          };
      });
  }, [timetable, today, now]);

  const currentPeriod = periods.find(p => p.isCurrent);
  const nextPeriod = periods.find(p => isBefore(now, p.startParsed));

  return { currentPeriod, nextPeriod, periods };
};