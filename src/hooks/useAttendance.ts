"use client";

import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import { showSuccess, showError } from "@/utils/toast";
import { Learner, AttendanceRecord, AttendanceStatus } from "@/lib/types";
import { useAcademic } from "@/context/AcademicContext";
import { useSettings } from "@/context/SettingsContext";
import { generateAttendancePDF, SchoolProfile } from "@/utils/pdfGenerator";

export const useAttendance = (classId: string, learners: Learner[]) => {
  const { activeTerm } = useAcademic();
  const { schoolName, teacherName, schoolLogo, contactEmail, contactPhone } = useSettings();

  const [date, setDate] = useState<Date>(new Date());
  const formattedDate = format(date, "yyyy-MM-dd");

  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  const [safeLearners, setSafeLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ✅ SAFE learners
  useEffect(() => {
    setSafeLearners(learners || []);
  }, [learners]);

  // 🔥 FETCH attendance (SUPABASE ONLY)
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!classId || !activeTerm?.id) return;

      setLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user) {
        console.error("❌ No session");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("class_id", classId)
        .eq("term_id", activeTerm.id)
        .eq("date", formattedDate)
        .eq("user_id", user.id);

      if (error) {
        console.error("❌ Attendance fetch error:", error);
      } else {
        console.log("✅ ATTENDANCE:", data);

        const map: Record<string, AttendanceRecord> = {};
        (data || []).forEach((r: any) => {
          map[r.learner_id] = r;
        });

        setAttendanceData(map);
        setHasChanges(false);
      }

      setLoading(false);
    };

    fetchAttendance();
  }, [classId, formattedDate, activeTerm?.id]);

  // 🔥 UPDATE SINGLE
  const handleStatusChange = (learnerId: string, status: AttendanceStatus) => {
    if (!learnerId || !activeTerm?.id) {
      showError("Missing academic context");
      return;
    }

    setAttendanceData(prev => ({
      ...prev,
      [learnerId]: {
        id: prev[learnerId]?.id || crypto.randomUUID(),
        learner_id: learnerId,
        status,
        date: formattedDate,
        class_id: classId,
        term_id: activeTerm.id
      }
    }));

    setHasChanges(true);
  };

  // 🔥 MARK ALL
  const handleMarkAll = (status: AttendanceStatus) => {
    if (!safeLearners.length || !activeTerm?.id) {
      showError("Learners or term missing");
      return;
    }

    const newData: Record<string, AttendanceRecord> = {};

    safeLearners.forEach(l => {
      if (!l.id) return;

      newData[l.id] = {
        id: attendanceData[l.id]?.id || crypto.randomUUID(),
        learner_id: l.id,
        status,
        date: formattedDate,
        class_id: classId,
        term_id: activeTerm.id
      };
    });

    setAttendanceData(newData);
    setHasChanges(true);
  };

  // 🔥 SAVE (SUPABASE UPSERT)
  const saveAttendance = async () => {
    if (!activeTerm?.id) {
      showError("No active term");
      return;
    }

    setSaving(true);

    try {
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

      showSuccess("Attendance saved");
      setHasChanges(false);

    } catch (e: any) {
      console.error("❌ Save error:", e);
      showError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // 🔥 EXPORT
  const handleExportReport = async (type: "csv" | "pdf") => {
    if (!activeTerm?.id) return;

    setIsExporting(true);

    try {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const days = eachDayOfInterval({ start, end });
      const dates = days.map(d => format(d, "yyyy-MM-dd"));

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("class_id", classId)
        .eq("term_id", activeTerm.id)
        .gte("date", dates[0])
        .lte("date", dates[dates.length - 1]);

      if (error) throw error;

      const recordMap: Record<string, Record<string, string>> = {};

      (data || []).forEach((r: any) => {
        if (!recordMap[r.learner_id]) recordMap[r.learner_id] = {};
        recordMap[r.learner_id][r.date] = r.status;
      });

      if (type === "csv") {
        let csv = "Learner Name," + days.map(d => format(d, "dd/MM")).join(",") + "\n";

        safeLearners.forEach(l => {
          if (!l.id) return;

          let row = `"${l.name}"`;

          dates.forEach(d => {
            row += "," + (recordMap[l.id]?.[d] || "-");
          });

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

      showSuccess("Export done");

    } catch (e) {
      console.error("❌ Export error:", e);
      showError("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  // 📊 STATS
  const stats = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };

    safeLearners.forEach(l => {
      if (l.id && attendanceData[l.id]) {
        counts[attendanceData[l.id].status]++;
      } else {
        counts.unmarked++;
      }
    });

    return counts;
  }, [safeLearners, attendanceData]);

  return {
    date,
    setDate,
    attendanceData,
    safeLearners,
    loading,
    saving,
    hasChanges,
    isExporting,
    stats,
    handleStatusChange,
    handleMarkAll,
    saveAttendance,
    handleExportReport
  };
};