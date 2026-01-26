import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Learner, AttendanceRecord, AttendanceStatus } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const useAttendance = (classId: string, learners: Learner[]) => {
  const [date, setDate] = useState<Date>(new Date());
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId)
        .eq('date', formattedDate);

      if (error) {
        console.error('Error fetching attendance:', error);
        showError('Failed to load attendance.');
      } else {
        const map: Record<string, AttendanceRecord> = {};
        data?.forEach((record: any) => {
          map[record.learner_id] = record as AttendanceRecord;
        });
        setAttendanceData(map);
        setHasChanges(false);
      }
      setLoading(false);
    };

    fetchAttendance();
  }, [classId, date]);

  const handleStatusChange = (learnerId: string, status: AttendanceStatus) => {
    if (!learnerId) {
      showError("Cannot mark attendance: Learner ID missing. Please refresh or save class first.");
      return;
    }

    setAttendanceData(prev => ({
      ...prev,
      [learnerId]: { ...prev[learnerId], learner_id: learnerId, status }
    }));
    setHasChanges(true);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const newData = { ...attendanceData };
    learners.forEach(l => {
      if (l.id) {
        newData[l.id] = { ...newData[l.id], learner_id: l.id, status };
      }
    });
    setAttendanceData(newData);
    setHasChanges(true);
  };

  const saveAttendance = async () => {
    setSaving(true);
    const formattedDate = format(date, 'yyyy-MM-dd');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        showError("Authentication error.");
        setSaving(false);
        return;
    }

    const upsertData = Object.values(attendanceData).map(record => ({
      class_id: classId,
      learner_id: record.learner_id,
      date: formattedDate,
      status: record.status,
      user_id: user.id
    }));

    if (upsertData.length === 0) {
        setSaving(false);
        return;
    }

    const { error } = await supabase
      .from('attendance')
      .upsert(upsertData, { onConflict: 'learner_id,date' });

    if (error) {
      console.error('Error saving attendance:', error);
      showError('Failed to save attendance.');
    } else {
      showSuccess('Attendance saved successfully.');
      setHasChanges(false);
    }
    setSaving(false);
  };

  const handleExportReport = async (type: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const formattedStart = format(start, 'yyyy-MM-dd');
      const formattedEnd = format(end, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId)
        .gte('date', formattedStart)
        .lte('date', formattedEnd)
        .order('date', { ascending: true });

      if (error) throw error;

      const recordMap: Record<string, Record<string, string>> = {}; 
      const datesSet = new Set<string>();

      data?.forEach((record: any) => {
        if (!recordMap[record.learner_id]) recordMap[record.learner_id] = {};
        recordMap[record.learner_id][record.date] = record.status;
        datesSet.add(record.date);
      });

      const sortedDates = Array.from(datesSet).sort();
      
      if (sortedDates.length === 0) {
        showError("No attendance records found for this month.");
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