import { Clock, Check, X, AlertCircle } from "lucide-react";
import { AttendanceStatus } from "@/lib/types";
import { useMemo, useState, useEffect } from "react";
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from "@/lib/supabaseClient";

interface ProfileAttendanceTabProps {
  learnerId?: string;
  classId?: string;
  termId?: string;
}

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

export const ProfileAttendanceTab = ({ learnerId, classId, termId }: ProfileAttendanceTabProps) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLearnerData = async () => {
      if (!learnerId) {
        setRecords([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          setRecords([]);
          return;
        }

        let query = supabase
          .from("attendance")
          .select("*")
          .eq("learner_id", learnerId)
          .eq("user_id", user.id);

        if (classId) {
          query = query.eq("class_id", classId);
        }

        if (termId) {
          query = query.eq("term_id", termId);
        }

        const { data, error } = await query;
        if (error) throw error;
        setRecords(data || []);
      } catch (error) {
        console.error("Learner profile error:", error);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLearnerData();
  }, [learnerId, classId, termId]);

  const stats = useMemo(() => {
    const initial: AttendanceStats = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    
    if (!records || records.length === 0) return initial;

    return records.reduce((acc, curr) => {
      const status = curr.status as AttendanceStatus;
      if (acc[status] !== undefined) {
          acc[status]++;
      }
      acc.total++;
      return acc;
    }, initial);
  }, [records]);

  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!records || stats.total === 0) {
    return (
      <EmptyState
        title="No attendance records"
        description="Attendance will appear here once records are captured."
        icon={<Clock className="h-12 w-12 opacity-20" />}
      />
    );
  }

  const attendedLessons = stats.present + stats.late;
  const rateDenominator = Math.max(1, stats.present + stats.absent + stats.late);
  const attendanceRate = Math.round((attendedLessons / rateDenominator) * 100);

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