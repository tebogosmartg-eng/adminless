import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Learner, AttendanceRecord, AttendanceStatus } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { queueAction } from '@/services/sync';

export const useAttendance = (classId: string, learners: Learner[]) => {
  const [date, setDate] = useState<Date>(new Date());
  // We use this local state to hold unsaved edits before they are committed to Dexie if desired,
  // OR we can write directly to Dexie. Direct to Dexie is smoother for offline.
  // However, the original UI had "Save Changes" button. Let's keep that pattern for batching updates?
  // Actually, Dexie is fast. Writing immediately on click is better UX for offline apps usually (auto-save).
  // But to minimize sync traffic, let's keep the "staging" state and save on button click.
  
  const formattedDate = format(date, 'yyyy-MM-dd');

  // Live Query from Local DB
  const liveAttendance = useLiveQuery(
    () => db.attendance.where('class_id').equals(classId).filter(r => r.date === formattedDate).toArray(),
    [classId, formattedDate]
  );

  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Sync local state when DB updates (e.g. initial load or sync pull)
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
    if (!learnerId) {
      showError("Cannot mark attendance: Learner ID missing.");
      return;
    }

    setAttendanceData(prev => ({
      ...prev,
      [learnerId]: { ...prev[learnerId], learner_id: learnerId, status, date: formattedDate, class_id: classId }
    }));
    setHasChanges(true);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const newData = { ...attendanceData };
    learners.forEach(l => {
      if (l.id) {
        newData[l.id] = { ...newData[l.id], learner_id: l.id, status, date: formattedDate, class_id: classId };
      }
    });
    setAttendanceData(newData);
    setHasChanges(true);
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user");

        const recordsToSave = Object.values(attendanceData).map(r => ({
            ...r,
            user_id: user.id
        }));

        if (recordsToSave.length === 0) return;

        // 1. Save to Local DB
        await db.attendance.bulkPut(recordsToSave);

        // 2. Queue for Sync (Upsert based on learner_id + date constraint in Supabase)
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
    setIsExporting(true);
    try {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const sStr = format(start, 'yyyy-MM-dd');
      const eStr = format(end, 'yyyy-MM-dd');

      // Query Local DB instead of Supabase for export
      // Range query on date is tricky if date is part of compound key or just string.
      // Dexie filtering:
      const data = await db.attendance
        .where('class_id').equals(classId)
        .filter(r => r.date! >= sStr && r.date! <= eStr)
        .toArray();

      // Sort by date
      data.sort((a, b) => a.date!.localeCompare(b.date!));

      const recordMap: Record<string, Record<string, string>> = {}; 
      const datesSet = new Set<string>();

      data.forEach((record) => {
        if (!recordMap[record.learner_id]) recordMap[record.learner_id] = {};
        recordMap[record.learner_id][record.date!] = record.status;
        datesSet.add(record.date!);
      });

      const sortedDates = Array.from(datesSet).sort();
      
      if (sortedDates.length === 0) {
        showError("No attendance records found locally for this month.");
        setIsExporting(false);
        return;
      }

      if (type === 'csv') {
        let csv = 'Learner Name,' + sortedDates.join(',') + ',Present,Absent,Late\n';
        
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
        const doc = new jsPDF('l', 'mm', 'a4'); 
        doc.setFontSize(16);
        doc.text(`Attendance Register: ${format(date, 'MMMM yyyy')}`, 14, 15);
        
        const head = [['Name', ...sortedDates.map(d => format(new Date(d), 'dd')), 'P', 'A', 'L']];
        const body = learners.map(l => {
           if (!l.id) return [];
           const records = recordMap[l.id] || {};
           let present = 0, absent = 0, late = 0;
           
           const statuses = sortedDates.map(d => {
              const s = records[d];
              if (s === 'present') { present++; return 'P'; }
              if (s === 'absent') { absent++; return 'A'; }
              if (s === 'late') { late++; return 'L'; }
              if (s === 'excused') return 'E';
              return '-';
           });
           
           return [l.name, ...statuses, present, absent, late];
        }).filter(row => row.length > 0);

        autoTable(doc, {
          startY: 25,
          head: head,
          body: body,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 1 },
          headStyles: { fillColor: [41, 37, 36], textColor: 255 },
          columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' } }
        });
        
        doc.save(`Attendance_${format(date, 'MMM_yyyy')}.pdf`);
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