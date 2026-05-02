"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import { showSuccess, showError } from "@/utils/toast";
import { Learner, AttendanceRecord, AttendanceStatus } from "@/lib/types";
import { useAcademic } from "@/context/AcademicContext";
import { useSettings } from "@/context/SettingsContext";
import { generateAttendancePDF, SchoolProfile } from "@/utils/pdfGenerator";
import { useAsyncState } from "@/hooks/useAsyncState";

export const useAttendance = (classId: string, learners: Learner[], isLocked: boolean = false) => {
  const { activeTerm } = useAcademic();
  const { schoolName, teacherName, schoolLogo, contactEmail, contactPhone } = useSettings();
  const termId = activeTerm?.id;

  const [date, setDate] = useState<Date>(new Date());
  const selectedDate = format(date, "yyyy-MM-dd");

  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  const [safeLearners, setSafeLearners] = useState<Learner[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);
  const fetchInProgressRef = useRef(false);
  const contextKey = `${classId || "none"}::${termId || "none"}::${selectedDate}`;
  const loadState = useAsyncState({ resetOnChangeKey: contextKey });
  const saveState = useAsyncState({ resetOnChangeKey: contextKey });
  const exportState = useAsyncState({ resetOnChangeKey: `${classId || "none"}::${termId || "none"}::export` });

  // ✅ SAFE learners
  useEffect(() => {
    setSafeLearners(learners || []);
  }, [learners]);

  const fetchAttendance = useCallback(async () => {
    if (!classId || !termId) {
      setAttendanceData({});
      setHasChanges(false);
      setIsFetchingAttendance(false);
      return;
    }
    if (fetchInProgressRef.current) return;

    fetchInProgressRef.current = true;
    setIsFetchingAttendance(true);
    console.log("[Attendance] fetch triggered");
    try {
      await loadState.run(async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if (!user) {
          throw new Error("Session expired");
        }

        const { data, error } = await supabase
          .from("attendance")
          .select("*")
          .eq("class_id", classId)
          .eq("term_id", termId)
          .eq("date", selectedDate)
          .eq("user_id", user.id);

        if (error) throw error;

        const map: Record<string, AttendanceRecord> = {};
        (data || []).forEach((r: any) => {
          map[r.learner_id] = r;
        });

        setAttendanceData(map);
        setHasChanges(false);
      }, { status: "loading" });
    } catch (e) {
      console.error("Attendance fetch error:", e);
    } finally {
      fetchInProgressRef.current = false;
      setIsFetchingAttendance(false);
    }
  }, [classId, termId, selectedDate, loadState.run]);

  // 🔥 FETCH attendance (SUPABASE ONLY)
  useEffect(() => {
    void fetchAttendance();
  }, [fetchAttendance]);

  // 🔥 UPDATE SINGLE
  const handleStatusChange = (learnerId: string, status: AttendanceStatus, targetDate?: Date) => {
    if (isLocked) {
      showError("Attendance is locked for this finalized term.");
      return;
    }
    if (!learnerId || !activeTerm?.id) {
      showError("Missing academic context");
      return;
    }
    const recordDate = targetDate ? format(targetDate, "yyyy-MM-dd") : selectedDate;

    // Same calendar day as the daily register uses learnerId key so stats/header stay consistent.
    const storageKey = recordDate !== selectedDate ? `${learnerId}:${recordDate}` : learnerId;
    setAttendanceData(prev => ({
      ...prev,
      [storageKey]: {
        id: prev[storageKey]?.id || crypto.randomUUID(),
        learner_id: learnerId,
        status,
        date: recordDate,
        class_id: classId,
        term_id: termId
      }
    }));

    setHasChanges(true);
  };

  const requestDateChange = (nextDate: Date) => {
    if (!hasChanges) {
      setDate(nextDate);
      return true;
    }

    const shouldDiscard = window.confirm("You have unsaved attendance changes. Discard changes and continue?");
    if (!shouldDiscard) {
      return false;
    }

    setDate(nextDate);
    return true;
  };

  // 🔥 MARK ALL
  const handleMarkAll = (status: AttendanceStatus) => {
    if (isLocked) {
      showError("Attendance is locked for this finalized term.");
      return;
    }
    if (!safeLearners.length || !activeTerm?.id) {
      showError("Learners or term missing");
      return;
    }

    const newData: Record<string, AttendanceRecord> = {};

    safeLearners.forEach(l => {
      if (!l.id) return;

      const composite = attendanceData[`${l.id}:${selectedDate}`];
      const direct = attendanceData[l.id];
      const existing =
        composite?.date === selectedDate && composite.learner_id === l.id
          ? composite
          : direct?.date === selectedDate && direct.learner_id === l.id
            ? direct
            : undefined;

      newData[l.id] = {
        id: existing?.id || crypto.randomUUID(),
        learner_id: l.id,
        status,
        date: selectedDate,
        class_id: classId,
        term_id: termId
      };
    });

    setAttendanceData(newData);
    setHasChanges(true);
  };

  // 🔥 SAVE (SUPABASE UPSERT)
  const saveAttendance = async () => {
    if (isLocked) {
      showError("Attendance is locked for this finalized term.");
      return;
    }
    if (!termId) {
      showError("No active term");
      return;
    }

    try {
      await saveState.run(async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if (!user) throw new Error("Session expired");

        const records = Object.values(attendanceData).map(r => ({
          ...r,
          user_id: user.id
        }));

        if (records.length === 0) return;

        const { error } = await supabase
          .from("attendance")
          .upsert(records);

        if (error) throw error;
      }, { status: "saving" });
      showSuccess("Saved ✓");
      setHasChanges(false);
    } catch (e) {
      console.error("Save error:", e);
      showError("Failed - Retry");
    }
  };

  // 🔥 EXPORT
  const handleExportReport = async (type: "csv" | "pdf") => {
    if (!activeTerm?.id) return;

    try {
      await exportState.run(async () => {
        const start = startOfMonth(date);
        const end = endOfMonth(date);
        const days = eachDayOfInterval({ start, end });
        const dates = days.map(d => format(d, "yyyy-MM-dd"));

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) throw new Error("Session expired");

        const { data, error } = await supabase
          .from("attendance")
          .select("*")
          .eq("class_id", classId)
          .eq("term_id", termId)
          .eq("user_id", user.id)
          .gte("date", dates[0])
          .lte("date", dates[dates.length - 1]);

        if (error) throw error;

        const recordMap: Record<string, Record<string, string>> = {};

        (data || []).forEach((r: any) => {
          if (!recordMap[r.learner_id]) recordMap[r.learner_id] = {};
          recordMap[r.learner_id][r.date] = r.status;
        });

        const rangeStart = dates[0];
        const rangeEnd = dates[dates.length - 1];
        Object.values(attendanceData).forEach((r) => {
          if (!r.learner_id || !r.date) return;
          if (r.date < rangeStart || r.date > rangeEnd) return;
          if (!recordMap[r.learner_id]) recordMap[r.learner_id] = {};
          recordMap[r.learner_id][r.date] = r.status;
        });

        if (type === "csv") {
          let csv = "Learner Name," + days.map(d => format(d, "dd/MM")).join(",") + ",P,A,L,E,Attendance Rate\n";

          safeLearners.forEach(l => {
            if (!l.id) return;

            let row = `"${l.name}"`;
            let present = 0;
            let absent = 0;
            let late = 0;
            let excused = 0;

            dates.forEach(d => {
              const status = recordMap[l.id]?.[d] || "-";
              if (status === "present") present += 1;
              if (status === "absent") absent += 1;
              if (status === "late") late += 1;
              if (status === "excused") excused += 1;
              row += "," + status;
            });

            const denominator = Math.max(1, present + absent + late);
            const attendanceRate = Math.round(((present + late) / denominator) * 100);
            row += `,${present},${absent},${late},${excused},${attendanceRate}%`;
            csv += row + "\n";
          });

          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = "attendance.csv";
          a.click();

          URL.revokeObjectURL(url);
        } else {
          const profile: SchoolProfile = {
            name: schoolName,
            teacher: teacherName,
            logo: schoolLogo,
            email: contactEmail,
            phone: contactPhone
          };

          generateAttendancePDF(safeLearners, recordMap, dates, format(date, "MMMM yyyy"), profile);
        }
      }, { status: "loading", userInitiated: false });
      showSuccess("Export ready.");
    } catch (e) {
      console.error("Export error:", e);
      showError("Failed - Retry");
    }
  };

  /** Rows keyed by learner id for the currently selected calendar day (merges composite monthly keys). */
  const dailyAttendanceByLearnerId = useMemo(() => {
    const m: Record<string, AttendanceRecord> = {};
    safeLearners.forEach((l) => {
      if (!l.id) return;
      const compositeKey = `${l.id}:${selectedDate}`;
      const fromComposite = attendanceData[compositeKey];
      if (fromComposite?.date === selectedDate && fromComposite.learner_id === l.id) {
        m[l.id] = fromComposite;
        return;
      }
      const direct = attendanceData[l.id];
      if (direct?.date === selectedDate && direct.learner_id === l.id) {
        m[l.id] = direct;
      }
    });
    return m;
  }, [safeLearners, attendanceData, selectedDate]);

  // 📊 STATS
  const stats = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };

    safeLearners.forEach(l => {
      if (!l.id) {
        counts.unmarked++;
        return;
      }
      const rec = dailyAttendanceByLearnerId[l.id];
      if (rec) {
        counts[rec.status]++;
      } else {
        counts.unmarked++;
      }
    });

    return counts;
  }, [safeLearners, dailyAttendanceByLearnerId]);

  return {
    date,
    setDate,
    requestDateChange,
    attendanceData,
    dailyAttendanceByLearnerId,
    safeLearners,
    loading: isFetchingAttendance,
    saving: saveState.status === "saving",
    hasChanges,
    isExporting: exportState.status === "loading",
    loadState,
    saveState,
    exportState,
    stats,
    handleStatusChange,
    handleMarkAll,
    saveAttendance,
    handleExportReport
  };
};