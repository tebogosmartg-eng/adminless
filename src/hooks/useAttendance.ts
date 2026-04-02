import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Learner, AttendanceRecord, AttendanceStatus } from '@/lib/types';
import { db } from '@/db';
import { useLiveQuery } from '@/lib/dexie-react-hooks';
import { queueAction } from '@/services/sync';
import { useAcademic } from '@/context/AcademicContext';
import { useSettings } from '@/context/SettingsContext';
import { generateAttendancePDF, SchoolProfile } from '@/utils/pdfGenerator';

export const useAttendance = (classId: string, learners: Learner[]) => {
  const { activeTerm } = useAcademic();
  const { schoolName, teacherName, schoolLogo, contactEmail, contactPhone } = useSettings();
  const [date, setDate] = useState<Date>(new Date());
  
  const formattedDate = format(date, 'yyyy-MM-dd');

  // Step 2: Split loading into isolated dependencies
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingLearners, setLoadingLearners] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  // Step 5: Add Console Debugging
  useEffect(() => {
    console.log("Loading session...");
    if (activeTerm !== undefined) {
      setLoadingSession(false);
    }
  }, [activeTerm]);

  const [safeLearners, setSafeLearners] = useState<Learner[]>([]);
  
  useEffect(() => {
    console.log("Loading learners...");
    if (learners) {
      setSafeLearners(learners);
      setLoadingLearners(false);
    } else {
      // Step 4: Safe Fallback
      setSafeLearners([]);
    }
  }, [learners]);

  const liveAttendance = useLiveQuery(
    () => {
        console.log("Loading class...");
        return (classId && activeTerm?.id)
            ? db.attendance
                .where('class_id')
                .equals(classId)
                .filter((r: any) => r.date === formattedDate && r.term_id === activeTerm.id)
                .toArray()
            : [];
    },
    [classId, formattedDate, activeTerm?.id]
  );

  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    console.log("Loading attendance...");
    if (liveAttendance !== undefined) {
        const map: Record<string, AttendanceRecord> = {};
        (liveAttendance || []).forEach((r: any) => {
            map[r.learner_id] = r;
        });
        setAttendanceData(map);
        setHasChanges(false);
        setLoadingAttendance(false);
    } else {
        // Step 4: Safe Fallback
        setAttendanceData({});
    }
  }, [liveAttendance]);

  // Step 3: Add Timeout Safety
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn("Attendance Register loading timeout reached. Forcing UI render.");
      setLoadingSession(false);
      setLoadingLearners(false);
      setLoadingAttendance(false);
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  const handleStatusChange = (learnerId: string, status: AttendanceStatus) => {
    if (!learnerId || !activeTerm?.id) {
      showError("Action blocked: Active term context required.");
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

  const handleMarkAll = (status: AttendanceStatus) => {
    if (!activeTerm?.id) {
        showError("Action blocked: Active term context required.");
        return;
    }
    const newData = { ...attendanceData };
    safeLearners.forEach(l => {
      if (l.id) {
        newData[l.id] = { 
            id: attendanceData[l.id]?.id || crypto.randomUUID(),
            learner_id: l.id, 
            status, 
            date: formattedDate, 
            class_id: classId,
            term_id: activeTerm.id
        };
      }
    });
    setAttendanceData(newData);
    setHasChanges(true);
  };

  const saveAttendance = async () => {
    if (!activeTerm?.id) {
        showError("Save blocked: Academic context required.");
        return;
    }
    setSaving(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication session expired.");

        const recordsToSave = Object.values(attendanceData).map(r => ({
            ...r,
            term_id: activeTerm.id,
            user_id: user.id
        }));

        if (recordsToSave.length === 0) return;
        
        await db.attendance.bulkPut(recordsToSave);
        await queueAction('attendance', 'upsert', recordsToSave);

        setHasChanges(false);
        showSuccess('Attendance saved successfully.');
    } catch (e: any) {
        showError('Save failed: ' + e.message);
    } finally {
        setSaving(false);
    }
  };

  const handleExportReport = async (type: 'csv' | 'pdf') => {
    if (!activeTerm?.id) return;
    setIsExporting(true);
    try {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const allDays = eachDayOfInterval({ start, end });
      const sortedDates = allDays.map(d => format(d, 'yyyy-MM-dd'));
      const monthName = format(date, 'MMMM yyyy');

      const data = await db.attendance
        .where('class_id').equals(classId)
        .filter((r: any) => r.term_id === activeTerm.id && r.date! >= sortedDates[0] && r.date! <= sortedDates[sortedDates.length - 1])
        .toArray();

      const recordMap: Record<string, Record<string, string>> = {}; 
      data.forEach((record: any) => {
        if (!recordMap[record.learner_id]) recordMap[record.learner_id] = {};
        recordMap[record.learner_id][record.date!] = record.status;
      });

      if (type === 'csv') {
        let csv = 'Learner Name,' + allDays.map(d => format(d, 'dd/MM')).join(',') + ',Present,Absent,Late\n';
        
        safeLearners.forEach(l => {
          if (!l.id) return;
          const records = recordMap[l.id] || {};
          let row = `"${l.name}"`;
          let present = 0, absent = 0, late = 0;

          sortedDates.forEach(d => {
             const status = records[d] || '-';
             row += `,${status}`;
             if (status === 'present') present++;
             if (status === 'absent') absent++;
             if (status === 'late') late++;
          });
          
          row += `,${present},${absent},${late}\n`;
          csv += row;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Attendance_${format(date, 'MMM_yyyy')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
      } else {
        const profile: SchoolProfile = {
            name: schoolName,
            teacher: teacherName,
            logo: schoolLogo,
            email: contactEmail,
            phone: contactPhone
        };

        generateAttendancePDF(safeLearners, recordMap, sortedDates, monthName, profile);
      }

      showSuccess("Attendance report generated.");
    } catch (e) {
      console.error("[Diagnostic: Export] Report failed:", e);
      showError("Export failed. Check console for details.");
    } finally {
      setIsExporting(false);
    }
  };

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

  // Combined non-blocking check
  const isLoading = loadingAttendance || loadingSession || loadingLearners;

  return {
    date, setDate,
    attendanceData,
    safeLearners,
    loading: isLoading, 
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