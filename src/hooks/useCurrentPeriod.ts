import { useState, useEffect, useMemo } from "react";
import { useTimetable } from "./useTimetable";
import { format, isBefore, isAfter, parse } from "date-fns";
import { supabase } from "@/lib/supabaseClient";

export const useCurrentPeriod = () => {
  const { timetable } = useTimetable();

  const [now, setNow] = useState(new Date());
  const [attendanceToday, setAttendanceToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ⏱️ Keep time updated
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const today = format(now, "EEEE");
  const todayStr = format(now, "yyyy-MM-dd");

  // 🔥 Fetch attendance (SAFE)
  useEffect(() => {
    let isMounted = true;

    const fetchAttendance = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("attendance")
        .select("class_id") // ✅ only what we need
        .eq("date", todayStr);

      if (error) {
        console.error("Attendance fetch error:", error);
        if (isMounted) setLoading(false);
        return;
      }

      if (isMounted) {
        setAttendanceToday(data || []);
        setLoading(false);
      }
    };

    fetchAttendance();

    return () => {
      isMounted = false;
    };
  }, [todayStr]);

  // 🔥 Compute periods
  const periods = useMemo(() => {
    const markedClassIds = new Set(attendanceToday.map(r => r.class_id));

    return timetable
      .filter(t => t.day === today)
      .sort((a, b) => a.period - b.period)
      .map(t => {
        const startBase = 8 * 60 + (t.period - 1) * 60;
        const endBase = startBase + 55;

        const startTime =
          t.start_time ||
          `${Math.floor(startBase / 60)
            .toString()
            .padStart(2, "0")}:${(startBase % 60)
            .toString()
            .padStart(2, "0")}`;

        const endTime =
          t.end_time ||
          `${Math.floor(endBase / 60)
            .toString()
            .padStart(2, "0")}:${(endBase % 60)
            .toString()
            .padStart(2, "0")}`;

        const startParsed = parse(startTime, "HH:mm", now);
        const endParsed = parse(endTime, "HH:mm", now);

        return {
          ...t,
          startParsed,
          endParsed,
          startTime,
          endTime,
          isCurrent:
            isAfter(now, startParsed) && isBefore(now, endParsed),
          isPast: isAfter(now, endParsed),
          isPendingAttendance: t.class_id
            ? !markedClassIds.has(t.class_id)
            : false,
        };
      });
  }, [timetable, today, now, attendanceToday]);

  const currentPeriod = periods.find(p => p.isCurrent);
  const nextPeriod = periods.find(p => !p.isPast && !p.isCurrent);

  return { currentPeriod, nextPeriod, periods, loading };
};