import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { AttendanceStatus } from "@/lib/types";
import { useAcademic } from "@/context/AcademicContext";

export const useMonthlyAttendance = (classId: string, monthDate: Date) => {
  const { activeTerm } = useAcademic();

  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Temporary safe placeholders during migration away from Dexie.
  // Keep the same hook API while preventing runtime fetches/crashes.
  void setRecords;
  void setLoading;
  void classId;
  void activeTerm;
  void startStr;
  void endStr;

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
    try {
      void learnerId;
      void date;
      void currentStatus;
    } catch (e) {
      console.error(e);
    }
  };

  return { records, days, loading, getStatus, updateStatus };
};