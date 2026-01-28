import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export const useMonthlyAttendance = (classId: string, monthDate: Date) => {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  const records = useLiveQuery(
    () => db.attendance
        .where('class_id').equals(classId)
        .filter(r => r.date! >= startStr && r.date! <= endStr)
        .toArray(),
    [classId, startStr, endStr]
  );

  const days = eachDayOfInterval({ start, end });

  // Helper to get status for a specific learner and date
  const getStatus = (learnerId: string, date: Date) => {
    if (!records) return null;
    const dateStr = format(date, 'yyyy-MM-dd');
    return records.find(r => r.learner_id === learnerId && r.date === dateStr)?.status;
  };

  return { records, days, loading: !records, getStatus };
};