import { useState, useEffect } from 'react';
import { db } from '@/db';
import { AttendanceStatus } from '@/lib/types';
import { useLiveQuery } from '@/lib/dexie-react-hooks';
import { format } from 'date-fns';

interface DailyStats {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

export const useDailyAttendance = () => {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Live Query from Dexie
  const attendanceRecords = useLiveQuery(
    () => db.attendance.where('date').equals(today).toArray(),
    [today]
  );

  const stats: DailyStats = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };

  if (attendanceRecords) {
    attendanceRecords.forEach(record => {
      const status = record.status as AttendanceStatus;
      if (stats[status] !== undefined) {
          stats[status]++;
      }
      stats.total++;
    });
  }

  return { stats, loading: !attendanceRecords };
};