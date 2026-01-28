import { useLiveQuery } from "dexie-react-hooks";
import { Loader2, Clock, Check, X, AlertCircle } from "lucide-react";
import { db } from '@/db';
import { AttendanceStatus } from "@/lib/types";
import { useMemo } from "react";

interface ProfileAttendanceTabProps {
  learnerId?: string;
}

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

export const ProfileAttendanceTab = ({ learnerId }: ProfileAttendanceTabProps) => {
  
  const records = useLiveQuery(
    () => learnerId ? db.attendance.where('learner_id').equals(learnerId).toArray() : [],
    [learnerId]
  );

  const stats = useMemo(() => {
    const initial: AttendanceStats = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    
    if (!records) return initial;

    return records.reduce((acc, curr) => {
      const status = curr.status as AttendanceStatus;
      if (acc[status] !== undefined) {
          acc[status]++;
      }
      acc.total++;
      return acc;
    }, initial);
  }, [records]);

  if (!records) {
    return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (stats.total === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p>No attendance records found for this learner.</p>
      </div>
    );
  }

  const attendanceRate = Math.round(((stats.present + stats.late) / stats.total) * 100);

  return (
    <div className="space-y-6 pt-4 h-full overflow-y-auto">
      <div className="flex items-center justify-center p-6 bg-muted/30 rounded-xl border">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Attendance Rate
          </p>
          <span className={
            `text-5xl font-extrabold tracking-tight ${attendanceRate >= 90 ? 'text-green-600' : attendanceRate >= 80 ? 'text-amber-600' : 'text-red-600'}`
          }>
            {attendanceRate}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/10 flex flex-col items-center">
          <Check className="h-6 w-6 text-green-600 mb-2" />
          <span className="text-2xl font-bold">{stats.present}</span>
          <span className="text-xs text-muted-foreground">Present</span>
        </div>
        <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/10 flex flex-col items-center">
          <X className="h-6 w-6 text-red-600 mb-2" />
          <span className="text-2xl font-bold">{stats.absent}</span>
          <span className="text-xs text-muted-foreground">Absent</span>
        </div>
        <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/10 flex flex-col items-center">
          <Clock className="h-6 w-6 text-orange-600 mb-2" />
          <span className="text-2xl font-bold">{stats.late}</span>
          <span className="text-xs text-muted-foreground">Late</span>
        </div>
        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/10 flex flex-col items-center">
          <AlertCircle className="h-6 w-6 text-blue-600 mb-2" />
          <span className="text-2xl font-bold">{stats.excused}</span>
          <span className="text-xs text-muted-foreground">Excused</span>
        </div>
      </div>
    </div>
  );
};