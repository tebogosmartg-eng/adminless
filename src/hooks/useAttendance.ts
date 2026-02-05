import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Learner, AttendanceRecord, AttendanceStatus } from '@/lib/types';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { queueAction } from '@/services/sync';
import { useAcademic } from '@/context/AcademicContext';
import { useSettings } from '@/context/SettingsContext';
import { generateAttendancePDF, SchoolProfile } from '@/utils/pdfGenerator';

export const useAttendance = (classId: string, learners: Learner[]) => {
  const { activeTerm } = useAcademic();
  const { schoolName, teacherName, schoolLogo, contactEmail, contactPhone } = useSettings();
  const [date, setDate] = useState<Date>(new Date());
  
  const formattedDate = format(date, 'yyyy-MM-dd');

  const liveAttendance = useLiveQuery(
    () => db.attendance
        .where('class_id')
        .equals(classId)
        .filter(r => r.date === formattedDate && r.term_id === activeTerm?.id)
        .toArray(),
    [classId, formattedDate, activeTerm?.id]
  );

  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (liveAttendance) {
        const map: Record<string, AttendanceRecord> = {};
        liveAttendance.forEach(r => {
            map[r.learner_id] = r;
        });
        setAttendanceData(map);
        setHasChanges(false);
    }
  }, [liveAttendance]);

  const handleStatusChange = (learnerId: string, status: AttendanceStatus) => {
    if (!learnerId || !activeTerm) {
      showError("Context missing: Learner or Term ID not found.");
      return;
    }

    setAttendanceData(prev => ({
      ...prev,
      [learnerId]: { 
          ...prev[learnerId], 
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
    if (!activeTerm) return;
    const newData = { ...attendanceData };
    learners.forEach(l => {
      if (l.id) {
        newData[l.id] = { 
            ...newData[l.id], 
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
    if (!activeTerm) return;
    setSaving(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user");

        const recordsToSave = Object.values(attendanceData).map(r => ({
            ...r,
            user_id: user.id
        }));

        if (recordsToSave.length === 0) return;

        await db.attendance.bulkPut(recordsToSave);
        await queueAction('attendance', 'upsert', recordsToSave);

        setHasChanges(false);
        showSuccess('Attendance saved.');
    } catch (e) {
        console.error(e);
        showError('Failed to save.');
    } finally {
        setSaving(false);
    }
  };

  const handleExportReport = async (type: 'csv' | 'pdf') => {
    if (!activeTerm) return;
    setIsExporting(true);
    try {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const allDays = eachDayOfInterval({ start, end });
      const sortedDates = allDays.map(d => format(d, 'yyyy-MM-dd'));
      const monthName = format(date, 'MMMM yyyy');

      const data = await db.attendance
        .where('class_id').equals(classId)
        .filter(r => r.term_id === activeTerm.id && r.date! >= sortedDates[0] && r.date! <= sortedDates[sortedDates.length - 1])
        .toArray();

      const recordMap: Record<string, Record<string, string>> = {}; 
      data.forEach((record) => {
        if (!recordMap[record.learner_id]) recordMap[record.learner_id] = {};
        recordMap[record.learner_id][record.date!] = record.status;
      });

      if (type === 'csv') {
        let csv = 'Learner Name,' + allDays.map(d => format(d, 'dd/MM')).join(',') + ',Present,Absent,Late\n';
        
        learners.forEach(l => {
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

        generateAttendancePDF(learners, recordMap, sortedDates, monthName, profile);
      }

      showSuccess("Attendance report exported.");
    } catch (e) {
      console.error(e);
      showError("Failed to export attendance.");
    } finally {
      setIsExporting(false);
    }
  };

  const stats = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
    learners.forEach(l => {
      if (l.id && attendanceData[l.id]) {
        counts[attendanceData[l.id].status]++;
      } else {
        counts.unmarked++;
      }
    });
    return counts;
  }, [learners, attendanceData]);

  return {
    date, setDate,
    attendanceData,
    loading: !liveAttendance, 
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