import { useEffect, useMemo, useState, useRef } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { AttendanceRecord, AttendanceStatus } from "@/lib/types";
import { useAcademic } from "@/context/AcademicContext";
import { supabase } from "@/lib/supabaseClient";
import { showError } from "@/utils/toast";

const STATUS_CYCLE: AttendanceStatus[] = ["present", "absent", "late", "excused"];

const getNextStatus = (
  currentStatus: AttendanceStatus | null | undefined
): AttendanceStatus => {
  if (!currentStatus) return STATUS_CYCLE[0];
  const index = STATUS_CYCLE.indexOf(currentStatus);
  return STATUS_CYCLE[(index + 1) % STATUS_CYCLE.length];
};

export const useMonthlyAttendance = (
  classId: string,
  monthDate: Date,
  attendanceData: Record<string, AttendanceRecord>,
  onStatusChange: (learnerId: string, status: AttendanceStatus, targetDate?: Date) => void,
  isLocked: boolean = false
) => {
  const { activeTerm } = useAcademic();

  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  const [baseRecords, setBaseRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchInProgressRef = useRef(false);

  useEffect(() => {
    const fetchMonthlyAttendance = async () => {
      if (!classId || !activeTerm?.id) {
        setBaseRecords([]);
        setLoading(false);
        return;
      }
      if (fetchInProgressRef.current) return;

      fetchInProgressRef.current = true;
      setLoading(true);
      try {
        console.log("[Attendance] fetch triggered");
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          setBaseRecords([]);
          return;
        }

        const { data, error } = await supabase
          .from("attendance")
          .select("*")
          .eq("class_id", classId)
          .eq("term_id", activeTerm.id)
          .eq("user_id", user.id)
          .gte("date", startStr)
          .lte("date", endStr);

        if (error) throw error;
        setBaseRecords((data as AttendanceRecord[]) || []);
      } catch (e) {
        console.error("Monthly attendance fetch error:", e);
        showError("Failed to load monthly attendance");
        setBaseRecords([]);
      } finally {
        fetchInProgressRef.current = false;
        setLoading(false);
      }
    };

    fetchMonthlyAttendance();
  }, [classId, activeTerm?.id, startStr, endStr]);

  const records = useMemo(() => {
    const pendingInMonth = Object.values(attendanceData).filter(
      (record) => record.date >= startStr && record.date <= endStr
    );

    if (!pendingInMonth.length) return baseRecords;

    const byKey = new Map<string, AttendanceRecord>();
    baseRecords.forEach((r) => {
      byKey.set(`${r.learner_id}|${r.date}`, r);
    });
    pendingInMonth.forEach((r) => {
      byKey.set(`${r.learner_id}|${r.date}`, r);
    });
    return Array.from(byKey.values());
  }, [baseRecords, attendanceData, startStr, endStr]);

  const days = eachDayOfInterval({ start, end });

  const getStatus = (learnerId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return records.find(r => r.learner_id === learnerId && r.date === dateStr)?.status;
  };

  // 🔥 UPDATE STATUS (toggle + delete + upsert)
  const updateStatus = async (
    learnerId: string,
    date: Date,
    currentStatus: AttendanceStatus | null | undefined
  ) => {
    if (isLocked) return;

    onStatusChange(learnerId, getNextStatus(currentStatus), date);
  };

  return { records, days, loading, getStatus, updateStatus };
};